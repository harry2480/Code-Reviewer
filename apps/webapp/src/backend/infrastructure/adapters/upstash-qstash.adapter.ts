import type {
	QueueServiceGateway,
	ReviewQueueMessage,
} from '../../domain/gateways/queue-service.gateway';

export interface QStashClient {
	publishJSON(params: {
		url: string;
		body: ReviewQueueMessage;
		retries?: number;
	}): Promise<{ messageId: string }>;
}

export interface QStashReceiver {
	verify(params: { signature: string; body: string }): Promise<boolean>;
}

export class UpstashQStashAdapter implements QueueServiceGateway {
	constructor(
		private readonly client: QStashClient,
		private readonly receiver: QStashReceiver,
		private readonly destinationUrl: string,
	) {}

	async enqueueReview(message: ReviewQueueMessage): Promise<void> {
		await this.client.publishJSON({
			url: this.destinationUrl,
			body: message,
			retries: 3,
		});
	}

	async verifyMessageSignature(rawBody: string, signature: string | null): Promise<boolean> {
		if (!signature) return false;
		try {
			return await this.receiver.verify({ signature, body: rawBody });
		} catch {
			return false;
		}
	}
}

export class StubQueueAdapter implements QueueServiceGateway {
	public readonly enqueued: ReviewQueueMessage[] = [];

	async enqueueReview(message: ReviewQueueMessage): Promise<void> {
		this.enqueued.push(message);
	}

	async verifyMessageSignature(_rawBody: string, _signature: string | null): Promise<boolean> {
		return true;
	}
}
