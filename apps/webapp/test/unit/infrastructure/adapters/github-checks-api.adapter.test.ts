import {
	GitHubChecksApiAdapter,
	StubChecksApiAdapter,
} from '@/backend/infrastructure/adapters/github-checks-api.adapter';
import { Octokit } from '@octokit/rest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@octokit/rest', () => {
	const Octokit = vi.fn();
	return { Octokit };
});

const OctokitMock = Octokit as unknown as ReturnType<typeof vi.fn>;

function buildOctokit(checksOverrides: {
	create?: ReturnType<typeof vi.fn>;
	update?: ReturnType<typeof vi.fn>;
}) {
	const create = checksOverrides.create ?? vi.fn().mockResolvedValue({ data: { id: 12345 } });
	const update = checksOverrides.update ?? vi.fn().mockResolvedValue({ data: {} });
	OctokitMock.mockImplementation(() => ({
		checks: { create, update },
	}));
	return { create, update };
}

describe('GitHubChecksApiAdapter', () => {
	it('createCheckRun は head_sha と name を Octokit に渡し ID を返す', async () => {
		const { create } = buildOctokit({});
		const adapter = new GitHubChecksApiAdapter('token');

		const result = await adapter.createCheckRun({
			owner: 'org',
			repo: 'repo',
			headSha: 'abc123',
			name: 'AI Review',
			status: 'queued',
			output: { title: 'In queue', summary: 'waiting' },
		});

		expect(create).toHaveBeenCalledWith({
			owner: 'org',
			repo: 'repo',
			head_sha: 'abc123',
			name: 'AI Review',
			status: 'queued',
			output: { title: 'In queue', summary: 'waiting' },
		});
		expect(result.id).toBe(12345);
	});

	it('updateCheckRun は check_run_id と conclusion を Octokit に渡す', async () => {
		const { update } = buildOctokit({});
		const adapter = new GitHubChecksApiAdapter('token');

		await adapter.updateCheckRun({
			owner: 'org',
			repo: 'repo',
			checkRunId: 999,
			status: 'completed',
			conclusion: 'success',
			output: { title: 'Done', summary: 'OK' },
		});

		expect(update).toHaveBeenCalledWith({
			owner: 'org',
			repo: 'repo',
			check_run_id: 999,
			status: 'completed',
			conclusion: 'success',
			output: { title: 'Done', summary: 'OK' },
		});
	});
});

describe('StubChecksApiAdapter', () => {
	it('createCheckRun はインクリメンタルな ID を返す', async () => {
		const adapter = new StubChecksApiAdapter();
		expect((await adapter.createCheckRun(stubParams())).id).toBe(1);
		expect((await adapter.createCheckRun(stubParams())).id).toBe(2);
		expect((await adapter.createCheckRun(stubParams())).id).toBe(3);
	});

	it('updateCheckRun は副作用なし', async () => {
		const adapter = new StubChecksApiAdapter();
		await expect(
			adapter.updateCheckRun({
				owner: 'o',
				repo: 'r',
				checkRunId: 1,
				status: 'completed',
				conclusion: 'success',
			}),
		).resolves.toBeUndefined();
	});
});

function stubParams() {
	return {
		owner: 'org',
		repo: 'repo',
		headSha: 'sha',
		name: 'AI Review',
		status: 'queued' as const,
	};
}
