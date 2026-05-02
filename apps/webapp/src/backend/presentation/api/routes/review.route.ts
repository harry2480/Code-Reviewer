import { Hono } from 'hono';

const reviewRoute = new Hono();

reviewRoute.post('/', async (c) => {
	// Phase 2 で ReviewEngine UseCase を呼び出す
	return c.json({ message: 'Review endpoint — not yet implemented' }, 501);
});

export { reviewRoute };
