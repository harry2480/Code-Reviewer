import {
	type QStashClient,
	type QStashReceiver,
	UpstashQStashAdapter,
} from '@/backend/infrastructure/adapters/upstash-qstash.adapter';
import { describe, expect, it, vi } from 'vitest';

function createClient(): QStashClient {
	return {
		publishJSON: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
	};
}

function createReceiver(verified = true): QStashReceiver {
	return { verify: vi.fn().mockResolvedValue(verified) };
}

describe('UpstashQStashAdapter', () => {
	it('publishJSON を destinationUrl + retries=3 で呼び出す', async () => {
		const client = createClient();
		const adapter = new UpstashQStashAdapter(client, createReceiver(), 'https://app.example/api');

		await adapter.enqueueReview({
			owner: 'o',
			repo: 'r',
			prNumber: 1,
			headSha: 'abc',
			checkRunId: 100,
		});

		expect(client.publishJSON).toHaveBeenCalledWith({
			url: 'https://app.example/api',
			body: {
				owner: 'o',
				repo: 'r',
				prNumber: 1,
				headSha: 'abc',
				checkRunId: 100,
			},
			retries: 3,
		});
	});

	it('signature が null なら false を返す', async () => {
		const adapter = new UpstashQStashAdapter(
			createClient(),
			createReceiver(),
			'https://app.example/api',
		);
		expect(await adapter.verifyMessageSignature('{}', null)).toBe(false);
	});

	it('receiver.verify が true なら true', async () => {
		const adapter = new UpstashQStashAdapter(
			createClient(),
			createReceiver(true),
			'https://app.example/api',
		);
		expect(await adapter.verifyMessageSignature('{}', 'sig')).toBe(true);
	});

	it('receiver.verify が throw した場合 false を返す', async () => {
		const receiver: QStashReceiver = {
			verify: vi.fn().mockRejectedValue(new Error('invalid')),
		};
		const adapter = new UpstashQStashAdapter(createClient(), receiver, 'https://app.example/api');
		expect(await adapter.verifyMessageSignature('{}', 'sig')).toBe(false);
	});
});
