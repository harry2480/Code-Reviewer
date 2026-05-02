import { reviewSessionDetailLoader } from '@/backend/presentation/loaders/review-session-detail.loader';
import { ReviewDetailContent } from '@/frontend/features/review-history/components/review-detail-content';
import { notFound } from 'next/navigation';

export default async function ReviewSessionDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const data = await reviewSessionDetailLoader(id);
	if (!data) notFound();

	return <ReviewDetailContent data={data} />;
}
