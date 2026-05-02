import type { ReviewHistoryRow } from '@/backend/presentation/loaders/review-history.loader';
import { Badge } from '@/frontend/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/frontend/components/ui/table';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { ScoreBadges } from './score-badges';

const STATUS_VARIANT: Record<string, 'default' | 'warn' | 'error' | 'outline'> = {
	success: 'default',
	skipped: 'outline',
	failed: 'error',
};

function formatJa(iso: string): string {
	return new Date(iso).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' });
}

export function ReviewHistoryTable({ rows }: { rows: ReviewHistoryRow[] }) {
	if (rows.length === 0) {
		return (
			<div className="rounded-card border border-dashed p-8 text-center text-sm text-muted-foreground">
				該当するレビュー履歴はありません。
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>PR</TableHead>
					<TableHead>言語</TableHead>
					<TableHead>ステータス</TableHead>
					<TableHead>スコア</TableHead>
					<TableHead>実行時刻</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.id}>
						<TableCell className="max-w-[280px]">
							<div className="flex flex-col gap-1">
								<Link
									href={`/review-history/${row.id}`}
									className="font-medium text-foreground hover:underline truncate"
								>
									{row.prTitle}
								</Link>
								<a
									href={row.prUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
								>
									{row.owner}/{row.repo}#{row.prNumber}
									<ExternalLink className="h-3 w-3" />
								</a>
							</div>
						</TableCell>
						<TableCell>
							<div className="flex flex-wrap gap-1">
								{row.detectedLanguages.map((lang) => (
									<Badge key={lang} variant="secondary" className="text-xs">
										{lang}
									</Badge>
								))}
							</div>
						</TableCell>
						<TableCell>
							<Badge variant={STATUS_VARIANT[row.status] ?? 'outline'}>{row.status}</Badge>
						</TableCell>
						<TableCell>
							<ScoreBadges scores={row.scores} />
						</TableCell>
						<TableCell className="text-sm text-muted-foreground">
							{formatJa(row.createdAt)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
