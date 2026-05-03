import { ExecutePrReviewUseCase } from '../../application/usecases/execute-pr-review.usecase';
import { LogTokenConsumptionUseCase } from '../../application/usecases/log-token-consumption.usecase';
import type { AiGateway } from '../../domain/gateways/ai.gateway';
import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import type { TokenLedgerGateway } from '../../domain/gateways/token-ledger.gateway';
import { BudgetManagerService } from '../../domain/services/budget-manager.service';
import { PolyglotExpertService } from '../../domain/services/polyglot-expert.service';
import { ReviewEngineService } from '../../domain/services/review-engine.service';
import { AnthropicAiGateway } from '../../infrastructure/adapters/anthropic-ai.adapter';
import { GitHubApiAdapter } from '../../infrastructure/adapters/github-api.adapter';
import { InMemoryTokenLedgerAdapter } from '../../infrastructure/adapters/in-memory-token-ledger.adapter';
import { StubAiGateway } from '../../infrastructure/adapters/stub-ai.adapter';
import { StubGitHubApiAdapter } from '../../infrastructure/adapters/stub-github-api.adapter';
import { UpstashRedisTokenLedgerAdapter } from '../../infrastructure/adapters/upstash-redis-token-ledger.adapter';
import { PrismaBudgetRepository } from '../../infrastructure/repositories/prisma-budget.repository';
import { PrismaReviewCommentRepository } from '../../infrastructure/repositories/prisma-review-comment.repository';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

function createAiGateway(): { gateway: AiGateway; model: string } {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
	if (apiKey) {
		return { gateway: new AnthropicAiGateway(apiKey, model), model };
	}
	return { gateway: new StubAiGateway(), model: 'stub' };
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

const { gateway: aiGateway, model: modelName } = createAiGateway();
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
	aiGateway,
	gitHubApiGateway,
	reviewCommentRepository,
	budgetRepository,
	reviewEngineService,
	polyglotExpertService,
	budgetManagerService,
	logTokenConsumptionUseCase,
	modelName,
);
