import { Budget } from '../../domain/models/budget.model';
import type { Result } from '../../domain/models/result.model';
import type { BudgetRepository } from '../../domain/repositories/budget.repository';

type UpdateDailyBudgetLimitError = 'INVALID_LIMIT';

export class UpdateDailyBudgetLimitUseCase {
	constructor(
		private readonly budgetRepository: BudgetRepository,
		private readonly idGenerator: () => string,
	) {}

	async execute(params: {
		date: Date;
		dailyLimitUsd: number;
	}): Promise<Result<Budget, UpdateDailyBudgetLimitError>> {
		const dayStart = new Date(params.date);
		dayStart.setUTCHours(0, 0, 0, 0);

		const existing = await this.budgetRepository.findByDate(dayStart);
		const next = Budget.create({
			id: existing?.id ?? this.idGenerator(),
			date: dayStart,
			dailyLimitUsd: params.dailyLimitUsd,
			usedUsd: existing?.usedUsd ?? 0,
		});

		if (!next.success) {
			return { success: false, error: 'INVALID_LIMIT' };
		}

		await this.budgetRepository.save(next.value);
		return { success: true, value: next.value };
	}
}
