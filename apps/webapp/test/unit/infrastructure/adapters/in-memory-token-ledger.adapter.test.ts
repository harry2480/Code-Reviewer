import { InMemoryTokenLedgerAdapter } from '@/backend/infrastructure/adapters/in-memory-token-ledger.adapter';
import { describe, expect, it } from 'vitest';

function entry(overrides: Partial<Parameters<InMemoryTokenLedgerAdapter['append']>[0]> = {}) {
	return {
		timestamp: '2026-05-03T00:00:00.000Z',
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

describe('InMemoryTokenLedgerAdapter', () => {
	it('append したエントリを listByDate で取得できる', async () => {
		const adapter = new InMemoryTokenLedgerAdapter();
		await adapter.append(entry({ sessionId: 'a' }));
		await adapter.append(entry({ sessionId: 'b' }));

		const list = await adapter.listByDate(new Date('2026-05-03T12:00:00Z'));
		expect(list).toHaveLength(2);
		expect(list[0].sessionId).toBe('a');
		expect(list[1].sessionId).toBe('b');
	});

	it('別日付のエントリは混ざらない', async () => {
		const adapter = new InMemoryTokenLedgerAdapter();
		await adapter.append(entry({ timestamp: '2026-05-03T00:00:00.000Z' }));
		await adapter.append(entry({ timestamp: '2026-05-04T00:00:00.000Z' }));

		const may3 = await adapter.listByDate(new Date('2026-05-03T00:00:00Z'));
		expect(may3).toHaveLength(1);
		const may4 = await adapter.listByDate(new Date('2026-05-04T00:00:00Z'));
		expect(may4).toHaveLength(1);
	});

	it('summarizeByDate で perspective 別の集計を取得できる', async () => {
		const adapter = new InMemoryTokenLedgerAdapter();
		await adapter.append(
			entry({
				perspective: 'logic',
				inputTokens: 100,
				outputTokens: 50,
				totalTokens: 150,
				costUsd: 0.001,
			}),
		);
		await adapter.append(
			entry({
				perspective: 'security',
				inputTokens: 200,
				outputTokens: 100,
				totalTokens: 300,
				costUsd: 0.002,
			}),
		);
		await adapter.append(
			entry({
				perspective: 'logic',
				inputTokens: 50,
				outputTokens: 25,
				totalTokens: 75,
				costUsd: 0.0005,
			}),
		);

		const summary = await adapter.summarizeByDate(new Date('2026-05-03T00:00:00Z'));
		expect(summary.totalEntries).toBe(3);
		expect(summary.totalInputTokens).toBe(350);
		expect(summary.totalOutputTokens).toBe(175);
		expect(summary.totalTokens).toBe(525);
		expect(summary.totalCostUsd).toBeCloseTo(0.0035);
		expect(summary.byPerspective.logic).toEqual({ totalTokens: 225, costUsd: 0.0015 });
		expect(summary.byPerspective.security).toEqual({ totalTokens: 300, costUsd: 0.002 });
	});

	it('listRange で複数日のサマリを返す', async () => {
		const adapter = new InMemoryTokenLedgerAdapter();
		await adapter.append(entry({ timestamp: '2026-05-01T10:00:00Z' }));
		await adapter.append(entry({ timestamp: '2026-05-03T10:00:00Z' }));

		const summaries = await adapter.listRange(
			new Date('2026-05-01T00:00:00Z'),
			new Date('2026-05-03T00:00:00Z'),
		);
		expect(summaries).toHaveLength(3);
		expect(summaries[0].totalEntries).toBe(1);
		expect(summaries[1].totalEntries).toBe(0);
		expect(summaries[2].totalEntries).toBe(1);
	});

	it('未記録の日付は空のサマリを返す', async () => {
		const adapter = new InMemoryTokenLedgerAdapter();
		const summary = await adapter.summarizeByDate(new Date('2026-05-03T00:00:00Z'));
		expect(summary.totalEntries).toBe(0);
		expect(summary.totalCostUsd).toBe(0);
		expect(summary.byPerspective).toEqual({});
	});
});
