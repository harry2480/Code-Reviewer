import { StubGitHubApiAdapter } from '@/backend/infrastructure/adapters/stub-github-api.adapter';
import { ReviewComment } from '@/backend/domain/models/review-comment.model';
import { describe, expect, it } from 'vitest';

function buildComment() {
	const result = ReviewComment.create({
		id: 'c1',
		sessionId: 's1',
		filePath: 'src/file.ts',
		lineNumber: 1,
		perspective: 'logic',
		severity: 'info',
		body: 'msg',
		suggestedCode: null,
		prNumber: 1,
		owner: 'org',
		repo: 'repo',
	});
	if (!result.success) throw new Error('Failed to build comment');
	return result.value;
}

describe('StubGitHubApiAdapter', () => {
	it('getPullRequestDiff: 固定の TS スニペット diff を返す', async () => {
		const adapter = new StubGitHubApiAdapter();
		const result = await adapter.getPullRequestDiff('org', 'repo', 1);
		expect(result).toContain('diff --git');
		expect(result).toContain('.ts');
	});

	it('getCommitMessages: 固定のコミットメッセージリストを返す', async () => {
		const adapter = new StubGitHubApiAdapter();
		const result = await adapter.getCommitMessages('org', 'repo', 1);
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
	});

	it('postReviewComment: 副作用なしで完了する', async () => {
		const adapter = new StubGitHubApiAdapter();
		await expect(
			adapter.postReviewComment('org', 'repo', 1, buildComment()),
		).resolves.toBeUndefined();
	});
});
