import type { Result } from './result.model';

export type ReviewPerspective = 'logic' | 'security' | 'efficiency' | 'readability';
export type ReviewSeverity = 'info' | 'warning' | 'critical';

type ReviewCommentError =
	| 'FILE_PATH_EMPTY'
	| 'BODY_EMPTY'
	| 'LINE_NUMBER_INVALID'
	| 'INVALID_PERSPECTIVE'
	| 'INVALID_SEVERITY'
	| 'SESSION_ID_EMPTY';

const VALID_PERSPECTIVES: ReviewPerspective[] = ['logic', 'security', 'efficiency', 'readability'];
const VALID_SEVERITIES: ReviewSeverity[] = ['info', 'warning', 'critical'];

export class ReviewComment {
	private constructor(
		public readonly id: string,
		public readonly sessionId: string,
		public readonly filePath: string,
		public readonly lineNumber: number,
		public readonly perspective: ReviewPerspective,
		public readonly severity: ReviewSeverity,
		public readonly body: string,
		public readonly suggestedCode: string | null,
		public readonly prNumber: number,
		public readonly owner: string,
		public readonly repo: string,
		public readonly createdAt: Date,
	) {}

	static create(params: {
		id: string;
		sessionId: string;
		filePath: string;
		lineNumber: number;
		perspective: string;
		severity: string;
		body: string;
		suggestedCode?: string | null;
		prNumber: number;
		owner: string;
		repo: string;
		createdAt?: Date;
	}): Result<ReviewComment, ReviewCommentError> {
		const trimmedSessionId = params.sessionId.trim();
		if (trimmedSessionId.length === 0) {
			return { success: false, error: 'SESSION_ID_EMPTY' };
		}

		const trimmedFilePath = params.filePath.trim();
		if (trimmedFilePath.length === 0) {
			return { success: false, error: 'FILE_PATH_EMPTY' };
		}

		if (params.lineNumber < 1) {
			return { success: false, error: 'LINE_NUMBER_INVALID' };
		}

		if (!VALID_PERSPECTIVES.includes(params.perspective as ReviewPerspective)) {
			return { success: false, error: 'INVALID_PERSPECTIVE' };
		}

		if (!VALID_SEVERITIES.includes(params.severity as ReviewSeverity)) {
			return { success: false, error: 'INVALID_SEVERITY' };
		}

		const trimmedBody = params.body.trim();
		if (trimmedBody.length === 0) {
			return { success: false, error: 'BODY_EMPTY' };
		}

		return {
			success: true,
			value: new ReviewComment(
				params.id,
				trimmedSessionId,
				trimmedFilePath,
				params.lineNumber,
				params.perspective as ReviewPerspective,
				params.severity as ReviewSeverity,
				trimmedBody,
				params.suggestedCode ?? null,
				params.prNumber,
				params.owner,
				params.repo,
				params.createdAt ?? new Date(),
			),
		};
	}

	static reconstruct(params: {
		id: string;
		sessionId: string;
		filePath: string;
		lineNumber: number;
		perspective: string;
		severity: string;
		body: string;
		suggestedCode: string | null;
		prNumber: number;
		owner: string;
		repo: string;
		createdAt: Date;
	}): ReviewComment {
		return new ReviewComment(
			params.id,
			params.sessionId,
			params.filePath,
			params.lineNumber,
			params.perspective as ReviewPerspective,
			params.severity as ReviewSeverity,
			params.body,
			params.suggestedCode,
			params.prNumber,
			params.owner,
			params.repo,
			params.createdAt,
		);
	}
}
