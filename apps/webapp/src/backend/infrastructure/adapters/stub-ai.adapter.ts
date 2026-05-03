import type { AiGateway, AiGenerateResult } from '../../domain/gateways/ai.gateway';

/**
 * テスト・開発用の Stub 実装。
 * ANTHROPIC_API_KEY が未設定の場合に自動的に使用される。
 */
export class StubAiGateway implements AiGateway {
	constructor(
		private readonly fixedResponse: string = 'これはスタブのジョークです。APIキーが設定されていないときに返されます。',
	) {}

	async generate(params: {
		systemPrompt: string;
		userPrompt: string;
		maxTokens: number;
	}): Promise<AiGenerateResult> {
		const inputTokens = estimateTokens(`${params.systemPrompt}\n${params.userPrompt}`);
		const outputTokens = estimateTokens(this.fixedResponse);
		return {
			text: this.fixedResponse,
			usage: {
				inputTokens,
				outputTokens,
				totalTokens: inputTokens + outputTokens,
			},
		};
	}
}

function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}
