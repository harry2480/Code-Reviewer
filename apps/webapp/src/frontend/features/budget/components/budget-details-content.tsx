import type { TokenConsumptionLoaderResult } from '@/backend/presentation/loaders/token-consumption.loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { BudgetAlert } from './budget-alert';
import { TokenConsumptionChart } from './token-consumption-chart';
import { TokenLedgerTable } from './token-ledger-table';

export function BudgetDetailsContent({ data }: { data: TokenConsumptionLoaderResult }) {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-foreground">予算詳細</h1>
				<p className="text-sm text-muted-foreground">
					本日のトークン消費状況、過去30日のグラフ、詳細ログの CSV エクスポートが行えます。
				</p>
			</div>

			{data.budget && (
				<BudgetAlert usedUsd={data.budget.usedUsd} dailyLimitUsd={data.budget.dailyLimitUsd} />
			)}

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							本日の合計コスト
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-foreground">
							${data.today.totalCostUsd.toFixed(4)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							本日の合計トークン
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-foreground">
							{data.today.totalTokens.toLocaleString()}
						</p>
						<p className="text-xs text-muted-foreground">
							入力: {data.today.totalInputTokens.toLocaleString()} / 出力:{' '}
							{data.today.totalOutputTokens.toLocaleString()}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							本日の AI 呼び出し回数
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-foreground">{data.today.totalEntries}</p>
					</CardContent>
				</Card>
			</div>

			{Object.keys(data.today.byPerspective).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">本日の視点別内訳</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="grid gap-2 sm:grid-cols-2">
							{Object.entries(data.today.byPerspective).map(([perspective, value]) => (
								<li
									key={perspective}
									className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
								>
									<span className="text-sm font-medium capitalize text-foreground">
										{perspective}
									</span>
									<span className="text-xs text-muted-foreground">
										{value.totalTokens.toLocaleString()} tokens / ${value.costUsd.toFixed(4)}
									</span>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			<TokenConsumptionChart summaries={data.last30Days} />

			<TokenLedgerTable entries={data.todayEntries} />
		</div>
	);
}
