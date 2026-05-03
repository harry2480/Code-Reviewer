import { Card, CardContent, CardHeader } from '@/frontend/components/ui/card';
import { Skeleton } from '@/frontend/components/ui/skeleton';

const STAT_KEYS = ['stat-1', 'stat-2', 'stat-3'];

export default function BudgetDetailsLoading() {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-7 w-32" />
				<Skeleton className="h-4 w-72" />
			</div>
			<Skeleton className="h-20 w-full" />
			<div className="grid gap-4 md:grid-cols-3">
				{STAT_KEYS.map((key) => (
					<Card key={key}>
						<CardHeader>
							<Skeleton className="h-4 w-32" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-24" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-48" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-40 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}
