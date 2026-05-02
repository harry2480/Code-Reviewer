import { Budget } from '@/backend/domain/models/budget.model';
import { describe, expect, it } from 'vitest';

const today = new Date('2025-01-15');

describe('Budget.create', () => {
	it('正常に Budget を生成できる', () => {
		const result = Budget.create({
			id: 'budget-1',
			date: today,
			dailyLimitUsd: 10,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.dailyLimitUsd).toBe(10);
			expect(result.value.usedUsd).toBe(0);
		}
	});

	it('日次上限が 0 以下の場合エラーを返す', () => {
		const result = Budget.create({ id: 'budget-1', date: today, dailyLimitUsd: 0 });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('DAILY_LIMIT_INVALID');
		}
	});

	it('使用額が負の場合エラーを返す', () => {
		const result = Budget.create({
			id: 'budget-1',
			date: today,
			dailyLimitUsd: 10,
			usedUsd: -1,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('USED_AMOUNT_NEGATIVE');
		}
	});
});

describe('Budget.isExceeded', () => {
	it('使用額が上限未満なら false を返す', () => {
		const budget = Budget.reconstruct({ id: 'b', date: today, dailyLimitUsd: 10, usedUsd: 5 });
		expect(budget.isExceeded()).toBe(false);
	});

	it('使用額が上限に達した場合 true を返す', () => {
		const budget = Budget.reconstruct({ id: 'b', date: today, dailyLimitUsd: 10, usedUsd: 10 });
		expect(budget.isExceeded()).toBe(true);
	});

	it('使用額が上限を超えた場合 true を返す', () => {
		const budget = Budget.reconstruct({ id: 'b', date: today, dailyLimitUsd: 10, usedUsd: 11 });
		expect(budget.isExceeded()).toBe(true);
	});
});

describe('Budget.remaining', () => {
	it('残額を正しく計算する', () => {
		const budget = Budget.reconstruct({ id: 'b', date: today, dailyLimitUsd: 10, usedUsd: 3 });
		expect(budget.remaining()).toBe(7);
	});

	it('超過した場合は 0 を返す', () => {
		const budget = Budget.reconstruct({ id: 'b', date: today, dailyLimitUsd: 10, usedUsd: 15 });
		expect(budget.remaining()).toBe(0);
	});
});
