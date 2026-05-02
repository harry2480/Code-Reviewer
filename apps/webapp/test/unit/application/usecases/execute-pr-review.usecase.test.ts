import { ExecutePrReviewUseCase } from '@/backend/application/usecases/execute-pr-review.usecase';
import type { AiGateway } from '@/backend/domain/gateways/ai.gateway';
import type { GitHubApiGateway } from '@/backend/domain/gateways/github-api.gateway';
import { Budget } from '@/backend/domain/models/budget.model';
import type { ReviewComment } from '@/backend/domain/models/review-comment.model';
import type { BudgetRepository } from '@/backend/domain/repositories/budget.repository';
import type { ReviewCommentRepository } from '@/backend/domain/repositories/review-comment.repository';
import { PolyglotExpertService } from '@/backend/domain/services/polyglot-expert.service';
import { ReviewEngineService } from '@/backend/domain/services/review-engine.service';
import { describe, expect, it, vi } from 'vitest';

const VALID_COMMENT_JSON = JSON.stringify([
	{
		filePath: 'src/index.ts',
		lineNumber: 1,
		severity: 'info',
		body: 'Consider adding a null check here.',
	},
]);

const TS_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc..def 100644
--- a/src/index.ts
+++ b/src/index.ts
+ const x = 1;`;

function createMocks() {
	const ai: AiGateway = {
		generate: vi.fn().mockResolvedValue(VALID_COMMENT_JSON),
	};
	const github: GitHubApiGateway = {
		getPullRequestDiff: vi.fn().mockResolvedValue(TS_DIFF),
		getCommitMessages: vi.fn().mockResolvedValue(['fix: something']),
		postReviewComment: vi.fn().mockResolvedValue(undefined),
	};
	const reviewCommentRepository: ReviewCommentRepository = {
		save: vi.fn().mockResolvedValue(undefined),
		findByPr: vi.fn().mockResolvedValue([]),
	};
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const budget = Budget.reconstruct({ id: 'b1', date: today, dailyLimitUsd: 5, usedUsd: 0 });
	const budgetRepository: BudgetRepository = {
		findByDate: vi.fn().mockResolvedValue(budget),
		save: vi.fn().mockResolvedValue(undefined),
	};
	const reviewEngine = new ReviewEngineService();
	const polyglotExpert = new PolyglotExpertService();
	return {
		ai,
		github,
		reviewCommentRepository,
		budgetRepository,
		reviewEngine,
		polyglotExpert,
	};
}

function buildUseCase(mocks: ReturnType<typeof createMocks>) {
	return new ExecutePrReviewUseCase(
		mocks.ai,
		mocks.github,
		mocks.reviewCommentRepository,
		mocks.budgetRepository,
		mocks.reviewEngine,
		mocks.polyglotExpert,
	);
}

describe('ExecutePrReviewUseCase', () => {
	it('正常系: 4視点分のAI呼び出しとコメント保存・投稿が実行される', async () => {
		const mocks = createMocks();
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		expect(mocks.ai.generate).toHaveBeenCalledTimes(4);
		expect(mocks.reviewCommentRepository.save).toHaveBeenCalledTimes(4);
		expect(mocks.github.postReviewComment).toHaveBeenCalledTimes(4);
	});

	it('予算超過時はエラーをthrowする', async () => {
		const mocks = createMocks();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const exceededBudget = Budget.reconstruct({
			id: 'b1',
			date: today,
			dailyLimitUsd: 5,
			usedUsd: 5,
		});
		(mocks.budgetRepository.findByDate as ReturnType<typeof vi.fn>).mockResolvedValue(
			exceededBudget,
		);

		const useCase = buildUseCase(mocks);

		await expect(useCase.execute('org', 'repo', 1)).rejects.toThrow('Daily budget exceeded');
		expect(mocks.ai.generate).not.toHaveBeenCalled();
	});

	it('budgetがnullの場合は新規作成して続行する', async () => {
		const mocks = createMocks();
		(mocks.budgetRepository.findByDate as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		expect(mocks.budgetRepository.save).toHaveBeenCalledOnce();
		expect(mocks.ai.generate).toHaveBeenCalledTimes(4);
	});

	it('1視点のAIレスポンスがパース失敗でも残り3視点は継続する', async () => {
		const mocks = createMocks();
		(mocks.ai.generate as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce('not json at all')
			.mockResolvedValue(VALID_COMMENT_JSON);

		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		expect(mocks.ai.generate).toHaveBeenCalledTimes(4);
		expect(mocks.reviewCommentRepository.save).toHaveBeenCalledTimes(3);
	});

	it('GitHubへのコメント投稿が失敗しても例外を伝播しない', async () => {
		const mocks = createMocks();
		(mocks.github.postReviewComment as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('GitHub API error'),
		);

		const useCase = buildUseCase(mocks);

		await expect(useCase.execute('org', 'repo', 1)).resolves.toBeUndefined();
		expect(mocks.reviewCommentRepository.save).toHaveBeenCalledTimes(4);
	});

	it('diffとcommit取得時にowner/repo/prNumberが正しく渡される', async () => {
		const mocks = createMocks();
		const useCase = buildUseCase(mocks);

		await useCase.execute('my-org', 'my-repo', 42);

		expect(mocks.github.getPullRequestDiff).toHaveBeenCalledWith('my-org', 'my-repo', 42);
		expect(mocks.github.getCommitMessages).toHaveBeenCalledWith('my-org', 'my-repo', 42);
		expect(mocks.github.postReviewComment).toHaveBeenCalledWith(
			'my-org',
			'my-repo',
			42,
			expect.any(Object) as ReviewComment,
		);
	});

	it('diff から検出した言語ルールがシステムプロンプトに注入される', async () => {
		const mocks = createMocks();
		const detectSpy = vi.spyOn(mocks.polyglotExpert, 'detectLanguages');
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		expect(detectSpy).toHaveBeenCalledWith(TS_DIFF);
		const generateMock = mocks.ai.generate as ReturnType<typeof vi.fn>;
		const firstCallArgs = generateMock.mock.calls[0][0] as { systemPrompt: string };
		expect(firstCallArgs.systemPrompt).toContain('Language-Specific Rules');
		expect(firstCallArgs.systemPrompt).toContain('### typescript');
	});

	it('言語が検出できない diff の場合は言語ルールが注入されない', async () => {
		const mocks = createMocks();
		(mocks.github.getPullRequestDiff as ReturnType<typeof vi.fn>).mockResolvedValue(
			'no diff headers here',
		);
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		const generateMock = mocks.ai.generate as ReturnType<typeof vi.fn>;
		const firstCallArgs = generateMock.mock.calls[0][0] as { systemPrompt: string };
		expect(firstCallArgs.systemPrompt).not.toContain('Language-Specific Rules');
	});
});
