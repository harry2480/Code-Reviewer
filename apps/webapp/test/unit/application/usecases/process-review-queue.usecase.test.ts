import {
	BudgetExceededError,
	type ExecutePrReviewUseCase,
} from '@/backend/application/usecases/execute-pr-review.usecase';
import { ProcessReviewQueueUseCase } from '@/backend/application/usecases/process-review-queue.usecase';
import type { ChecksApiGateway } from '@/backend/domain/gateways/checks-api.gateway';
import type { QueueServiceGateway } from '@/backend/domain/gateways/queue-service.gateway';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createExecutePrReview(): ExecutePrReviewUseCase {
	return { execute: vi.fn().mockResolvedValue(undefined) } as unknown as ExecutePrReviewUseCase;
}

function createChecksApi(): ChecksApiGateway {
	return {
		createCheckRun: vi.fn().mockResolvedValue({ id: 1 }),
		updateCheckRun: vi.fn().mockResolvedValue(undefined),
	};
}

function createQueue(verified = true): QueueServiceGateway {
	return {
		enqueueReview: vi.fn().mockResolvedValue(undefined),
		verifyMessageSignature: vi.fn().mockResolvedValue(verified),
	};
}

const validMessage = {
	owner: 'owner',
	repo: 'repo',
	prNumber: 42,
	headSha: 'abc123',
	checkRunId: 999,
};

describe('ProcessReviewQueueUseCase', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('署名検証失敗時 INVALID_SIGNATURE を返す', async () => {
		const useCase = new ProcessReviewQueueUseCase(
			createExecutePrReview(),
			createChecksApi(),
			createQueue(false),
		);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: null,
			parsedMessage: validMessage,
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('INVALID_SIGNATURE');
	});

	it('不正なメッセージ形式で INVALID_MESSAGE を返す', async () => {
		const useCase = new ProcessReviewQueueUseCase(
			createExecutePrReview(),
			createChecksApi(),
			createQueue(),
		);

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sig',
			parsedMessage: { foo: 'bar' },
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('INVALID_MESSAGE');
	});

	it('レビュー成功時 in_progress→completed/success の順で更新する', async () => {
		const exec = createExecutePrReview();
		const checks = createChecksApi();
		const useCase = new ProcessReviewQueueUseCase(exec, checks, createQueue());

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sig',
			parsedMessage: validMessage,
		});

		expect(result.success).toBe(true);
		expect(exec.execute).toHaveBeenCalledWith('owner', 'repo', 42);
		expect(checks.updateCheckRun).toHaveBeenCalledTimes(2);
		const calls = (checks.updateCheckRun as ReturnType<typeof vi.fn>).mock.calls;
		expect(calls[0][0].status).toBe('in_progress');
		expect(calls[1][0].status).toBe('completed');
		expect(calls[1][0].conclusion).toBe('success');
	});

	it('レビュー失敗時 conclusion: failure で更新し REVIEW_FAILED を返す', async () => {
		const exec = createExecutePrReview();
		(exec.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
		const checks = createChecksApi();
		const useCase = new ProcessReviewQueueUseCase(exec, checks, createQueue());

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sig',
			parsedMessage: validMessage,
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('REVIEW_FAILED');
		const calls = (checks.updateCheckRun as ReturnType<typeof vi.fn>).mock.calls;
		expect(calls[1][0].conclusion).toBe('failure');
		expect(calls[1][0].output.title).toBe('AI Review failed');
	});

	it('予算超過 (BudgetExceededError) 時は conclusion: neutral で Budget Exceeded と表示する', async () => {
		const exec = createExecutePrReview();
		(exec.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new BudgetExceededError(5.5, 5.0),
		);
		const checks = createChecksApi();
		const useCase = new ProcessReviewQueueUseCase(exec, checks, createQueue());

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sig',
			parsedMessage: validMessage,
		});

		expect(result.success).toBe(false);
		const calls = (checks.updateCheckRun as ReturnType<typeof vi.fn>).mock.calls;
		expect(calls[1][0].conclusion).toBe('neutral');
		expect(calls[1][0].output.title).toBe('AI Review skipped: Budget Exceeded');
	});

	it('checks API への in_progress 更新失敗でもレビュー実行は継続する', async () => {
		const exec = createExecutePrReview();
		const checks = createChecksApi();
		(checks.updateCheckRun as ReturnType<typeof vi.fn>)
			.mockRejectedValueOnce(new Error('checks failed'))
			.mockResolvedValue(undefined);

		const useCase = new ProcessReviewQueueUseCase(exec, checks, createQueue());

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sig',
			parsedMessage: validMessage,
		});

		expect(result.success).toBe(true);
		expect(exec.execute).toHaveBeenCalledOnce();
	});

	it('completed への更新失敗でも success 扱い (ベストエフォート)', async () => {
		const exec = createExecutePrReview();
		const checks = createChecksApi();
		(checks.updateCheckRun as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('checks failed'));

		const useCase = new ProcessReviewQueueUseCase(exec, checks, createQueue());

		const result = await useCase.execute({
			rawBody: '{}',
			signature: 'sig',
			parsedMessage: validMessage,
		});

		expect(result.success).toBe(true);
	});
});
