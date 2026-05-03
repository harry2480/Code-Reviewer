import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { AiGateway, AiGenerateResult } from '../../domain/gateways/ai.gateway';

/**
 * Vercel AI SDK + Anthropic provider を使用した AiGateway 実装。
 * model はコンストラクタでオプション指定可能。デフォルト: claude-haiku-4-5-20251001
 *
 * Anthropic プロンプト キャッシングを有効化:
 * 同一 system プロンプトを 5 分以内に再利用するとキャッシュヒットし、
 * 入力トークンコストが約 90% 削減される (`cache_read_input_tokens` 単価)。
 */
export class AnthropicAiGateway implements AiGateway {
	private readonly provider: ReturnType<typeof createAnthropic>;

	constructor(
		private readonly apiKey: string,
		private readonly model: string = 'claude-haiku-4-5-20251001',
		private readonly enablePromptCache: boolean = true,
	) {
		this.provider = createAnthropic({ apiKey });
	}

	async generate(params: {
		systemPrompt: string;
		userPrompt: string;
		maxTokens: number;
	}): Promise<AiGenerateResult> {
		const result = await generateText({
			model: this.provider(this.model),
			system: params.systemPrompt,
			messages: [{ role: 'user', content: params.userPrompt }],
			maxOutputTokens: params.maxTokens,
			...(this.enablePromptCache
				? {
						providerOptions: {
							anthropic: {
								// system プロンプトを ephemeral にキャッシュ (5 分 TTL)
								cacheControl: { type: 'ephemeral' },
							},
						},
					}
				: {}),
		});

		const inputTokens = result.usage?.inputTokens ?? 0;
		const outputTokens = result.usage?.outputTokens ?? 0;
		return {
			text: result.text,
			usage: {
				inputTokens,
				outputTokens,
				totalTokens: inputTokens + outputTokens,
			},
		};
	}
}
