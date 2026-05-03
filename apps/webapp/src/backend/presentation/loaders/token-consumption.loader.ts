import { getTokenConsumptionUseCase } from '../composition/review-frontend.composition';
import type { GetTokenConsumptionResult } from '../../application/usecases/get-token-consumption.usecase';

export type TokenConsumptionLoaderResult = {
	today: GetTokenConsumptionResult['today'];
	todayEntries: GetTokenConsumptionResult['todayEntries'];
	last30Days: GetTokenConsumptionResult['last30Days'];
	budget: { dailyLimitUsd: number; usedUsd: number; remainingUsd: number } | null;
};

export async function tokenConsumptionLoader(): Promise<TokenConsumptionLoaderResult> {
	const result = await getTokenConsumptionUseCase.execute();

	const { dashboardLoader } = await import('./dashboard.loader');
	const dashboard = await dashboardLoader();

	return {
		today: result.today,
		todayEntries: result.todayEntries,
		last30Days: result.last30Days,
		budget: dashboard.budget,
	};
}
