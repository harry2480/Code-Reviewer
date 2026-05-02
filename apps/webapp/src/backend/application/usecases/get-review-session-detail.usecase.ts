import type { Result } from '../../domain/models/result.model';
import type { ReviewComment } from '../../domain/models/review-comment.model';
import type { ReviewSession } from '../../domain/models/review-session.model';
import type { ReviewCommentRepository } from '../../domain/repositories/review-comment.repository';
import type { ReviewSessionRepository } from '../../domain/repositories/review-session.repository';

export type ReviewSessionDetail = {
	session: ReviewSession;
	comments: ReviewComment[];
};

type GetReviewSessionDetailError = 'NOT_FOUND';

export class GetReviewSessionDetailUseCase {
	constructor(
		private readonly reviewSessionRepository: ReviewSessionRepository,
		private readonly reviewCommentRepository: ReviewCommentRepository,
	) {}

	async execute(id: string): Promise<Result<ReviewSessionDetail, GetReviewSessionDetailError>> {
		const session = await this.reviewSessionRepository.findById(id);
		if (!session) {
			return { success: false, error: 'NOT_FOUND' };
		}

		const comments = await this.reviewCommentRepository.findBySessionId(id);
		return { success: true, value: { session, comments } };
	}
}
