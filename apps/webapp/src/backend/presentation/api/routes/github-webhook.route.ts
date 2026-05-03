import { Hono } from 'hono';
import {
	getHandleGitHubWebhookUseCase,
	getProcessReviewQueueUseCase,
} from '../../composition/webhook.composition';

const githubWebhookRoute = new Hono();

githubWebhookRoute.post('/webhook', async (c) => {
	const rawBody = await c.req.text();
	const signature = c.req.header('x-hub-signature-256') ?? null;
	const eventType = c.req.header('x-github-event') ?? '';

	let parsedPayload: unknown;
	try {
		parsedPayload = JSON.parse(rawBody);
	} catch {
		return c.json({ error: 'Invalid JSON payload' }, 400);
	}

	const useCase = await getHandleGitHubWebhookUseCase();
	const result = await useCase.execute({ rawBody, signature, eventType, parsedPayload });

	if (!result.success) {
		const status = result.error === 'INVALID_SIGNATURE' ? 401 : 500;
		return c.json({ error: result.error }, status);
	}

	return c.json({ ...result.value }, 202);
});

githubWebhookRoute.post('/webhook/process', async (c) => {
	const rawBody = await c.req.text();
	const signature = c.req.header('upstash-signature') ?? null;

	let parsedMessage: unknown;
	try {
		parsedMessage = JSON.parse(rawBody);
	} catch {
		return c.json({ error: 'Invalid JSON payload' }, 400);
	}

	const useCase = await getProcessReviewQueueUseCase();
	const result = await useCase.execute({ rawBody, signature, parsedMessage });

	if (!result.success) {
		const status = result.error === 'INVALID_SIGNATURE' ? 401 : 500;
		return c.json({ error: result.error }, status);
	}

	return c.json({ success: true });
});

export { githubWebhookRoute };
