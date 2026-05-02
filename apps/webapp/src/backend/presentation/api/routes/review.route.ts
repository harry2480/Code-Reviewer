import { Hono } from 'hono';
import { executeReviewUseCase } from '../../composition/review.composition';

const reviewRoute = new Hono();

reviewRoute.post('/', async (c) => {
	const { owner, repo, prNumber } = await c.req.json<{
		owner: string;
		repo: string;
		prNumber: number;
	}>();

	try {
		await executeReviewUseCase.execute(owner, repo, prNumber);
		return c.json({ success: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Internal server error';
		return c.json({ error: message }, 500);
	}
});

export { reviewRoute };
