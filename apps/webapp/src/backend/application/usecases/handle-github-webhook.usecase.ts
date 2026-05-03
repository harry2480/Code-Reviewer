import type { ChecksApiGateway } from '../../domain/gateways/checks-api.gateway';
import type {
	GitHubCheckRunPayload,
	GitHubPullRequestPayload,
	GitHubWebhookEventType,
	GitHubWebhookGateway,
} from '../../domain/gateways/github-webhook.gateway';
import type { QueueServiceGateway } from '../../domain/gateways/queue-service.gateway';
import type { Result } from '../../domain/models/result.model';

export type WebhookHandleResult =
	| { kind: 'enqueued'; checkRunId: number }
	| { kind: 'ignored'; reason: string };

export type WebhookError =
	| 'INVALID_SIGNATURE'
	| 'UNSUPPORTED_EVENT'
	| 'INVALID_PAYLOAD'
	| 'CHECK_RUN_FAILED'
	| 'ENQUEUE_FAILED';

export interface HandleWebhookInput {
	rawBody: string;
	signature: string | null;
	eventType: string;
	parsedPayload: unknown;
}

const TRIGGER_PR_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

export class HandleGitHubWebhookUseCase {
	constructor(
		private readonly webhookGateway: GitHubWebhookGateway,
		private readonly checksApi: ChecksApiGateway,
		private readonly queue: QueueServiceGateway,
	) {}

	async execute(input: HandleWebhookInput): Promise<Result<WebhookHandleResult, WebhookError>> {
		if (!this.webhookGateway.verifySignature(input.rawBody, input.signature)) {
			return { success: false, error: 'INVALID_SIGNATURE' };
		}

		const eventType = input.eventType as GitHubWebhookEventType;

		if (eventType === 'ping') {
			return { success: true, value: { kind: 'ignored', reason: 'ping' } };
		}

		if (eventType === 'pull_request') {
			return this.handlePullRequest(input.parsedPayload);
		}

		if (eventType === 'check_run') {
			return this.handleCheckRun(input.parsedPayload);
		}

		return { success: true, value: { kind: 'ignored', reason: `unsupported_event:${eventType}` } };
	}

	private async handlePullRequest(
		payload: unknown,
	): Promise<Result<WebhookHandleResult, WebhookError>> {
		const pr = payload as GitHubPullRequestPayload;
		if (!pr || typeof pr !== 'object' || !pr.pull_request || !pr.repository) {
			return { success: false, error: 'INVALID_PAYLOAD' };
		}

		if (!TRIGGER_PR_ACTIONS.has(pr.action)) {
			return { success: true, value: { kind: 'ignored', reason: `pr_action:${pr.action}` } };
		}

		return this.startReviewFlow({
			owner: pr.repository.owner.login,
			repo: pr.repository.name,
			prNumber: pr.number,
			headSha: pr.pull_request.head.sha,
			installationId: pr.installation?.id,
		});
	}

	private async handleCheckRun(
		payload: unknown,
	): Promise<Result<WebhookHandleResult, WebhookError>> {
		const cr = payload as GitHubCheckRunPayload;
		if (!cr || typeof cr !== 'object' || !cr.check_run || !cr.repository) {
			return { success: false, error: 'INVALID_PAYLOAD' };
		}

		const isCompleted = cr.check_run.status === 'completed';
		const isSuccess = cr.check_run.conclusion === 'success';
		if (!isCompleted || !isSuccess) {
			return {
				success: true,
				value: { kind: 'ignored', reason: `check_run:${cr.check_run.status}` },
			};
		}

		const linkedPr = cr.check_run.pull_requests[0];
		if (!linkedPr) {
			return { success: true, value: { kind: 'ignored', reason: 'check_run_no_pr' } };
		}

		return this.startReviewFlow({
			owner: cr.repository.owner.login,
			repo: cr.repository.name,
			prNumber: linkedPr.number,
			headSha: cr.check_run.head_sha,
			installationId: cr.installation?.id,
		});
	}

	private async startReviewFlow(params: {
		owner: string;
		repo: string;
		prNumber: number;
		headSha: string;
		installationId?: number;
	}): Promise<Result<WebhookHandleResult, WebhookError>> {
		let checkRunId: number;
		try {
			const checkRun = await this.checksApi.createCheckRun({
				owner: params.owner,
				repo: params.repo,
				headSha: params.headSha,
				name: 'AI Review',
				status: 'queued',
				output: {
					title: 'AI Review queued',
					summary: 'Review will start shortly.',
				},
			});
			checkRunId = checkRun.id;
		} catch (err) {
			console.error('Failed to create check run', err);
			return { success: false, error: 'CHECK_RUN_FAILED' };
		}

		try {
			await this.queue.enqueueReview({
				owner: params.owner,
				repo: params.repo,
				prNumber: params.prNumber,
				headSha: params.headSha,
				checkRunId,
				installationId: params.installationId,
			});
		} catch (err) {
			console.error('Failed to enqueue review', err);
			return { success: false, error: 'ENQUEUE_FAILED' };
		}

		return { success: true, value: { kind: 'enqueued', checkRunId } };
	}
}
