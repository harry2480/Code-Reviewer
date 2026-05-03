import { Redis } from '@upstash/redis';
import type {
	TokenLedgerEntry,
	TokenLedgerGateway,
	TokenLedgerSummary,
} from '../../domain/gateways/token-ledger.gateway';

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 日
const KEY_PREFIX = 'token-ledger';

/**
 * Upstash Redis を使用した TokenLedgerGateway 実装。
 * キー: `token-ledger:{YYYY-MM-DD}` (List 構造、push で append)
 * TTL: 7 日
 */
export class UpstashRedisTokenLedgerAdapter implements TokenLedgerGateway {
	constructor(private readonly client: Redis) {}

	static fromEnv(): UpstashRedisTokenLedgerAdapter | null {
		const url = process.env.UPSTASH_REDIS_REST_URL;
		const token = process.env.UPSTASH_REDIS_REST_TOKEN;
		if (!url || !token) return null;
		return new UpstashRedisTokenLedgerAdapter(new Redis({ url, token }));
	}

	async append(entry: TokenLedgerEntry): Promise<void> {
		const key = this.buildKey(new Date(entry.timestamp));
		await this.client.rpush(key, JSON.stringify(entry));
		await this.client.expire(key, TTL_SECONDS);
	}

	async listByDate(date: Date): Promise<TokenLedgerEntry[]> {
		const key = this.buildKey(date);
		const items = await this.client.lrange<string | TokenLedgerEntry>(key, 0, -1);
		return items.map((item) =>
			typeof item === 'string' ? (JSON.parse(item) as TokenLedgerEntry) : item,
		);
	}

	async summarizeByDate(date: Date): Promise<TokenLedgerSummary> {
		const entries = await this.listByDate(date);
		return summarize(date, entries);
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
		const iso = date.toISOString().slice(0, 10);
		return `${KEY_PREFIX}:${iso}`;
	}
}

export function summarize(date: Date, entries: TokenLedgerEntry[]): TokenLedgerSummary {
	const byPerspective: Record<string, { totalTokens: number; costUsd: number }> = {};
	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let totalCostUsd = 0;

	for (const e of entries) {
		totalInputTokens += e.inputTokens;
		totalOutputTokens += e.outputTokens;
		totalCostUsd += e.costUsd;

		const bucket = byPerspective[e.perspective] ?? { totalTokens: 0, costUsd: 0 };
		bucket.totalTokens += e.totalTokens;
		bucket.costUsd += e.costUsd;
		byPerspective[e.perspective] = bucket;
	}

	return {
		date: date.toISOString().slice(0, 10),
		totalEntries: entries.length,
		totalInputTokens,
		totalOutputTokens,
		totalTokens: totalInputTokens + totalOutputTokens,
		totalCostUsd,
		byPerspective,
	};
}
