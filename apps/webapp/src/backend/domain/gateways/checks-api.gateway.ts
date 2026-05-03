export type CheckRunStatus = 'queued' | 'in_progress' | 'completed';
export type CheckRunConclusion = 'success' | 'failure' | 'skipped' | 'timed_out' | 'neutral';

export interface CreateCheckRunParams {
	owner: string;
	repo: string;
	headSha: string;
	name: string;
	status: CheckRunStatus;
	output?: {
		title: string;
		summary: string;
	};
}

export interface UpdateCheckRunParams {
	owner: string;
	repo: string;
	checkRunId: number;
	status: CheckRunStatus;
	conclusion?: CheckRunConclusion;
	output?: {
		title: string;
		summary: string;
	};
}

export interface ChecksApiGateway {
	createCheckRun(params: CreateCheckRunParams): Promise<{ id: number }>;
	updateCheckRun(params: UpdateCheckRunParams): Promise<void>;
}
