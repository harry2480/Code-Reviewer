import type { ReviewComment } from '../models/review-comment.model';

export interface GitHubApiGateway {
	getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string>;
	getCommitMessages(owner: string, repo: string, prNumber: number): Promise<string[]>;
	postReviewComment(
		owner: string,
		repo: string,
		prNumber: number,
		comment: ReviewComment,
	): Promise<void>;
}
