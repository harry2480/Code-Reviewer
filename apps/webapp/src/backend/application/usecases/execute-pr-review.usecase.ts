import type { AiGateway } from '../../domain/gateways/ai.gateway';
import type { ContextExtractorGateway } from '../../domain/gateways/context-extractor.gateway';
import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import { Budget } from '../../domain/models/budget.model';
import type { ReviewComment, ReviewPerspective } from '../../domain/models/review-comment.model';
import type { BudgetRepository } from '../../domain/repositories/budget.repository';
import type { ReviewCommentRepository } from '../../domain/repositories/review-comment.repository';
import type { PolyglotExpertService } from '../../domain/services/polyglot-expert.service';
import type { ReviewEngineService } from '../../domain/services/review-engine.service';
import type { SelfRefinementService } from '../../domain/services/self-refinement.service';

const PERSPECTIVES: ReviewPerspective[] = ['logic', 'security', 'efficiency', 'readability'];
const DEFAULT_DAILY_LIMIT_USD = 5;

export class ExecutePrReviewUseCase {
	constructor(
		private readonly ai: AiGateway,
		private readonly github: GitHubApiGateway,
		private readonly reviewCommentRepository: ReviewCommentRepository,
		private readonly budgetRepository: BudgetRepository,
		private readonly reviewEngine: ReviewEngineService,
		private readonly polyglotExpert: PolyglotExpertService,
		private readonly contextExtractor: ContextExtractorGateway,
		private readonly selfRefinement: SelfRefinementService,
	) {}

	async execute(owner: string, repo: string, prNumber: number): Promise<void> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let budget = await this.budgetRepository.findByDate(today);
		if (!budget) {
			const result = Budget.create({
				id: crypto.randomUUID(),
				date: today,
				dailyLimitUsd: DEFAULT_DAILY_LIMIT_USD,
			});
			if (!result.success) {
				throw new Error(`Failed to create budget: ${result.error}`);
			}
			budget = result.value;
			await this.budgetRepository.save(budget);
		}

		if (budget.isExceeded()) {
			throw new Error('Daily budget exceeded');
		}

		const diff = await this.github.getPullRequestDiff(owner, repo, prNumber);
		const context = await this.contextExtractor.extractPullRequestContext({
			owner,
			repo,
			prNumber,
			diff,
		});

		const experts = this.polyglotExpert.detectLanguages(diff);
		const languageRules = this.polyglotExpert.buildLanguageRulesPrompt(experts);

		const candidateComments: ReviewComment[] = [];
		for (const perspective of PERSPECTIVES) {
			const systemPrompt = this.reviewEngine.buildSystemPrompt(perspective, languageRules);
			const userPrompt = this.reviewEngine.buildUserPrompt(
				diff,
				context.recentCommitMessages,
				context.callerReferences,
			);

			const raw = await this.ai.generate({
				systemPrompt,
				userPrompt,
				maxTokens: this.reviewEngine.MAX_TOKENS,
			});

			const parsed = this.reviewEngine.parseResponse(raw, perspective, owner, repo, prNumber);
			if (!parsed.success) {
				console.error(`Failed to parse ${perspective} response: ${parsed.error}`);
				continue;
			}

			candidateComments.push(...parsed.value);
		}

		const { acceptedComments } = await this.selfRefinement.refine({
			diff,
			candidateComments,
		});

		for (const comment of acceptedComments) {
			await this.reviewCommentRepository.save(comment);
			try {
				await this.github.postReviewComment(owner, repo, prNumber, comment);
			} catch (err) {
				console.error(`Failed to post comment: ${err}`);
			}
		}
	}
}
