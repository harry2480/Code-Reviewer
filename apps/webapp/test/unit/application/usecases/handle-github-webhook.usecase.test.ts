import { HandleGitHubWebhookUseCase } from '@/backend/application/usecases/handle-github-webhook.usecase';
import type { ChecksApiGateway } from '@/backend/domain/gateways/checks-api.gateway';
import type { GitHubWebhookGateway } from '@/backend/domain/gateways/github-webhook.gateway';
import type { QueueServiceGateway } from '@/backend/domain/gateways/queue-service.gateway';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createWebhookGateway(verified = true): GitHubWebhookGateway {
	return { verifySignature: vi.fn().mockReturnValue(verified) };
}

function createChecksApi(): ChecksApiGateway {
	return {
		createCheckRun: vi.fn().mockResolvedValue({ id: 12345 }),
		updateCheckRun: vi.fn().mockResolvedValue(undefined),
	};
}

function createQueue(): QueueServiceGateway {
	return {
		enqueueReview: vi.fn().mockResolvedValue(undefined),
		verifyMessageSignature: vi.fn().mockResolvedValue(true),
	};
}

describe('HandleGitHubWebhookUseCase', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('署名検証に失敗した場合 INVALID_SIGNATURE を返す', async () => {
		const useCase = new HandleGitHubWebhookUseCase(
			createWebhookGateway(false),
			createChecksApi(),
			createQueue(),
		);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=invalid',
			eventType: 'pull_request',
			parsedPayload: {},
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('INVALID_SIGNATURE');
	});

	it('ping イベントは ignored を返す', async () => {
		const useCase = new HandleGitHubWebhookUseCase(
			createWebhookGateway(),
			createChecksApi(),
			createQueue(),
		);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=valid',
			eventType: 'ping',
			parsedPayload: {},
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.value.kind).toBe('ignored');
	});

	it('未対応のイベント種別は ignored を返す', async () => {
		const useCase = new HandleGitHubWebhookUseCase(
			createWebhookGateway(),
			createChecksApi(),
			createQueue(),
		);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=valid',
			eventType: 'issues',
			parsedPayload: {},
		});

		expect(result.success).toBe(true);
		if (result.success && result.value.kind === 'ignored') {
			expect(result.value.reason).toContain('unsupported_event');
		}
	});

	it('pull_request opened イベントで checkRun 作成 + キュー投入する', async () => {
		const checksApi = createChecksApi();
		const queue = createQueue();
		const useCase = new HandleGitHubWebhookUseCase(createWebhookGateway(), checksApi, queue);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=valid',
			eventType: 'pull_request',
			parsedPayload: {
				action: 'opened',
				number: 42,
				pull_request: {
					title: 'Add feature',
					body: 'desc',
					head: { sha: 'abc123', ref: 'feature/x' },
					base: { ref: 'main' },
				},
				repository: { name: 'repo', owner: { login: 'owner' } },
				installation: { id: 999 },
			},
		});

		expect(result.success).toBe(true);
		if (result.success && result.value.kind === 'enqueued') {
			expect(result.value.checkRunId).toBe(12345);
		}
		expect(checksApi.createCheckRun).toHaveBeenCalledOnce();
		expect(queue.enqueueReview).toHaveBeenCalledOnce();
		const enqueued = (queue.enqueueReview as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
		expect(enqueued.owner).toBe('owner');
		expect(enqueued.repo).toBe('repo');
		expect(enqueued.prNumber).toBe(42);
		expect(enqueued.headSha).toBe('abc123');
		expect(enqueued.installationId).toBe(999);
	});

	it('pull_request closed イベントは ignored を返す', async () => {
		const checksApi = createChecksApi();
		const queue = createQueue();
		const useCase = new HandleGitHubWebhookUseCase(createWebhookGateway(), checksApi, queue);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=valid',
			eventType: 'pull_request',
			parsedPayload: {
				action: 'closed',
				number: 42,
				pull_request: {
					title: 'x',
					body: null,
					head: { sha: 'abc', ref: 'f' },
					base: { ref: 'main' },
				},
				repository: { name: 'repo', owner: { login: 'owner' } },
			},
		});

		expect(result.success).toBe(true);
		expect(checksApi.createCheckRun).not.toHaveBeenCalled();
		expect(queue.enqueueReview).not.toHaveBeenCalled();
	});

	it('check_run completed + success でレビュー実行に進む', async () => {
		const checksApi = createChecksApi();
		const queue = createQueue();
		const useCase = new HandleGitHubWebhookUseCase(createWebhookGateway(), checksApi, queue);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=valid',
			eventType: 'check_run',
			parsedPayload: {
				action: 'completed',
				check_run: {
					status: 'completed',
					conclusion: 'success',
					head_sha: 'sha1',
					pull_requests: [{ number: 7, head: { sha: 'sha1' }, base: { sha: 'main' } }],
				},
				repository: { name: 'repo', owner: { login: 'owner' } },
			},
		});

		expect(result.success).toBe(true);
		expect(checksApi.createCheckRun).toHaveBeenCalledOnce();
		expect(queue.enqueueReview).toHaveBeenCalledOnce();
	});

	it('check_run failure はスキップする', async () => {
		const checksApi = createChecksApi();
		const queue = createQueue();
		const useCase = new HandleGitHubWebhookUseCase(createWebhookGateway(), checksApi, queue);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=valid',
			eventType: 'check_run',
			parsedPayload: {
				action: 'completed',
				check_run: {
					status: 'completed',
					conclusion: 'failure',
					head_sha: 'sha1',
					pull_requests: [{ number: 7, head: { sha: 'sha1' }, base: { sha: 'main' } }],
				},
				repository: { name: 'repo', owner: { login: 'owner' } },
			},
		});

		expect(result.success).toBe(true);
		expect(checksApi.createCheckRun).not.toHaveBeenCalled();
		expect(queue.enqueueReview).not.toHaveBeenCalled();
	});

	it('CheckRun 作成失敗時は CHECK_RUN_FAILED を返す', async () => {
		const checksApi = createChecksApi();
		(checksApi.createCheckRun as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
		const queue = createQueue();
		const useCase = new HandleGitHubWebhookUseCase(createWebhookGateway(), checksApi, queue);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sha256=valid',
			eventType: 'pull_request',
			parsedPayload: {
				action: 'opened',
				number: 42,
				pull_request: {
					title: 'x',
					body: null,
					head: { sha: 'abc', ref: 'f' },
					base: { ref: 'main' },
				},
				repository: { name: 'repo', owner: { login: 'owner' } },
			},
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('CHECK_RUN_FAILED');
		expect(queue.enqueueReview).not.toHaveBeenCalled();
	});
});
