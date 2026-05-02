import {
	getDashboardStatsUseCase,
	isGitHubAppConnected,
} from '../composition/review-frontend.composition';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../types/review-frontend.types';

export type DashboardSessionSummary = {
	id: string;
	prTitle: string;
	prUrl: string;
	status: string;
	owner: string;
	repo: string;
	prNumber: number;
	createdAt: string;
};

export type DashboardLoaderResult = {
	githubAppConnected: boolean;
	todayReviewCount: number;
	todaySecurityFindings: number;
	budget: {
		dailyLimitUsd: number;
		usedUsd: number;
		remainingUsd: number;
	} | null;
	supportedLanguages: SupportedLanguage[];
	recentSessions: DashboardSessionSummary[];
};

export async function dashboardLoader(): Promise<DashboardLoaderResult> {
	const stats = await getDashboardStatsUseCase.execute({
		now: new Date(),
		githubAppConnected: isGitHubAppConnected(),
	});

	return {
		githubAppConnected: stats.connectivity.githubAppConnected,
		todayReviewCount: stats.todayReviewCount,
		todaySecurityFindings: stats.todaySecurityFindings,
		budget: stats.budget
			? {
					dailyLimitUsd: stats.budget.dailyLimitUsd,
					usedUsd: stats.budget.usedUsd,
					remainingUsd: stats.budget.remaining(),
				}
			: null,
		supportedLanguages: SUPPORTED_LANGUAGES,
		recentSessions: stats.recentSessions.map((s) => ({
			id: s.id,
			prTitle: s.prTitle,
			prUrl: s.prUrl,
			status: s.status,
			owner: s.owner,
			repo: s.repo,
			prNumber: s.prNumber,
			createdAt: s.createdAt.toISOString(),
		})),
	};
}
