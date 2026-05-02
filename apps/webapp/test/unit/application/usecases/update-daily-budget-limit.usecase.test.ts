import { UpdateDailyBudgetLimitUseCase } from '@/backend/application/usecases/update-daily-budget-limit.usecase';
import { Budget } from '@/backend/domain/models/budget.model';
import type { BudgetRepository } from '@/backend/domain/repositories/budget.repository';
import { describe, expect, it, vi } from 'vitest';

function createRepo(): BudgetRepository {
	return {
		findByDate: vi.fn().mockResolvedValue(null),
		save: vi.fn().mockResolvedValue(undefined),
	};
}

describe('UpdateDailyBudgetLimitUseCase', () => {
	const date = new Date('2026-05-02T12:00:00Z');

	it('該当日の Budget が無ければ新規作成する', async () => {
		const repo = createRepo();
		let counter = 0;
		const useCase = new UpdateDailyBudgetLimitUseCase(repo, () => `b-${++counter}`);

		const result = await useCase.execute({ date, dailyLimitUsd: 0.5 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.id).toBe('b-1');
			expect(result.value.dailyLimitUsd).toBe(0.5);
			expect(result.value.usedUsd).toBe(0);
		}
		expect(repo.save).toHaveBeenCalledOnce();
	});

	it('既存の Budget があれば usedUsd を維持して上限のみ書き換える', async () => {
		const repo = createRepo();
		const existing = Budget.create({
			id: 'b-existing',
			date,
			dailyLimitUsd: 0.3,
			usedUsd: 0.15,
		});
		if (!existing.success) throw new Error('failed');
		(repo.findByDate as ReturnType<typeof vi.fn>).mockResolvedValue(existing.value);

		const useCase = new UpdateDailyBudgetLimitUseCase(repo, () => 'b-new');
		const result = await useCase.execute({ date, dailyLimitUsd: 1.0 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.id).toBe('b-existing');
			expect(result.value.dailyLimitUsd).toBe(1.0);
			expect(result.value.usedUsd).toBe(0.15);
		}
	});

	it('dailyLimitUsd <= 0 の場合 INVALID_LIMIT を返す', async () => {
		const repo = createRepo();
		const useCase = new UpdateDailyBudgetLimitUseCase(repo, () => 'b');

		const result = await useCase.execute({ date, dailyLimitUsd: 0 });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('INVALID_LIMIT');
		expect(repo.save).not.toHaveBeenCalled();
	});
});
