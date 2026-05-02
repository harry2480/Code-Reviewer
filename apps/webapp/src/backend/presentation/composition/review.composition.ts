import type { GitHubApiGateway } from '../../domain/gateways/github-api.gateway';
import { GitHubApiAdapter } from '../../infrastructure/adapters/github-api.adapter';
import { StubGitHubApiAdapter } from '../../infrastructure/adapters/stub-github-api.adapter';
import { PrismaBudgetRepository } from '../../infrastructure/repositories/prisma-budget.repository';
import { PrismaReviewCommentRepository } from '../../infrastructure/repositories/prisma-review-comment.repository';

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
