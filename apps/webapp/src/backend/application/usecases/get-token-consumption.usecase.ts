import type {
	TokenLedgerEntry,
	TokenLedgerGateway,
	TokenLedgerSummary,
} from '../../domain/gateways/token-ledger.gateway';

export interface GetTokenConsumptionResult {
	today: TokenLedgerSummary;
	todayEntries: TokenLedgerEntry[];
	last30Days: TokenLedgerSummary[];
}

export class GetTokenConsumptionUseCase {
	constructor(private readonly tokenLedger: TokenLedgerGateway) {}

	async execute(now: Date = new Date()): Promise<GetTokenConsumptionResult> {
		const today = new Date(now);
		today.setUTCHours(0, 0, 0, 0);

		const start = new Date(today);
		start.setUTCDate(today.getUTCDate() - 29); // 直近 30 日 (today を含めて)

		const [summary, entries, range] = await Promise.all([
			this.tokenLedger.summarizeByDate(today),
			this.tokenLedger.listByDate(today),
			this.tokenLedger.listRange(start, today),
		]);

		return {
			today: summary,
			todayEntries: entries,
			last30Days: range,
		};
	}
}
