import type { AiUsage } from '../../domain/gateways/ai.gateway';
import type {
	TokenLedgerEntry,
	TokenLedgerGateway,
} from '../../domain/gateways/token-ledger.gateway';
import { Budget } from '../../domain/models/budget.model';
import type { BudgetRepository } from '../../domain/repositories/budget.repository';
import type { BudgetManagerService } from '../../domain/services/budget-manager.service';

export interface LogTokenConsumptionInput {
	sessionId: string;
	prId: string;
	model: string;
	perspective: string;
	usage: AiUsage;
}

/**
 * AI 呼び出し後にトークン消費を記録する。
 * - TokenLedger (Redis) に詳細ログを追加
 * - Budget (DB) の usedUsd を加算
 */
export class LogTokenConsumptionUseCase {
	constructor(
		private readonly tokenLedger: TokenLedgerGateway,
		private readonly budgetRepository: BudgetRepository,
		private readonly budgetManager: BudgetManagerService,
		private readonly idGenerator: () => string,
	) {}

	async execute(input: LogTokenConsumptionInput): Promise<{ costUsd: number }> {
		const costUsd = this.budgetManager.estimateCost(input.model, input.usage);
		const now = new Date();
		const dayStart = new Date(now);
		dayStart.setUTCHours(0, 0, 0, 0);

		const entry: TokenLedgerEntry = {
			timestamp: now.toISOString(),
			sessionId: input.sessionId,
			model: input.model,
			perspective: input.perspective,
			prId: input.prId,
			inputTokens: input.usage.inputTokens,
			outputTokens: input.usage.outputTokens,
			totalTokens: input.usage.totalTokens,
			costUsd,
		};
		await this.tokenLedger.append(entry);

		const existing = await this.budgetRepository.findByDate(dayStart);
		const previousUsed = existing?.usedUsd ?? 0;
		const previousLimit = existing?.dailyLimitUsd ?? 5;
		const next = Budget.reconstruct({
			id: existing?.id ?? this.idGenerator(),
			date: dayStart,
			dailyLimitUsd: previousLimit,
			usedUsd: previousUsed + costUsd,
		});
		await this.budgetRepository.save(next);

		return { costUsd };
	}
}
