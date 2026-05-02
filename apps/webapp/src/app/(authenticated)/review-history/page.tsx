import { reviewHistoryLoader } from '@/backend/presentation/loaders/review-history.loader';
import { parseLanguage, parseStatus } from '@/backend/presentation/types/review-frontend.types';
import { ReviewHistoryFilters } from '@/frontend/features/review-history/components/review-history-filters';
import { ReviewHistoryPagination } from '@/frontend/features/review-history/components/review-history-pagination';
import { ReviewHistoryTable } from '@/frontend/features/review-history/components/review-history-table';

function parsePage(raw: string | string[] | undefined): number {
	if (typeof raw !== 'string') return 1;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function ReviewHistoryPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	const language = parseLanguage(params.language);
	const status = parseStatus(params.status);
	const page = parsePage(params.page);

	const data = await reviewHistoryLoader({ page, language, status });

	return (
		<div className="space-y-5">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold text-foreground">レビュー履歴</h1>
				<p className="text-sm text-muted-foreground">
					過去に実行された AI レビューの結果を一覧で確認できます。
				</p>
			</div>

			<div className="flex items-center justify-between gap-4 flex-wrap">
				<ReviewHistoryFilters language={language ?? 'all'} status={status ?? 'all'} />
				<span className="text-sm text-muted-foreground">全 {data.total} 件</span>
			</div>

			<ReviewHistoryTable rows={data.rows} />

			<ReviewHistoryPagination
				page={data.page}
				totalPages={data.totalPages}
				language={language ?? 'all'}
				status={status ?? 'all'}
			/>
		</div>
	);
}
