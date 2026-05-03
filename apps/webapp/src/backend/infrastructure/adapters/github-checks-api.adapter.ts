import { Octokit } from '@octokit/rest';
import type {
	ChecksApiGateway,
	CreateCheckRunParams,
	UpdateCheckRunParams,
} from '../../domain/gateways/checks-api.gateway';

export class GitHubChecksApiAdapter implements ChecksApiGateway {
	private readonly octokit: Octokit;

	constructor(token: string) {
		this.octokit = new Octokit({ auth: token });
	}

	async createCheckRun(params: CreateCheckRunParams): Promise<{ id: number }> {
		const { data } = await this.octokit.checks.create({
			owner: params.owner,
			repo: params.repo,
			head_sha: params.headSha,
			name: params.name,
			status: params.status,
			output: params.output,
		});
		return { id: data.id };
	}

	async updateCheckRun(params: UpdateCheckRunParams): Promise<void> {
		await this.octokit.checks.update({
			owner: params.owner,
			repo: params.repo,
			check_run_id: params.checkRunId,
			status: params.status,
			conclusion: params.conclusion,
			output: params.output,
		});
	}
}

export class StubChecksApiAdapter implements ChecksApiGateway {
	private nextId = 1;

	async createCheckRun(_params: CreateCheckRunParams): Promise<{ id: number }> {
		return { id: this.nextId++ };
	}

	async updateCheckRun(_params: UpdateCheckRunParams): Promise<void> {
		// no-op
	}
}
