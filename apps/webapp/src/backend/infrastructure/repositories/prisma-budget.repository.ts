import { Budget } from '../../domain/models/budget.model';
import type { BudgetRepository } from '../../domain/repositories/budget.repository';
import { prisma } from '../db/prisma-client';

export class PrismaBudgetRepository implements BudgetRepository {
	async findByDate(date: Date): Promise<Budget | null> {
		const startOfDay = new Date(date);
		startOfDay.setUTCHours(0, 0, 0, 0);

		const record = await prisma.budget.findUnique({
			where: { date: startOfDay },
		});

		if (!record) return null;

		return Budget.reconstruct({
			id: record.id,
			date: record.date,
			dailyLimitUsd: record.dailyLimitUsd,
			usedUsd: record.usedUsd,
		});
	}

	async save(budget: Budget): Promise<void> {
		const startOfDay = new Date(budget.date);
		startOfDay.setUTCHours(0, 0, 0, 0);

		await prisma.budget.upsert({
			where: { date: startOfDay },
			create: {
				id: budget.id,
				date: startOfDay,
				dailyLimitUsd: budget.dailyLimitUsd,
				usedUsd: budget.usedUsd,
			},
			update: {
				usedUsd: budget.usedUsd,
			},
		});
	}
}
