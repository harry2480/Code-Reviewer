import { Octokit } from '@octokit/rest';
import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import type { ReviewComment } from '../../domain/models/review-comment.model';

export class GitHubApiAdapter implements GitHubApiGateway {
	private readonly octokit: Octokit;

	constructor(token: string) {
		this.octokit = new Octokit({ auth: token });
	}

	async getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string> {
		const { data } = await this.octokit.pulls.get({
			owner,
			repo,
			pull_number: prNumber,
			mediaType: { format: 'diff' },
		});
		return data as unknown as string;
	}

	async getCommitMessages(owner: string, repo: string, prNumber: number): Promise<string[]> {
		const { data } = await this.octokit.pulls.listCommits({
			owner,
			repo,
			pull_number: prNumber,
		});
		return data.map((commit) => commit.commit.message);
	}

	async postReviewComment(
		owner: string,
		repo: string,
		prNumber: number,
		comment: ReviewComment,
	): Promise<void> {
		const { data: pr } = await this.octokit.pulls.get({ owner, repo, pull_number: prNumber });

		await this.octokit.pulls.createReviewComment({
			owner,
			repo,
			pull_number: prNumber,
			body: comment.suggestedCode
				? `${comment.body}\n\n\`\`\`suggestion\n${comment.suggestedCode}\n\`\`\``
				: comment.body,
			commit_id: pr.head.sha,
			path: comment.filePath,
			line: comment.lineNumber,
		});
	}
}
