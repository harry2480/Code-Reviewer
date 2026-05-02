import type { Budget } from '../../domain/models/budget.model';
import type { ReviewSession } from '../../domain/models/review-session.model';
import type { BudgetRepository } from '../../domain/repositories/budget.repository';
import type { ReviewCommentRepository } from '../../domain/repositories/review-comment.repository';
import type { ReviewSessionRepository } from '../../domain/repositories/review-session.repository';

export type DashboardStatsConnectivity = {
	githubAppConnected: boolean;
};

export type DashboardStatsResult = {
	connectivity: DashboardStatsConnectivity;
	todayReviewCount: number;
	todaySecurityFindings: number;
	budget: Budget | null;
	recentSessions: ReviewSession[];
};

const RECENT_SESSIONS_LIMIT = 5;

export class GetDashboardStatsUseCase {
	constructor(
		private readonly reviewSessionRepository: ReviewSessionRepository,
		private readonly reviewCommentRepository: ReviewCommentRepository,
		private readonly budgetRepository: BudgetRepository,
	) {}

	async execute(params: {
		now: Date;
		githubAppConnected: boolean;
	}): Promise<DashboardStatsResult> {
		const dayStart = new Date(params.now);
		dayStart.setUTCHours(0, 0, 0, 0);
		const dayEnd = new Date(dayStart);
		dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

		const [todayReviewCount, todaySecurityFindings, budget, recentSessions] = await Promise.all([
			this.reviewSessionRepository.countByDateRange(dayStart, dayEnd),
			this.reviewCommentRepository.countByPerspectiveAndDateRange('security', dayStart, dayEnd),
			this.budgetRepository.findByDate(dayStart),
			this.reviewSessionRepository.findRecent(RECENT_SESSIONS_LIMIT),
		]);

		return {
			connectivity: { githubAppConnected: params.githubAppConnected },
			todayReviewCount,
			todaySecurityFindings,
			budget,
			recentSessions,
		};
	}
}
