import type { ChecksApiGateway } from '../../domain/gateways/checks-api.gateway';
import type {
	QueueServiceGateway,
	ReviewQueueMessage,
} from '../../domain/gateways/queue-service.gateway';
import type { Result } from '../../domain/models/result.model';
import type { ExecutePrReviewUseCase } from './execute-pr-review.usecase';

export type ProcessQueueError = 'INVALID_SIGNATURE' | 'INVALID_MESSAGE' | 'REVIEW_FAILED';

export interface ProcessQueueInput {
	rawBody: string;
	signature: string | null;
	parsedMessage: unknown;
}

export class ProcessReviewQueueUseCase {
	constructor(
		private readonly executePrReview: ExecutePrReviewUseCase,
		private readonly checksApi: ChecksApiGateway,
		private readonly queue: QueueServiceGateway,
	) {}

	async execute(input: ProcessQueueInput): Promise<Result<void, ProcessQueueError>> {
		const signatureValid = await this.queue.verifyMessageSignature(input.rawBody, input.signature);
		if (!signatureValid) {
			return { success: false, error: 'INVALID_SIGNATURE' };
		}

		const message = input.parsedMessage as ReviewQueueMessage;
		if (!isValidQueueMessage(message)) {
			return { success: false, error: 'INVALID_MESSAGE' };
		}

		try {
			await this.checksApi.updateCheckRun({
				owner: message.owner,
				repo: message.repo,
				checkRunId: message.checkRunId,
				status: 'in_progress',
				output: {
					title: 'AI Review in progress',
					summary: 'Reviewing pull request changes.',
				},
			});
		} catch (err) {
			console.error('Failed to update check run to in_progress', err);
		}

		try {
			await this.executePrReview.execute(message.owner, message.repo, message.prNumber);
		} catch (err) {
			console.error('Review execution failed', err);
			try {
				await this.checksApi.updateCheckRun({
					owner: message.owner,
					repo: message.repo,
					checkRunId: message.checkRunId,
					status: 'completed',
					conclusion: 'failure',
					output: {
						title: 'AI Review failed',
						summary: err instanceof Error ? err.message : 'Unknown error',
					},
				});
			} catch (updateErr) {
				console.error('Failed to update check run to failure', updateErr);
			}
			return { success: false, error: 'REVIEW_FAILED' };
		}

		try {
			await this.checksApi.updateCheckRun({
				owner: message.owner,
				repo: message.repo,
				checkRunId: message.checkRunId,
				status: 'completed',
				conclusion: 'success',
				output: {
					title: 'AI Review completed',
					summary: 'Review comments have been posted.',
				},
			});
		} catch (err) {
			console.error('Failed to update check run to success', err);
		}

		return { success: true, value: undefined };
	}
}

function isValidQueueMessage(message: unknown): message is ReviewQueueMessage {
	if (!message || typeof message !== 'object') return false;
	const m = message as Record<string, unknown>;
	return (
		typeof m.owner === 'string' &&
		typeof m.repo === 'string' &&
		typeof m.prNumber === 'number' &&
		typeof m.headSha === 'string' &&
		typeof m.checkRunId === 'number'
	);
}
