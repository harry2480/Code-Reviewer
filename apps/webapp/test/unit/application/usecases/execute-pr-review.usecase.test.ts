import { ExecutePrReviewUseCase } from '@/backend/application/usecases/execute-pr-review.usecase';
import type { AiGateway } from '@/backend/domain/gateways/ai.gateway';
import type { ContextExtractorGateway } from '@/backend/domain/gateways/context-extractor.gateway';
import type { GitHubApiGateway } from '@/backend/domain/gateways/github-api.gateway';
import { Budget } from '@/backend/domain/models/budget.model';
import type { ReviewComment } from '@/backend/domain/models/review-comment.model';
import type { BudgetRepository } from '@/backend/domain/repositories/budget.repository';
import type { ReviewCommentRepository } from '@/backend/domain/repositories/review-comment.repository';
import { PolyglotExpertService } from '@/backend/domain/services/polyglot-expert.service';
import { ReviewEngineService } from '@/backend/domain/services/review-engine.service';
import type { RefinementOutcome } from '@/backend/domain/services/self-refinement.service';
import type { SelfRefinementService } from '@/backend/domain/services/self-refinement.service';
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
	const contextExtractor: ContextExtractorGateway = {
		extractPullRequestContext: vi.fn().mockResolvedValue({
			recentCommitMessages: ['feat: context commit'],
			callerReferences: [],
		}),
	};
	const selfRefinement = {
		refine: vi.fn().mockImplementation(
			async (params: { candidateComments: ReviewComment[] }): Promise<RefinementOutcome> => ({
				acceptedComments: params.candidateComments,
				rejectedComments: [],
			}),
		),
	} as unknown as SelfRefinementService;
	return {
		ai,
		github,
		reviewCommentRepository,
		budgetRepository,
		reviewEngine,
		polyglotExpert,
		contextExtractor,
		selfRefinement,
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
		mocks.contextExtractor,
		mocks.selfRefinement,
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
		// 1視点失敗 → 候補は3件 → selfRefinement がそのまま返す → 保存3件
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

	it('diffとPRコンテキスト取得時にowner/repo/prNumberが正しく渡される', async () => {
		const mocks = createMocks();
		const useCase = buildUseCase(mocks);

		await useCase.execute('my-org', 'my-repo', 42);

		expect(mocks.github.getPullRequestDiff).toHaveBeenCalledWith('my-org', 'my-repo', 42);
		expect(mocks.contextExtractor.extractPullRequestContext).toHaveBeenCalledWith({
			owner: 'my-org',
			repo: 'my-repo',
			prNumber: 42,
			diff: TS_DIFF,
		});
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

	it('contextExtractor のコミットメッセージが user prompt に含まれる', async () => {
		const mocks = createMocks();
		(
			mocks.contextExtractor.extractPullRequestContext as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			recentCommitMessages: ['feat: add new feature', 'fix: bug fix'],
			callerReferences: [],
		});
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		const generateMock = mocks.ai.generate as ReturnType<typeof vi.fn>;
		const firstCallArgs = generateMock.mock.calls[0][0] as { userPrompt: string };
		expect(firstCallArgs.userPrompt).toContain('feat: add new feature');
		expect(firstCallArgs.userPrompt).toContain('fix: bug fix');
	});

	it('callerReferences が存在する場合に user prompt に呼び出し元情報が含まれる', async () => {
		const mocks = createMocks();
		(
			mocks.contextExtractor.extractPullRequestContext as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			recentCommitMessages: [],
			callerReferences: [
				{ symbol: 'authenticateUser', filePath: 'src/auth.ts', lineNumber: 42, snippet: '...' },
			],
		});
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		const generateMock = mocks.ai.generate as ReturnType<typeof vi.fn>;
		const firstCallArgs = generateMock.mock.calls[0][0] as { userPrompt: string };
		expect(firstCallArgs.userPrompt).toContain('Call Sites');
		expect(firstCallArgs.userPrompt).toContain('authenticateUser');
	});

	it('selfRefinement が一部 reject した場合、accept されたコメントのみ保存・投稿される', async () => {
		const mocks = createMocks();
		// AI が 4 視点で1件ずつ返す。selfRefinement は最初の1件だけ reject する
		(mocks.selfRefinement.refine as ReturnType<typeof vi.fn>).mockImplementation(
			async (params: { candidateComments: ReviewComment[] }): Promise<RefinementOutcome> => ({
				acceptedComments: params.candidateComments.slice(1),
				rejectedComments: [{ comment: params.candidateComments[0], reason: 'hallucination' }],
			}),
		);
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		// 4視点 - 1 reject = 3 save
		expect(mocks.reviewCommentRepository.save).toHaveBeenCalledTimes(3);
		expect(mocks.github.postReviewComment).toHaveBeenCalledTimes(3);
	});

	it('selfRefinement は全 perspective の候補をまとめて 1 回だけ呼ぶ', async () => {
		const mocks = createMocks();
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		expect(mocks.selfRefinement.refine).toHaveBeenCalledTimes(1);
	});

	it('contextExtractor は 1 回だけ呼ばれる', async () => {
		const mocks = createMocks();
		const useCase = buildUseCase(mocks);

		await useCase.execute('org', 'repo', 1);

		expect(mocks.contextExtractor.extractPullRequestContext).toHaveBeenCalledTimes(1);
	});
});
