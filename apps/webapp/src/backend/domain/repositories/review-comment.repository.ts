import type { ReviewComment } from '../models/review-comment.model';

export interface ReviewCommentRepository {
	save(comment: ReviewComment): Promise<void>;
	findByPr(owner: string, repo: string, prNumber: number): Promise<ReviewComment[]>;
	findBySessionId(sessionId: string): Promise<ReviewComment[]>;
	countByPerspectiveAndDateRange(perspective: string, start: Date, end: Date): Promise<number>;
}
