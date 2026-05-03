import { StubAiGateway } from '@/backend/infrastructure/adapters/stub-ai.adapter';
import { describe, expect, it } from 'vitest';

describe('StubAiGateway', () => {
	it('デフォルト固定応答を返す', async () => {
		const gateway = new StubAiGateway();
		const result = await gateway.generate({
			systemPrompt: 'sys',
			userPrompt: 'user',
			maxTokens: 100,
		});
		expect(result.text).toContain('スタブのジョーク');
	});

	it('カスタム応答を返す', async () => {
		const gateway = new StubAiGateway('custom');
		const result = await gateway.generate({
			systemPrompt: 's',
			userPrompt: 'u',
			maxTokens: 100,
		});
		expect(result.text).toBe('custom');
	});

	it('入力・出力トークンを推定値で返す (4 文字 ≒ 1 トークン)', async () => {
		const gateway = new StubAiGateway('1234'); // 4 文字 → 1 トークン
		const result = await gateway.generate({
			systemPrompt: '12345678', // 8 文字
			userPrompt: '12345678', // 8 文字 + 改行
			maxTokens: 100,
		});
		expect(result.usage.outputTokens).toBe(1);
		expect(result.usage.inputTokens).toBeGreaterThan(0);
		expect(result.usage.totalTokens).toBe(result.usage.inputTokens + result.usage.outputTokens);
	});
});
