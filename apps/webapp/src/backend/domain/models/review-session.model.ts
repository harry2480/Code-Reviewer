import type { SupportedLanguage } from './language-expert.model';
import type { Result } from './result.model';

export type ReviewSessionStatus = 'success' | 'failed' | 'skipped';

type ReviewSessionError =
	| 'OWNER_EMPTY'
	| 'REPO_EMPTY'
	| 'PR_NUMBER_INVALID'
	| 'PR_TITLE_EMPTY'
	| 'PR_URL_EMPTY'
	| 'INVALID_STATUS'
	| 'INVALID_LANGUAGE'
	| 'DUPLICATE_LANGUAGE'
	| 'SCORE_OUT_OF_RANGE'
	| 'TOTAL_TOKENS_NEGATIVE'
	| 'DURATION_NEGATIVE';

const VALID_STATUSES: ReviewSessionStatus[] = ['success', 'failed', 'skipped'];
const VALID_LANGUAGES: SupportedLanguage[] = ['typescript', 'python', 'swift', 'php', 'go', 'rust'];

function isValidScore(value: number | null | undefined): boolean {
	if (value === null || value === undefined) return true;
	return Number.isInteger(value) && value >= 0 && value <= 10;
}

export class ReviewSession {
	private constructor(
		public readonly id: string,
		public readonly owner: string,
		public readonly repo: string,
		public readonly prNumber: number,
		public readonly prTitle: string,
		public readonly prUrl: string,
		public readonly status: ReviewSessionStatus,
		public readonly detectedLanguages: SupportedLanguage[],
		public readonly logicScore: number | null,
		public readonly securityScore: number | null,
		public readonly efficiencyScore: number | null,
		public readonly readabilityScore: number | null,
		public readonly totalTokens: number,
		public readonly analysisChain: string | null,
		public readonly durationMs: number,
		public readonly createdAt: Date,
	) {}

	static create(params: {
		id: string;
		owner: string;
		repo: string;
		prNumber: number;
		prTitle: string;
		prUrl: string;
		status: string;
		detectedLanguages: string[];
		logicScore?: number | null;
		securityScore?: number | null;
		efficiencyScore?: number | null;
		readabilityScore?: number | null;
		totalTokens?: number;
		analysisChain?: string | null;
		durationMs?: number;
		createdAt?: Date;
	}): Result<ReviewSession, ReviewSessionError> {
		const owner = params.owner.trim();
		if (owner.length === 0) return { success: false, error: 'OWNER_EMPTY' };

		const repo = params.repo.trim();
		if (repo.length === 0) return { success: false, error: 'REPO_EMPTY' };

		if (!Number.isInteger(params.prNumber) || params.prNumber < 1) {
			return { success: false, error: 'PR_NUMBER_INVALID' };
		}

		const prTitle = params.prTitle.trim();
		if (prTitle.length === 0) return { success: false, error: 'PR_TITLE_EMPTY' };

		const prUrl = params.prUrl.trim();
		if (prUrl.length === 0) return { success: false, error: 'PR_URL_EMPTY' };

		if (!VALID_STATUSES.includes(params.status as ReviewSessionStatus)) {
			return { success: false, error: 'INVALID_STATUS' };
		}

		const seen = new Set<string>();
		for (const lang of params.detectedLanguages) {
			if (!VALID_LANGUAGES.includes(lang as SupportedLanguage)) {
				return { success: false, error: 'INVALID_LANGUAGE' };
			}
			if (seen.has(lang)) {
				return { success: false, error: 'DUPLICATE_LANGUAGE' };
			}
			seen.add(lang);
		}

		if (
			!isValidScore(params.logicScore) ||
			!isValidScore(params.securityScore) ||
			!isValidScore(params.efficiencyScore) ||
			!isValidScore(params.readabilityScore)
		) {
			return { success: false, error: 'SCORE_OUT_OF_RANGE' };
		}

		const totalTokens = params.totalTokens ?? 0;
		if (totalTokens < 0) return { success: false, error: 'TOTAL_TOKENS_NEGATIVE' };

		const durationMs = params.durationMs ?? 0;
		if (durationMs < 0) return { success: false, error: 'DURATION_NEGATIVE' };

		return {
			success: true,
			value: new ReviewSession(
				params.id,
				owner,
				repo,
				params.prNumber,
				prTitle,
				prUrl,
				params.status as ReviewSessionStatus,
				params.detectedLanguages as SupportedLanguage[],
				params.logicScore ?? null,
				params.securityScore ?? null,
				params.efficiencyScore ?? null,
				params.readabilityScore ?? null,
				totalTokens,
				params.analysisChain ?? null,
				durationMs,
				params.createdAt ?? new Date(),
			),
		};
	}

	static reconstruct(params: {
		id: string;
		owner: string;
		repo: string;
		prNumber: number;
		prTitle: string;
		prUrl: string;
		status: string;
		detectedLanguages: string[];
		logicScore: number | null;
		securityScore: number | null;
		efficiencyScore: number | null;
		readabilityScore: number | null;
		totalTokens: number;
		analysisChain: string | null;
		durationMs: number;
		createdAt: Date;
	}): ReviewSession {
		return new ReviewSession(
			params.id,
			params.owner,
			params.repo,
			params.prNumber,
			params.prTitle,
			params.prUrl,
			params.status as ReviewSessionStatus,
			params.detectedLanguages as SupportedLanguage[],
			params.logicScore,
			params.securityScore,
			params.efficiencyScore,
			params.readabilityScore,
			params.totalTokens,
			params.analysisChain,
			params.durationMs,
			params.createdAt,
		);
	}
}
