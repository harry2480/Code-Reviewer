import type { PullRequestContext } from '../models/pull-request-context.model';

export type { CallerReference, PullRequestContext } from '../models/pull-request-context.model';

export interface ContextExtractorGateway {
	extractPullRequestContext(params: {
		owner: string;
		repo: string;
		prNumber: number;
		diff: string;
	}): Promise<PullRequestContext>;
}
