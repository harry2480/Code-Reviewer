import { ExecutePrReviewUseCase } from '../../application/usecases/execute-pr-review.usecase';
import { LogTokenConsumptionUseCase } from '../../application/usecases/log-token-consumption.usecase';
import type { AiRouter } from '../../domain/gateways/ai-router.gateway';
import type { AiGateway } from '../../domain/gateways/ai.gateway';
import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import type { TokenLedgerGateway } from '../../domain/gateways/token-ledger.gateway';
import { BudgetManagerService } from '../../domain/services/budget-manager.service';
import { PolyglotExpertService } from '../../domain/services/polyglot-expert.service';
import { ReviewEngineService } from '../../domain/services/review-engine.service';
import { AnthropicAiGateway } from '../../infrastructure/adapters/anthropic-ai.adapter';
import { FallbackAiGateway } from '../../infrastructure/adapters/fallback-ai.adapter';
import { GitHubApiAdapter } from '../../infrastructure/adapters/github-api.adapter';
import { InMemoryTokenLedgerAdapter } from '../../infrastructure/adapters/in-memory-token-ledger.adapter';
import { OpenRouterAiGateway } from '../../infrastructure/adapters/openrouter-ai.adapter';
import { PerspectiveAiRouter } from '../../infrastructure/adapters/perspective-ai-router.adapter';
import { StubAiGateway } from '../../infrastructure/adapters/stub-ai.adapter';
import { StubGitHubApiAdapter } from '../../infrastructure/adapters/stub-github-api.adapter';
import { UpstashRedisTokenLedgerAdapter } from '../../infrastructure/adapters/upstash-redis-token-ledger.adapter';
import { PrismaBudgetRepository } from '../../infrastructure/repositories/prisma-budget.repository';
import { PrismaReviewCommentRepository } from '../../infrastructure/repositories/prisma-review-comment.repository';

const TIER2_MODEL = 'qwen/qwen-2.5-7b-instruct';
const TIER3_MODEL = 'claude-sonnet-4-6';

const PERSPECTIVE_TIER1: Record<'logic' | 'security' | 'efficiency' | 'readability', string> = {
	logic: 'qwen/qwen3-coder-480b-a22b:free',
	security: 'deepseek/deepseek-r1:free',
	efficiency: 'meta-llama/llama-3.3-70b-instruct:free',
	readability: 'google/gemma-3-12b-it:free',
};

/**
 * 3段階エスカレーション AiRouter を構築する。
 *
 * - Tier 1: OpenRouter 無料モデル (perspective 別最適化)
 * - Tier 2: OpenRouter 格安モデル (Qwen 2.5 7B)
 * - Tier 3: Anthropic Claude Sonnet (高精度フォールバック)
 *
 * 429 エラー時は次の tier に自動フォールバック。
 * OPENROUTER_API_KEY が無ければ全 perspective で Tier 3 (or Stub) に直行。
 */
function createAiRouter(): { router: AiRouter; modelLabel: string } {
	const openrouterKey = process.env.OPENROUTER_API_KEY;
	const anthropicKey = process.env.ANTHROPIC_API_KEY;

	const tier3: AiGateway = anthropicKey
		? new AnthropicAiGateway(anthropicKey, TIER3_MODEL)
		: new StubAiGateway();

	const tier2: AiGateway = openrouterKey
		? new OpenRouterAiGateway(openrouterKey, TIER2_MODEL)
		: tier3;

	const buildChain = (freeModel: string): AiGateway => {
		if (!openrouterKey) return tier3;
		return new FallbackAiGateway([new OpenRouterAiGateway(openrouterKey, freeModel), tier2, tier3]);
	};

	const router = new PerspectiveAiRouter({
		logic: buildChain(PERSPECTIVE_TIER1.logic),
		security: buildChain(PERSPECTIVE_TIER1.security),
		efficiency: buildChain(PERSPECTIVE_TIER1.efficiency),
		readability: buildChain(PERSPECTIVE_TIER1.readability),
	});

	const modelLabel = openrouterKey ? PERSPECTIVE_TIER1.logic : anthropicKey ? TIER3_MODEL : 'stub';
	return { router, modelLabel };
}

function createGitHubApiGateway(): GitHubApiGateway {
	const token = process.env.GITHUB_TOKEN;
	if (token) {
		return new GitHubApiAdapter(token);
	}
	return new StubGitHubApiAdapter();
}

function createTokenLedgerGateway(): TokenLedgerGateway {
	return UpstashRedisTokenLedgerAdapter.fromEnv() ?? new InMemoryTokenLedgerAdapter();
}

export const reviewCommentRepository = new PrismaReviewCommentRepository();
export const budgetRepository = new PrismaBudgetRepository();
export const gitHubApiGateway = createGitHubApiGateway();
export const tokenLedgerGateway = createTokenLedgerGateway();

const { router: aiRouter, modelLabel } = createAiRouter();
const reviewEngineService = new ReviewEngineService();
const polyglotExpertService = new PolyglotExpertService();
const budgetManagerService = new BudgetManagerService();
export const logTokenConsumptionUseCase = new LogTokenConsumptionUseCase(
	tokenLedgerGateway,
	budgetRepository,
	budgetManagerService,
	() => crypto.randomUUID(),
);

export const executeReviewUseCase = new ExecutePrReviewUseCase(
	aiRouter,
	gitHubApiGateway,
	reviewCommentRepository,
	budgetRepository,
	reviewEngineService,
	polyglotExpertService,
	budgetManagerService,
	logTokenConsumptionUseCase,
	modelLabel,
);
