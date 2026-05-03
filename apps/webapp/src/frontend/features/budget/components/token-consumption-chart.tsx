import type { TokenLedgerSummary } from '@/backend/presentation/types/budget-frontend.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';

type Props = {
	summaries: TokenLedgerSummary[];
};

export function TokenConsumptionChart({ summaries }: Props) {
	if (summaries.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">過去30日間のトークン消費</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">記録された消費はありません。</p>
				</CardContent>
			</Card>
		);
	}

	const maxCost = Math.max(...summaries.map((s) => s.totalCostUsd), 0.0001);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">過去30日間のトークン消費</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex h-40 items-end gap-1">
					{summaries.map((s) => {
						const heightPercent = (s.totalCostUsd / maxCost) * 100;
						return (
							<div
								key={s.date}
								className="group relative flex flex-1 flex-col items-center justify-end"
								title={`${s.date}: $${s.totalCostUsd.toFixed(4)} (${s.totalTokens.toLocaleString()} tokens)`}
							>
								<div
									className="w-full rounded-t bg-blue-500 transition-all hover:bg-blue-600"
									style={{ height: `${Math.max(heightPercent, 1)}%` }}
								/>
							</div>
						);
					})}
				</div>
				<div className="mt-2 flex justify-between text-xs text-muted-foreground">
					<span>{summaries[0].date}</span>
					<span>{summaries[summaries.length - 1].date}</span>
				</div>
				<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
					<div>
						<p className="text-muted-foreground">期間合計コスト</p>
						<p className="text-base font-semibold text-foreground">
							${summaries.reduce((sum, s) => sum + s.totalCostUsd, 0).toFixed(4)}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">期間合計トークン</p>
						<p className="text-base font-semibold text-foreground">
							{summaries.reduce((sum, s) => sum + s.totalTokens, 0).toLocaleString()}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
