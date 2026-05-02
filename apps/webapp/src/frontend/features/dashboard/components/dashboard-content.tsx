import type { DashboardLoaderResult } from '@/backend/presentation/loaders/dashboard.loader';
import { Badge } from '@/frontend/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Activity, ShieldAlert } from 'lucide-react';
import { BudgetProgress } from './budget-progress';
import { ConnectionBadge } from './connection-badge';
import { RecentSessionsList } from './recent-sessions-list';
import { StatsCard } from './stats-card';

export function DashboardContent({ data }: { data: DashboardLoaderResult }) {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground">ダッシュボード</h1>
					<p className="text-sm text-muted-foreground">
						AI レビューの稼働状況・本日の統計・予算消費を表示します。
					</p>
				</div>
				<ConnectionBadge connected={data.githubAppConnected} />
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<StatsCard
					title="本日のレビュー数"
					icon={Activity}
					value={data.todayReviewCount}
					description="本日 00:00 (UTC) 以降に開始されたレビュー"
				/>
				<StatsCard
					title="本日のセキュリティ検出数"
					icon={ShieldAlert}
					value={data.todaySecurityFindings}
					description="security 視点で発火した指摘の合計"
				/>
				<BudgetProgress budget={data.budget} />
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">対応言語</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						{data.supportedLanguages.map((lang) => (
							<Badge key={lang} variant="secondary">
								{lang}
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>

			<RecentSessionsList sessions={data.recentSessions} />
		</div>
	);
}
