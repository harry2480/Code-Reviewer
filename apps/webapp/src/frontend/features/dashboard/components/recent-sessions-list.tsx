import type { DashboardSessionSummary } from '@/backend/presentation/loaders/dashboard.loader';
import { Badge } from '@/frontend/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import Link from 'next/link';

const STATUS_VARIANT: Record<string, 'default' | 'warn' | 'error' | 'outline'> = {
	success: 'default',
	skipped: 'outline',
	failed: 'error',
};

function formatRelativeJa(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' });
}

export function RecentSessionsList({ sessions }: { sessions: DashboardSessionSummary[] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">直近のレビュー</CardTitle>
			</CardHeader>
			<CardContent>
				{sessions.length === 0 ? (
					<p className="text-sm text-muted-foreground">まだレビュー履歴はありません。</p>
				) : (
					<ul className="space-y-3">
						{sessions.map((s) => (
							<li
								key={s.id}
								className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0"
							>
								<div className="flex items-center gap-2">
									<Badge variant={STATUS_VARIANT[s.status] ?? 'outline'}>{s.status}</Badge>
									<Link
										href={`/review-history/${s.id}`}
										className="text-sm font-medium text-foreground hover:underline truncate"
									>
										{s.prTitle}
									</Link>
								</div>
								<div className="flex items-center gap-3 text-xs text-muted-foreground">
									<span>
										{s.owner}/{s.repo}#{s.prNumber}
									</span>
									<span>{formatRelativeJa(s.createdAt)}</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
