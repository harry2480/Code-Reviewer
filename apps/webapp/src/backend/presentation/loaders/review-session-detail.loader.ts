import { getReviewSessionDetailUseCase } from '../composition/review-frontend.composition';
import type { ReviewSessionStatus, SupportedLanguage } from '../types/review-frontend.types';

export type ReviewSessionDetailComment = {
	id: string;
	filePath: string;
	lineNumber: number;
	perspective: string;
	severity: string;
	body: string;
	suggestedCode: string | null;
	createdAt: string;
};

export type ReviewSessionDetailLoaderResult = {
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
	totalTokens: number;
	durationMs: number;
	analysisChain: string | null;
	createdAt: string;
	comments: ReviewSessionDetailComment[];
};

export async function reviewSessionDetailLoader(
	id: string,
): Promise<ReviewSessionDetailLoaderResult | null> {
	const result = await getReviewSessionDetailUseCase.execute(id);
	if (!result.success) return null;

	const { session, comments } = result.value;

	return {
		id: session.id,
		owner: session.owner,
		repo: session.repo,
		prNumber: session.prNumber,
		prTitle: session.prTitle,
		prUrl: session.prUrl,
		status: session.status,
		detectedLanguages: session.detectedLanguages,
		scores: {
			logic: session.logicScore,
			security: session.securityScore,
			efficiency: session.efficiencyScore,
			readability: session.readabilityScore,
		},
		totalTokens: session.totalTokens,
		durationMs: session.durationMs,
		analysisChain: session.analysisChain,
		createdAt: session.createdAt.toISOString(),
		comments: comments.map((c) => ({
			id: c.id,
			filePath: c.filePath,
			lineNumber: c.lineNumber,
			perspective: c.perspective,
			severity: c.severity,
			body: c.body,
			suggestedCode: c.suggestedCode,
			createdAt: c.createdAt.toISOString(),
		})),
	};
}
