import type { AiUsage } from '../gateways/ai.gateway';

/**
 * モデル別の 1M トークンあたり USD 単価。
 * Claude のドキュメントに基づく概算値。
 */
const PRICE_TABLE: Record<string, { inputUsdPerMTokens: number; outputUsdPerMTokens: number }> = {
	'claude-haiku-4-5-20251001': { inputUsdPerMTokens: 1.0, outputUsdPerMTokens: 5.0 },
	'claude-sonnet-4-6': { inputUsdPerMTokens: 3.0, outputUsdPerMTokens: 15.0 },
	'claude-opus-4-7': { inputUsdPerMTokens: 15.0, outputUsdPerMTokens: 75.0 },
	stub: { inputUsdPerMTokens: 0, outputUsdPerMTokens: 0 },
};

const DEFAULT_PRICE = { inputUsdPerMTokens: 1.0, outputUsdPerMTokens: 5.0 };

/**
 * トークン消費とコストを計算し、予算判定を行うドメインサービス。
 * モデル別の単価テーブル、ハードリミット判定、コスト推定を提供。
 */
export class BudgetManagerService {
	estimateCost(model: string, usage: AiUsage): number {
		const price = PRICE_TABLE[model] ?? DEFAULT_PRICE;
		const inputCost = (usage.inputTokens / 1_000_000) * price.inputUsdPerMTokens;
		const outputCost = (usage.outputTokens / 1_000_000) * price.outputUsdPerMTokens;
		return inputCost + outputCost;
	}

	/**
	 * 予算超過の判定 (現在の消費額 + 想定追加額が上限を超えるか)。
	 * 厳密には事前推定不可なため、現状値ベースのチェックに使う。
	 */
	wouldExceed(current: { usedUsd: number; dailyLimitUsd: number }, additionalUsd: number): boolean {
		return current.usedUsd + additionalUsd > current.dailyLimitUsd;
	}
}
