import type { Budget } from '../models/budget.model';

export interface BudgetRepository {
	findByDate(date: Date): Promise<Budget | null>;
	save(budget: Budget): Promise<void>;
}
