import { tokenConsumptionLoader } from '@/backend/presentation/loaders/token-consumption.loader';
import { BudgetDetailsContent } from '@/frontend/features/budget/components/budget-details-content';

export const dynamic = 'force-dynamic';

export default async function BudgetDetailsPage() {
	const data = await tokenConsumptionLoader();
	return <BudgetDetailsContent data={data} />;
}
