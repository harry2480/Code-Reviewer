import { AnthropicAiGateway } from '@/backend/infrastructure/adapters/anthropic-ai.adapter';
import { describe, expect, it, vi } from 'vitest';

const mockGenerateText = vi.fn();

vi.mock('ai', () => ({
	generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: () => (model: string) => ({ modelId: model }),
}));

describe('AnthropicAiGateway', () => {
	it('generateText からの text と usage を AiGenerateResult として返す', async () => {
		mockGenerateText.mockResolvedValueOnce({
			text: 'response',
			usage: { inputTokens: 200, outputTokens: 100 },
		});
		const gateway = new AnthropicAiGateway('api-key', 'claude-haiku-4-5-20251001');

		const result = await gateway.generate({
			systemPrompt: 'sys',
			userPrompt: 'user',
			maxTokens: 1000,
		});

		expect(result.text).toBe('response');
		expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 100, totalTokens: 300 });
		expect(mockGenerateText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: 'sys',
				messages: [{ role: 'user', content: 'user' }],
				maxOutputTokens: 1000,
			}),
		);
	});

	it('usage が欠落していても 0 トークンとして扱う', async () => {
		mockGenerateText.mockResolvedValueOnce({ text: 'no-usage' });
		const gateway = new AnthropicAiGateway('api-key');

		const result = await gateway.generate({
			systemPrompt: 's',
			userPrompt: 'u',
			maxTokens: 100,
		});

		expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
	});
});
