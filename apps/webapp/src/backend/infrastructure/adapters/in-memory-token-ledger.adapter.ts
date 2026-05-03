import type {
	TokenLedgerEntry,
	TokenLedgerGateway,
	TokenLedgerSummary,
} from '../../domain/gateways/token-ledger.gateway';
import { summarize } from './upstash-redis-token-ledger.adapter';

/**
 * テスト・開発用の InMemory TokenLedger 実装。
 * Upstash Redis が未設定の場合に使用される。
 */
export class InMemoryTokenLedgerAdapter implements TokenLedgerGateway {
	private entries = new Map<string, TokenLedgerEntry[]>();

	async append(entry: TokenLedgerEntry): Promise<void> {
		const key = this.buildKey(new Date(entry.timestamp));
		const list = this.entries.get(key) ?? [];
		list.push(entry);
		this.entries.set(key, list);
	}

	async listByDate(date: Date): Promise<TokenLedgerEntry[]> {
		return this.entries.get(this.buildKey(date)) ?? [];
	}

	async summarizeByDate(date: Date): Promise<TokenLedgerSummary> {
		const list = await this.listByDate(date);
		return summarize(date, list);
	}

	async listRange(from: Date, to: Date): Promise<TokenLedgerSummary[]> {
		const summaries: TokenLedgerSummary[] = [];
		const cursor = new Date(from);
		cursor.setUTCHours(0, 0, 0, 0);
		const end = new Date(to);
		end.setUTCHours(0, 0, 0, 0);

		while (cursor.getTime() <= end.getTime()) {
			summaries.push(await this.summarizeByDate(new Date(cursor)));
			cursor.setUTCDate(cursor.getUTCDate() + 1);
		}
		return summaries;
	}

	private buildKey(date: Date): string {
		return date.toISOString().slice(0, 10);
	}
}
