import { ReviewComment } from '@/backend/domain/models/review-comment.model';
import { GitHubApiAdapter } from '@/backend/infrastructure/adapters/github-api.adapter';
import { Octokit } from '@octokit/rest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@octokit/rest', () => {
	const Octokit = vi.fn();
	return { Octokit };
});

const OctokitMock = Octokit as unknown as ReturnType<typeof vi.fn>;

function buildOctokit(overrides: {
	get?: ReturnType<typeof vi.fn>;
	listCommits?: ReturnType<typeof vi.fn>;
	createReviewComment?: ReturnType<typeof vi.fn>;
}) {
	const get = overrides.get ?? vi.fn().mockResolvedValue({ data: { head: { sha: 'sha-123' } } });
	const listCommits = overrides.listCommits ?? vi.fn().mockResolvedValue({ data: [] });
	const createReviewComment = overrides.createReviewComment ?? vi.fn().mockResolvedValue({});
	OctokitMock.mockImplementation(() => ({
		pulls: { get, listCommits, createReviewComment },
	}));
	return { get, listCommits, createReviewComment };
}

function buildComment(overrides: Partial<{ suggestedCode: string | null }> = {}) {
	const result = ReviewComment.create({
		id: 'c1',
		sessionId: 's1',
		filePath: 'src/file.ts',
		lineNumber: 10,
		perspective: 'logic',
		severity: 'warning',
		body: 'Issue body',
		suggestedCode: overrides.suggestedCode ?? null,
		prNumber: 1,
		owner: 'org',
		repo: 'repo',
	});
	if (!result.success) throw new Error(`Failed to build comment: ${result.error}`);
	return result.value;
}

describe('GitHubApiAdapter', () => {
	it('getPullRequestDiff: pulls.get に diff フォーマットを指定して呼ぶ', async () => {
		const { get } = buildOctokit({
			get: vi.fn().mockResolvedValue({ data: 'raw-diff-content' }),
		});
		const adapter = new GitHubApiAdapter('token');
		const result = await adapter.getPullRequestDiff('org', 'repo', 1);

		expect(get).toHaveBeenCalledWith({
			owner: 'org',
			repo: 'repo',
			pull_number: 1,
			mediaType: { format: 'diff' },
		});
		expect(result).toBe('raw-diff-content');
	});

	it('getCommitMessages: コミット配列をメッセージのみに変換する', async () => {
		const { listCommits } = buildOctokit({
			listCommits: vi.fn().mockResolvedValue({
				data: [{ commit: { message: 'fix: a' } }, { commit: { message: 'feat: b' } }],
			}),
		});
		const adapter = new GitHubApiAdapter('token');
		const messages = await adapter.getCommitMessages('org', 'repo', 1);

		expect(listCommits).toHaveBeenCalledWith({ owner: 'org', repo: 'repo', pull_number: 1 });
		expect(messages).toEqual(['fix: a', 'feat: b']);
	});

	it('postReviewComment: suggestedCode あり → suggestion ブロックを付与', async () => {
		const { createReviewComment } = buildOctokit({});
		const adapter = new GitHubApiAdapter('token');
		await adapter.postReviewComment(
			'org',
			'repo',
			1,
			buildComment({ suggestedCode: 'const x = 1;' }),
		);

		expect(createReviewComment).toHaveBeenCalledOnce();
		const call = createReviewComment.mock.calls[0][0];
		expect(call.body).toContain('Issue body');
		expect(call.body).toContain('```suggestion\nconst x = 1;\n```');
		expect(call.commit_id).toBe('sha-123');
		expect(call.path).toBe('src/file.ts');
		expect(call.line).toBe(10);
	});

	it('postReviewComment: suggestedCode なし → body のみ', async () => {
		const { createReviewComment } = buildOctokit({});
		const adapter = new GitHubApiAdapter('token');
		await adapter.postReviewComment('org', 'repo', 1, buildComment({ suggestedCode: null }));

		const call = createReviewComment.mock.calls[0][0];
		expect(call.body).toBe('Issue body');
		expect(call.body).not.toContain('suggestion');
	});
});
