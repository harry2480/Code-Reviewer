import { APICallError } from 'ai';
import type { AiGateway, AiGenerateResult } from '../../domain/gateways/ai.gateway';

/**
 * 複数の AiGateway を tier として連鎖させ、429 (Rate Limit) の場合に
 * 自動で次の tier にフォールバックする。
 * 429 以外のエラーは即座に throw する。
 */
export class FallbackAiGateway implements AiGateway {
	constructor(private readonly chain: AiGateway[]) {
		if (chain.length === 0) {
			throw new Error('FallbackAiGateway requires at least one gateway');
		}
	}

	async generate(params: {
		systemPrompt: string;
		userPrompt: string;
		maxTokens: number;
	}): Promise<AiGenerateResult> {
		for (let i = 0; i < this.chain.length; i++) {
			const gateway = this.chain[i];
			try {
				return await gateway.generate(params);
			} catch (err) {
				const isRateLimit = err instanceof APICallError && err.statusCode === 429;
				const hasNext = i < this.chain.length - 1;
				if (isRateLimit && hasNext) {
					console.warn(`Rate limit hit on tier ${i + 1}, falling back to tier ${i + 2}`);
					continue;
				}
				throw err;
			}
		}
		throw new Error('All AI gateways in chain exhausted');
	}
}
