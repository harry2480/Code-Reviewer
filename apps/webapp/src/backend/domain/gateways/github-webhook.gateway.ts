export type GitHubWebhookEventType = 'pull_request' | 'check_run' | 'pull_request_review' | 'ping';

export interface GitHubPullRequestPayload {
	action: string;
	number: number;
	pull_request: {
		title: string;
		body: string | null;
		head: { sha: string; ref: string };
		base: { ref: string };
	};
	repository: {
		name: string;
		owner: { login: string };
	};
	installation?: { id: number };
}

export interface GitHubCheckRunPayload {
	action: string;
	check_run: {
		status: string;
		conclusion: string | null;
		head_sha: string;
		pull_requests: Array<{ number: number; head: { sha: string }; base: { sha: string } }>;
	};
	repository: {
		name: string;
		owner: { login: string };
	};
	installation?: { id: number };
}

export type GitHubWebhookPayload = GitHubPullRequestPayload | GitHubCheckRunPayload;

export interface GitHubWebhookGateway {
	verifySignature(rawBody: string, signature: string | null): boolean;
}
