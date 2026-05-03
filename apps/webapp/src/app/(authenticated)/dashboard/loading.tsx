import { Card, CardContent, CardHeader } from '@/frontend/components/ui/card';
import { Skeleton } from '@/frontend/components/ui/skeleton';

const STAT_KEYS = ['stat-1', 'stat-2', 'stat-3', 'stat-4'];
const ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'];

export default function DashboardLoading() {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-4 w-96" />
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{STAT_KEYS.map((key) => (
					<Card key={key}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-24" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-32" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-40" />
				</CardHeader>
				<CardContent className="space-y-2">
					{ROW_KEYS.map((key) => (
						<Skeleton key={key} className="h-10 w-full" />
					))}
				</CardContent>
			</Card>
		</div>
	);
}
