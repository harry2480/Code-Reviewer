import type {
	ContextExtractorGateway,
	PullRequestContext,
} from '../../domain/gateways/context-extractor.gateway';

export class StubContextExtractorAdapter implements ContextExtractorGateway {
	async extractPullRequestContext(_params: {
		owner: string;
		repo: string;
		prNumber: number;
		diff: string;
	}): Promise<PullRequestContext> {
		return {
			recentCommitMessages: ['feat: stub commit'],
			callerReferences: [],
		};
	}
}
