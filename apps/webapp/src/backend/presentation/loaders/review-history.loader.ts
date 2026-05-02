import { listReviewSessionsUseCase } from '../composition/review-frontend.composition';
import type { ReviewSessionStatus, SupportedLanguage } from '../types/review-frontend.types';

export type ReviewHistoryRow = {
	id: string;
	owner: string;
	repo: string;
	prNumber: number;
	prTitle: string;
	prUrl: string;
	status: ReviewSessionStatus;
	detectedLanguages: SupportedLanguage[];
	scores: {
		logic: number | null;
		security: number | null;
		efficiency: number | null;
		readability: number | null;
	};
	createdAt: string;
};

export type ReviewHistoryLoaderResult = {
	rows: ReviewHistoryRow[];
	page: number;
	perPage: number;
	totalPages: number;
	total: number;
};

export type ReviewHistoryLoaderInput = {
	page?: number;
	perPage?: number;
	language?: SupportedLanguage;
	status?: ReviewSessionStatus;
};

const DEFAULT_PER_PAGE = 20;

export async function reviewHistoryLoader(
	input: ReviewHistoryLoaderInput = {},
): Promise<ReviewHistoryLoaderResult> {
	const page = input.page ?? 1;
	const perPage = input.perPage ?? DEFAULT_PER_PAGE;

	const result = await listReviewSessionsUseCase.execute({
		page,
		perPage,
		language: input.language,
		status: input.status,
	});

	const rows: ReviewHistoryRow[] = result.sessions.map((s) => ({
		id: s.id,
		owner: s.owner,
		repo: s.repo,
		prNumber: s.prNumber,
		prTitle: s.prTitle,
		prUrl: s.prUrl,
		status: s.status,
		detectedLanguages: s.detectedLanguages,
		scores: {
			logic: s.logicScore,
			security: s.securityScore,
			efficiency: s.efficiencyScore,
			readability: s.readabilityScore,
		},
		createdAt: s.createdAt.toISOString(),
	}));

	const totalPages = Math.max(1, Math.ceil(result.total / perPage));

	return { rows, page, perPage, totalPages, total: result.total };
}
