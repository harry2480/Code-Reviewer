import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/frontend/components/ui/pagination';

function buildHref(page: number, language?: string, status?: string): string {
	const params = new URLSearchParams();
	if (page > 1) params.set('page', String(page));
	if (language && language !== 'all') params.set('language', language);
	if (status && status !== 'all') params.set('status', status);
	const qs = params.toString();
	return qs ? `/review-history?${qs}` : '/review-history';
}

export function ReviewHistoryPagination({
	page,
	totalPages,
	language,
	status,
}: {
	page: number;
	totalPages: number;
	language: string;
	status: string;
}) {
	if (totalPages <= 1) return null;

	const prevPage = Math.max(1, page - 1);
	const nextPage = Math.min(totalPages, page + 1);
	const windowStart = Math.max(1, page - 2);
	const windowEnd = Math.min(totalPages, page + 2);
	const pageNumbers: number[] = [];
	for (let p = windowStart; p <= windowEnd; p += 1) pageNumbers.push(p);

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href={buildHref(prevPage, language, status)} />
				</PaginationItem>
				{pageNumbers.map((p) => (
					<PaginationItem key={p}>
						<PaginationLink href={buildHref(p, language, status)} isActive={p === page}>
							{p}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext href={buildHref(nextPage, language, status)} />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
