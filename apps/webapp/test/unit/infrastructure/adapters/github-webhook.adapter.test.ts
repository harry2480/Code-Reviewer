import { createHmac } from 'node:crypto';
import { GitHubWebhookAdapter } from '@/backend/infrastructure/adapters/github-webhook.adapter';
import { describe, expect, it } from 'vitest';

function sign(secret: string, body: string): string {
	return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('GitHubWebhookAdapter', () => {
	const secret = 'super-secret-test-value';
	const body = '{"action":"opened","number":1}';

	it('正しい署名を検証成功する', () => {
		const adapter = new GitHubWebhookAdapter(secret);
		expect(adapter.verifySignature(body, sign(secret, body))).toBe(true);
	});

	it('間違った署名は検証失敗', () => {
		const adapter = new GitHubWebhookAdapter(secret);
		expect(adapter.verifySignature(body, sign('different-secret', body))).toBe(false);
	});

	it('プレフィックスがない署名は検証失敗', () => {
		const adapter = new GitHubWebhookAdapter(secret);
		const expected = createHmac('sha256', secret).update(body).digest('hex');
		expect(adapter.verifySignature(body, expected)).toBe(false);
	});

	it('null 署名は検証失敗', () => {
		const adapter = new GitHubWebhookAdapter(secret);
		expect(adapter.verifySignature(body, null)).toBe(false);
	});

	it('長さが異なる署名は検証失敗', () => {
		const adapter = new GitHubWebhookAdapter(secret);
		expect(adapter.verifySignature(body, 'sha256=tooshort')).toBe(false);
	});

	it('Body が改ざんされたら検証失敗', () => {
		const adapter = new GitHubWebhookAdapter(secret);
		const sig = sign(secret, body);
		expect(adapter.verifySignature(`${body}-tampered`, sig)).toBe(false);
	});
});
