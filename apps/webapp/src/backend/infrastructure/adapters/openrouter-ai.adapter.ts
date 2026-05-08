import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import type { AiGateway, AiGenerateResult } from '../../domain/gateways/ai.gateway';

/**
 * OpenRouter (https://openrouter.ai) を介して任意のモデルにアクセスする AiGateway 実装。
 * 無料モデル (`*:free` サフィックス) を使うことでコストゼロでの運用が可能。
 */
export class OpenRouterAiGateway implements AiGateway {
	private readonly provider: ReturnType<typeof createOpenRouter>;

	constructor(
		private readonly apiKey: string,
		private readonly model: string,
	) {
		this.provider = createOpenRouter({ apiKey });
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
