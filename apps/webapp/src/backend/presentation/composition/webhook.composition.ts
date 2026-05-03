import { HandleGitHubWebhookUseCase } from '../../application/usecases/handle-github-webhook.usecase';
import { ProcessReviewQueueUseCase } from '../../application/usecases/process-review-queue.usecase';
import type { ChecksApiGateway } from '../../domain/gateways/checks-api.gateway';
import type { GitHubWebhookGateway } from '../../domain/gateways/github-webhook.gateway';
import type { QueueServiceGateway } from '../../domain/gateways/queue-service.gateway';
import {
	GitHubChecksApiAdapter,
	StubChecksApiAdapter,
} from '../../infrastructure/adapters/github-checks-api.adapter';
import {
	GitHubWebhookAdapter,
	StubGitHubWebhookAdapter,
} from '../../infrastructure/adapters/github-webhook.adapter';
import {
	StubQueueAdapter,
	UpstashQStashAdapter,
} from '../../infrastructure/adapters/upstash-qstash.adapter';
import { executeReviewUseCase } from './review.composition';

function createWebhookGateway(): GitHubWebhookGateway {
	const secret = process.env.GITHUB_WEBHOOK_SECRET;
	if (secret) return new GitHubWebhookAdapter(secret);
	return new StubGitHubWebhookAdapter();
}

function createChecksApiGateway(): ChecksApiGateway {
	const token = process.env.GITHUB_TOKEN;
	if (token) return new GitHubChecksApiAdapter(token);
	return new StubChecksApiAdapter();
}

async function createQueueGateway(): Promise<QueueServiceGateway> {
	const token = process.env.UPSTASH_QSTASH_TOKEN;
	const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
	const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
	const destination = process.env.QSTASH_DESTINATION_URL;

	if (!token || !signingKey || !destination) {
		return new StubQueueAdapter();
	}

	try {
		const moduleName = '@upstash/qstash';
		const qstash = (await import(/* @vite-ignore */ moduleName)) as {
			Client: new (opts: { token: string }) => unknown;
			Receiver: new (opts: { currentSigningKey: string; nextSigningKey: string }) => unknown;
		};
		const client = new qstash.Client({ token });
		const receiver = new qstash.Receiver({
			currentSigningKey: signingKey,
			nextSigningKey: nextSigningKey ?? signingKey,
		});

		return new UpstashQStashAdapter(
			client as ConstructorParameters<typeof UpstashQStashAdapter>[0],
			receiver as ConstructorParameters<typeof UpstashQStashAdapter>[1],
			destination,
		);
	} catch (err) {
		console.error('Failed to load @upstash/qstash; falling back to stub queue', err);
		return new StubQueueAdapter();
	}
}

let cachedHandleWebhook: HandleGitHubWebhookUseCase | null = null;
let cachedProcessQueue: ProcessReviewQueueUseCase | null = null;

export async function getHandleGitHubWebhookUseCase(): Promise<HandleGitHubWebhookUseCase> {
	if (!cachedHandleWebhook) {
		const queue = await createQueueGateway();
		cachedHandleWebhook = new HandleGitHubWebhookUseCase(
			createWebhookGateway(),
			createChecksApiGateway(),
			queue,
		);
	}
	return cachedHandleWebhook;
}

export async function getProcessReviewQueueUseCase(): Promise<ProcessReviewQueueUseCase> {
	if (!cachedProcessQueue) {
		const queue = await createQueueGateway();
		cachedProcessQueue = new ProcessReviewQueueUseCase(
			executeReviewUseCase,
			createChecksApiGateway(),
			queue,
		);
	}
	return cachedProcessQueue;
}
