import { ExecutePrReviewUseCase } from '../../application/usecases/execute-pr-review.usecase';
import type { AiGateway } from '../../domain/gateways/ai.gateway';
import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import { ReviewEngineService } from '../../domain/services/review-engine.service';
import { AnthropicAiGateway } from '../../infrastructure/adapters/anthropic-ai.adapter';
import { GitHubApiAdapter } from '../../infrastructure/adapters/github-api.adapter';
import { StubAiGateway } from '../../infrastructure/adapters/stub-ai.adapter';
import { StubGitHubApiAdapter } from '../../infrastructure/adapters/stub-github-api.adapter';
import { PrismaBudgetRepository } from '../../infrastructure/repositories/prisma-budget.repository';
import { PrismaReviewCommentRepository } from '../../infrastructure/repositories/prisma-review-comment.repository';

function createAiGateway(): AiGateway {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (apiKey) {
		return new AnthropicAiGateway(apiKey);
	}
	return new StubAiGateway();
}

function createGitHubApiGateway(): GitHubApiGateway {
	const token = process.env.GITHUB_TOKEN;
	if (token) {
		return new GitHubApiAdapter(token);
	}
	return new StubGitHubApiAdapter();
}

export const reviewCommentRepository = new PrismaReviewCommentRepository();
export const budgetRepository = new PrismaBudgetRepository();
export const gitHubApiGateway = createGitHubApiGateway();

const aiGateway = createAiGateway();
const reviewEngineService = new ReviewEngineService();
export const executeReviewUseCase = new ExecutePrReviewUseCase(
	aiGateway,
	gitHubApiGateway,
	reviewCommentRepository,
	budgetRepository,
	reviewEngineService,
);
