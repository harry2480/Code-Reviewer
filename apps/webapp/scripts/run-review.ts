import { BudgetExceededError } from '../src/backend/application/usecases/execute-pr-review.usecase';
import { GitHubChecksApiAdapter } from '../src/backend/infrastructure/adapters/github-checks-api.adapter';
import { executeReviewUseCase } from '../src/backend/presentation/composition/review.composition';

async function main(): Promise<void> {
	const repository = process.env.GITHUB_REPOSITORY;
	const prNumberStr = process.env.PR_NUMBER;
	const headSha = process.env.HEAD_SHA;
	const githubToken = process.env.GITHUB_TOKEN;

	if (!repository || !prNumberStr || !headSha || !githubToken) {
		console.error(
			'Missing required env vars: GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, GITHUB_TOKEN',
		);
		process.exit(1);
	}

	const [owner, repo] = repository.split('/');
	const prNumber = Number(prNumberStr);

	if (!owner || !repo || Number.isNaN(prNumber)) {
		console.error(`Invalid GITHUB_REPOSITORY or PR_NUMBER: ${repository}, ${prNumberStr}`);
		process.exit(1);
	}

	const checksApi = new GitHubChecksApiAdapter(githubToken);
	let checkRunId: number | undefined;

	// SIGTERM ハンドラ: ジョブキャンセル / タイムアウト時に Check Run を timed_out で閉じる
	const handleSigterm = async (): Promise<void> => {
		if (checkRunId !== undefined) {
			try {
				await checksApi.updateCheckRun({
					owner,
					repo,
					checkRunId,
					status: 'completed',
					conclusion: 'timed_out',
					output: {
						title: 'AI Review cancelled',
						summary: 'Review was cancelled (superseded or timed out).',
					},
				});
			} catch (err) {
				console.error('Failed to update check run on SIGTERM:', err);
			}
		}
		process.exit(0);
	};
	process.on('SIGTERM', handleSigterm);

	try {
		const checkRun = await checksApi.createCheckRun({
			owner,
			repo,
			headSha,
			name: 'AI Review',
			status: 'in_progress',
			output: {
				title: 'AI Review in progress',
				summary: 'Reviewing pull request changes.',
			},
		});
		checkRunId = checkRun.id;
	} catch (err) {
		console.error('Failed to create check run:', err);
		process.exit(1);
	}

	let reviewSucceeded = false;
	let reviewError: unknown;
	try {
		await executeReviewUseCase.execute(owner, repo, prNumber);
		reviewSucceeded = true;
	} catch (err) {
		console.error('Review execution failed:', err);
		reviewError = err;
	}

	// レビュー本体の終了確定: SIGTERM ハンドラを解除して二重更新を防ぐ
	const finalCheckRunId = checkRunId;
	checkRunId = undefined;
	process.removeListener('SIGTERM', handleSigterm);

	if (reviewSucceeded) {
		// 成功時の Check Run 更新は独立した try/catch で囲み、API 失敗で全体を落とさない
		try {
			await checksApi.updateCheckRun({
				owner,
				repo,
				checkRunId: finalCheckRunId,
				status: 'completed',
				conclusion: 'success',
				output: {
					title: 'AI Review completed',
					summary: 'Review comments have been posted.',
				},
			});
		} catch (updateErr) {
			console.error('Failed to update check run on success:', updateErr);
		}
		return;
	}

	const isBudget = reviewError instanceof BudgetExceededError;
	try {
		await checksApi.updateCheckRun({
			owner,
			repo,
			checkRunId: finalCheckRunId,
			status: 'completed',
			conclusion: isBudget ? 'neutral' : 'failure',
			output: {
				title: isBudget ? 'AI Review skipped: Budget Exceeded' : 'AI Review failed',
				summary: reviewError instanceof Error ? reviewError.message : 'Unknown error',
			},
		});
	} catch (updateErr) {
		console.error('Failed to update check run on failure:', updateErr);
	}

	// 予算超過は想定内なので exit(0)、それ以外はジョブを失敗させる
	if (!isBudget) process.exit(1);
}

main().catch((err) => {
	console.error('Unexpected error:', err);
	process.exit(1);
});
