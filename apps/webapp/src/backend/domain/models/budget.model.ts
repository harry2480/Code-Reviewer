import type { Result } from './result.model';

type BudgetError = 'DAILY_LIMIT_INVALID' | 'USED_AMOUNT_NEGATIVE' | 'USED_EXCEEDS_CONTEXT';

export class Budget {
	private constructor(
		public readonly id: string,
		public readonly date: Date,
		public readonly dailyLimitUsd: number,
		public readonly usedUsd: number,
	) {}

	static create(params: {
		id: string;
		date: Date;
		dailyLimitUsd: number;
		usedUsd?: number;
	}): Result<Budget, BudgetError> {
		if (params.dailyLimitUsd <= 0) {
			return { success: false, error: 'DAILY_LIMIT_INVALID' };
		}

		const usedUsd = params.usedUsd ?? 0;
		if (usedUsd < 0) {
			return { success: false, error: 'USED_AMOUNT_NEGATIVE' };
		}

		return {
			success: true,
			value: new Budget(params.id, params.date, params.dailyLimitUsd, usedUsd),
		};
	}

	static reconstruct(params: {
		id: string;
		date: Date;
		dailyLimitUsd: number;
		usedUsd: number;
	}): Budget {
		return new Budget(params.id, params.date, params.dailyLimitUsd, params.usedUsd);
	}

	isExceeded(): boolean {
		return this.usedUsd >= this.dailyLimitUsd;
	}

	remaining(): number {
		return Math.max(0, this.dailyLimitUsd - this.usedUsd);
	}
}
