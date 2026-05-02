import { dashboardLoader } from '@/backend/presentation/loaders/dashboard.loader';
import { DashboardContent } from '@/frontend/features/dashboard/components/dashboard-content';

export const revalidate = 600;

export default async function DashboardPage() {
	const data = await dashboardLoader();
	return <DashboardContent data={data} />;
}
