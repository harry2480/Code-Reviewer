import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Progress } from '@/frontend/components/ui/progress';
import { Wallet } from 'lucide-react';

type Props = {
	budget: { dailyLimitUsd: number; usedUsd: number; remainingUsd: number } | null;
};

export function BudgetProgress({ budget }: Props) {
	if (!budget) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">本日の予算</CardTitle>
					<Wallet className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						本日の予算はまだ設定されていません。設定ページから日次上限を登録してください。
					</p>
				</CardContent>
			</Card>
		);
	}

	const usedPercent = Math.min(100, Math.round((budget.usedUsd / budget.dailyLimitUsd) * 100));

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">本日の予算</CardTitle>
				<Wallet className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-2xl font-bold text-foreground">${budget.usedUsd.toFixed(3)}</span>
					<span className="text-sm text-muted-foreground">
						/ ${budget.dailyLimitUsd.toFixed(2)}
					</span>
				</div>
				<Progress value={usedPercent} />
				<p className="text-xs text-muted-foreground">
					残り ${budget.remainingUsd.toFixed(3)}（{100 - usedPercent}%）
				</p>
			</CardContent>
		</Card>
	);
}
