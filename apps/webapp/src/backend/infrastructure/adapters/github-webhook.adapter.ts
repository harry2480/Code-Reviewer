import { createHmac, timingSafeEqual } from 'node:crypto';
import type { GitHubWebhookGateway } from '../../domain/gateways/github-webhook.gateway';

export class GitHubWebhookAdapter implements GitHubWebhookGateway {
	constructor(private readonly secret: string) {}

	verifySignature(rawBody: string, signature: string | null): boolean {
		if (!signature) return false;
		if (!signature.startsWith('sha256=')) return false;

		const expected = `sha256=${createHmac('sha256', this.secret).update(rawBody).digest('hex')}`;
		const expectedBuf = Buffer.from(expected);
		const actualBuf = Buffer.from(signature);
		if (expectedBuf.length !== actualBuf.length) return false;
		return timingSafeEqual(expectedBuf, actualBuf);
	}
}

export class StubGitHubWebhookAdapter implements GitHubWebhookGateway {
	verifySignature(_rawBody: string, _signature: string | null): boolean {
		return true;
	}
}
