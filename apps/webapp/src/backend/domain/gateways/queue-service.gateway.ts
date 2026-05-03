export interface ReviewQueueMessage {
	owner: string;
	repo: string;
	prNumber: number;
	headSha: string;
	checkRunId: number;
	installationId?: number;
}

export interface QueueServiceGateway {
	enqueueReview(message: ReviewQueueMessage): Promise<void>;
	verifyMessageSignature(rawBody: string, signature: string | null): Promise<boolean>;
}
