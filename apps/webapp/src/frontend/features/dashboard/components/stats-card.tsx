import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function StatsCard({
	title,
	icon: Icon,
	value,
	description,
}: {
	title: string;
	icon: LucideIcon;
	value: ReactNode;
	description?: ReactNode;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold text-foreground">{value}</div>
				{description ? <p className="text-xs text-muted-foreground mt-1">{description}</p> : null}
			</CardContent>
		</Card>
	);
}
