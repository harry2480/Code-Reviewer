import type { AiGateway } from '../../domain/gateways/ai.gateway';
import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import { Budget } from '../../domain/models/budget.model';
import type { ReviewPerspective } from '../../domain/models/review-comment.model';
import type { BudgetRepository } from '../../domain/repositories/budget.repository';
import type { ReviewCommentRepository } from '../../domain/repositories/review-comment.repository';
import type { ReviewEngineService } from '../../domain/services/review-engine.service';

const PERSPECTIVES: ReviewPerspective[] = ['logic', 'security', 'efficiency', 'readability'];
const DEFAULT_DAILY_LIMIT_USD = 5;

export class ExecutePrReviewUseCase {
	constructor(
		private readonly ai: AiGateway,
		private readonly github: GitHubApiGateway,
		private readonly reviewCommentRepository: ReviewCommentRepository,
		private readonly budgetRepository: BudgetRepository,
		private readonly reviewEngine: ReviewEngineService,
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

		const [diff, commitMessages] = await Promise.all([
			this.github.getPullRequestDiff(owner, repo, prNumber),
			this.github.getCommitMessages(owner, repo, prNumber),
		]);

		for (const perspective of PERSPECTIVES) {
			const systemPrompt = this.reviewEngine.buildSystemPrompt(perspective);
			const userPrompt = this.reviewEngine.buildUserPrompt(diff, commitMessages);

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
