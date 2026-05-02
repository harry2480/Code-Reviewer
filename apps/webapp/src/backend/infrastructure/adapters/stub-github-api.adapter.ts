import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import type { ReviewComment } from '../../domain/models/review-comment.model';

export class StubGitHubApiAdapter implements GitHubApiGateway {
	async getPullRequestDiff(_owner: string, _repo: string, _prNumber: number): Promise<string> {
		return [
			'diff --git a/src/example.ts b/src/example.ts',
			'index 0000000..1111111 100644',
			'--- a/src/example.ts',
			'+++ b/src/example.ts',
			'@@ -1,3 +1,5 @@',
			' export function add(a: number, b: number): number {',
			'+  // TODO: validate inputs',
			'   return a + b;',
			' }',
		].join('\n');
	}

	async getCommitMessages(_owner: string, _repo: string, _prNumber: number): Promise<string[]> {
		return ['feat: add stub implementation for testing', 'fix: handle edge cases'];
	}

	async postReviewComment(
		_owner: string,
		_repo: string,
		_prNumber: number,
		_comment: ReviewComment,
	): Promise<void> {
		// no-op in stub
	}
}
