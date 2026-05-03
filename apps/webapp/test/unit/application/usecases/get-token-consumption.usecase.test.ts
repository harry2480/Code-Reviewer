import { GetTokenConsumptionUseCase } from '@/backend/application/usecases/get-token-consumption.usecase';
import { InMemoryTokenLedgerAdapter } from '@/backend/infrastructure/adapters/in-memory-token-ledger.adapter';
import { describe, expect, it } from 'vitest';

function entry(overrides: Partial<{ timestamp: string; perspective: string; costUsd: number }> = {}) {
	return {
		timestamp: '2026-05-03T12:00:00.000Z',
		sessionId: 's1',
		model: 'stub',
		perspective: 'logic',
		prId: 'org/repo#1',
		inputTokens: 100,
		outputTokens: 50,
		totalTokens: 150,
		costUsd: 0.001,
		...overrides,
	};
}

describe('GetTokenConsumptionUseCase', () => {
	it('today: 当日のサマリ + エントリを返す', async () => {
		const ledger = new InMemoryTokenLedgerAdapter();
		const today = new Date('2026-05-03T10:00:00Z');
		await ledger.append(entry({ timestamp: '2026-05-03T11:00:00Z', perspective: 'logic' }));
		await ledger.append(entry({ timestamp: '2026-05-03T12:00:00Z', perspective: 'security' }));

		const useCase = new GetTokenConsumptionUseCase(ledger);
		const result = await useCase.execute(today);

		expect(result.today.totalEntries).toBe(2);
		expect(result.todayEntries).toHaveLength(2);
	});

	it('last30Days: 過去 30 日分のサマリを返す', async () => {
		const ledger = new InMemoryTokenLedgerAdapter();
		const today = new Date('2026-05-03T10:00:00Z');

		const useCase = new GetTokenConsumptionUseCase(ledger);
		const result = await useCase.execute(today);

		expect(result.last30Days).toHaveLength(30);
		expect(result.last30Days[result.last30Days.length - 1].date).toBe('2026-05-03');
		expect(result.last30Days[0].date).toBe('2026-04-04');
	});

	it('当日にデータがなくても空サマリを返して例外を投げない', async () => {
		const ledger = new InMemoryTokenLedgerAdapter();
		const today = new Date('2026-05-03T10:00:00Z');

		const useCase = new GetTokenConsumptionUseCase(ledger);
		const result = await useCase.execute(today);

		expect(result.today.totalEntries).toBe(0);
		expect(result.today.totalCostUsd).toBe(0);
		expect(result.todayEntries).toEqual([]);
	});
});
