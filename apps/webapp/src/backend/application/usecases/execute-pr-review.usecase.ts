import type { AiGateway } from '../../domain/gateways/ai.gateway';
import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import { Budget } from '../../domain/models/budget.model';
import type { ReviewPerspective } from '../../domain/models/review-comment.model';
import type { BudgetRepository } from '../../domain/repositories/budget.repository';
import type { ReviewCommentRepository } from '../../domain/repositories/review-comment.repository';
import type { BudgetManagerService } from '../../domain/services/budget-manager.service';
import type { PolyglotExpertService } from '../../domain/services/polyglot-expert.service';
import type { ReviewEngineService } from '../../domain/services/review-engine.service';
import type { LogTokenConsumptionUseCase } from './log-token-consumption.usecase';

const PERSPECTIVES: ReviewPerspective[] = ['logic', 'security', 'efficiency', 'readability'];
const DEFAULT_DAILY_LIMIT_USD = 5;
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export class BudgetExceededError extends Error {
	constructor(
		public readonly usedUsd: number,
		public readonly dailyLimitUsd: number,
	) {
		super(`Daily budget exceeded: ${usedUsd.toFixed(4)} USD / ${dailyLimitUsd.toFixed(2)} USD`);
		this.name = 'BudgetExceededError';
	}
}

export class ExecutePrReviewUseCase {
	constructor(
		private readonly ai: AiGateway,
		private readonly github: GitHubApiGateway,
		private readonly reviewCommentRepository: ReviewCommentRepository,
		private readonly budgetRepository: BudgetRepository,
		private readonly reviewEngine: ReviewEngineService,
		private readonly polyglotExpert: PolyglotExpertService,
		private readonly budgetManager: BudgetManagerService,
		private readonly logTokenConsumption: LogTokenConsumptionUseCase,
		private readonly modelName: string = DEFAULT_MODEL,
	) {}

	async execute(owner: string, repo: string, prNumber: number): Promise<void> {
		const sessionId = crypto.randomUUID();
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
			throw new BudgetExceededError(budget.usedUsd, budget.dailyLimitUsd);
		}

		const [diff, commitMessages] = await Promise.all([
			this.github.getPullRequestDiff(owner, repo, prNumber),
			this.github.getCommitMessages(owner, repo, prNumber),
		]);

		const experts = this.polyglotExpert.detectLanguages(diff);
		const languageRules = this.polyglotExpert.buildLanguageRulesPrompt(experts);
		const prId = `${owner}/${repo}#${prNumber}`;

		for (const perspective of PERSPECTIVES) {
			const current = await this.budgetRepository.findByDate(today);
			if (current?.isExceeded()) {
				console.warn(
					`Budget exceeded mid-review (${current.usedUsd.toFixed(4)}/${current.dailyLimitUsd.toFixed(2)} USD). Aborting remaining perspectives.`,
				);
				throw new BudgetExceededError(current.usedUsd, current.dailyLimitUsd);
			}

			const systemPrompt = this.reviewEngine.buildSystemPrompt(perspective, languageRules);
			const userPrompt = this.reviewEngine.buildUserPrompt(diff, commitMessages);

			const generated = await this.ai.generate({
				systemPrompt,
				userPrompt,
				maxTokens: this.reviewEngine.MAX_TOKENS,
			});

			try {
				await this.logTokenConsumption.execute({
					sessionId,
					prId,
					model: this.modelName,
					perspective,
					usage: generated.usage,
				});
			} catch (err) {
				console.error(`Failed to log token consumption for ${perspective}: ${err}`);
			}

			const parsed = this.reviewEngine.parseResponse(
				generated.text,
				perspective,
				owner,
				repo,
				prNumber,
				sessionId,
			);
			if (!parsed.success) {
				console.error(`Failed to parse ${perspective} response: ${parsed.error}`);
				continue;
			}

			for (const comment of parsed.value) {
				await this.reviewCommentRepository.save(comment);
				try {
					await this.github.postReviewComment(owner, repo, prNumber, comment);
				} catch (err) {
					console.error(`Failed to post ${perspective} comment: ${err}`);
				}
			}
		}
	}
}
