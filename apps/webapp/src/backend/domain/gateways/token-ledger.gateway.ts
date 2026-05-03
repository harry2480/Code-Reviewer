/**
 * AI 呼び出しのトークン消費を時系列ログとして記録する Gateway interface。
 * 詳細トレーサビリティ用 (Budget は日次集計用、こちらは個別の呼び出し記録)。
 */
export interface TokenLedgerEntry {
	timestamp: string;
	sessionId: string;
	model: string;
	perspective: string;
	prId: string;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	costUsd: number;
}

export interface TokenLedgerSummary {
	date: string;
	totalEntries: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalTokens: number;
	totalCostUsd: number;
	byPerspective: Record<string, { totalTokens: number; costUsd: number }>;
}

export interface TokenLedgerGateway {
	append(entry: TokenLedgerEntry): Promise<void>;
	listByDate(date: Date): Promise<TokenLedgerEntry[]>;
	summarizeByDate(date: Date): Promise<TokenLedgerSummary>;
	listRange(from: Date, to: Date): Promise<TokenLedgerSummary[]>;
}
