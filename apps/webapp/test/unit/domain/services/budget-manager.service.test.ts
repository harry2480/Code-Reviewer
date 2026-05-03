import { BudgetManagerService } from '@/backend/domain/services/budget-manager.service';
import { describe, expect, it } from 'vitest';

describe('BudgetManagerService', () => {
	const service = new BudgetManagerService();

	describe('estimateCost', () => {
		it('Haiku モデルの単価で計算できる', () => {
			const cost = service.estimateCost('claude-haiku-4-5-20251001', {
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
				totalTokens: 2_000_000,
			});
			// 1.0 + 5.0 = 6.0 USD
			expect(cost).toBeCloseTo(6.0);
		});

		it('Sonnet モデルの単価で計算できる', () => {
			const cost = service.estimateCost('claude-sonnet-4-6', {
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
				totalTokens: 2_000_000,
			});
			// 3.0 + 15.0 = 18.0 USD
			expect(cost).toBeCloseTo(18.0);
		});

		it('Opus モデルの単価で計算できる', () => {
			const cost = service.estimateCost('claude-opus-4-7', {
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
				totalTokens: 2_000_000,
			});
			// 15.0 + 75.0 = 90.0 USD
			expect(cost).toBeCloseTo(90.0);
		});

		it('stub モデルは 0 USD', () => {
			const cost = service.estimateCost('stub', {
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
				totalTokens: 2_000_000,
			});
			expect(cost).toBe(0);
		});

		it('未知モデルはデフォルト単価を使う', () => {
			const cost = service.estimateCost('unknown-model', {
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
				totalTokens: 2_000_000,
			});
			expect(cost).toBeCloseTo(6.0);
		});

		it('小規模トークンは小数 USD で計算される', () => {
			const cost = service.estimateCost('claude-haiku-4-5-20251001', {
				inputTokens: 1000,
				outputTokens: 500,
				totalTokens: 1500,
			});
			// 1000/1M * 1.0 + 500/1M * 5.0 = 0.001 + 0.0025 = 0.0035
			expect(cost).toBeCloseTo(0.0035);
		});
	});

	describe('wouldExceed', () => {
		it('合計が上限以下なら false', () => {
			expect(service.wouldExceed({ usedUsd: 2, dailyLimitUsd: 5 }, 2)).toBe(false);
		});

		it('合計が上限ぴったりなら false', () => {
			expect(service.wouldExceed({ usedUsd: 2, dailyLimitUsd: 5 }, 3)).toBe(false);
		});

		it('合計が上限を超えたら true', () => {
			expect(service.wouldExceed({ usedUsd: 2, dailyLimitUsd: 5 }, 3.01)).toBe(true);
		});
	});
});
