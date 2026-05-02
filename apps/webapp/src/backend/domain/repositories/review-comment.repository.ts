import type { ReviewComment } from '../models/review-comment.model';

export interface ReviewCommentRepository {
	save(comment: ReviewComment): Promise<void>;
	findByPr(owner: string, repo: string, prNumber: number): Promise<ReviewComment[]>;
}
