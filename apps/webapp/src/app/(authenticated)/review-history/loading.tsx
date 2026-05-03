import { Card, CardContent, CardHeader } from '@/frontend/components/ui/card';
import { Skeleton } from '@/frontend/components/ui/skeleton';

const ROW_KEYS = Array.from({ length: 10 }, (_, i) => `row-${i + 1}`);

export default function ReviewHistoryLoading() {
	return (
		<div className="space-y-5">
			<div className="space-y-2">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-4 w-72" />
			</div>
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<div className="flex gap-2">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="h-9 w-32" />
				</div>
				<Skeleton className="h-4 w-16" />
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-32" />
				</CardHeader>
				<CardContent className="space-y-2">
					{ROW_KEYS.map((key) => (
						<Skeleton key={key} className="h-12 w-full" />
					))}
				</CardContent>
			</Card>
		</div>
	);
}
