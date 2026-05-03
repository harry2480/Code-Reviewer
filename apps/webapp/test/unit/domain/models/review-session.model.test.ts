import { ReviewSession } from '@/backend/domain/models/review-session.model';
import { describe, expect, it } from 'vitest';

const validParams = {
	id: 'session-1',
	owner: 'acme',
	repo: 'my-app',
	prNumber: 42,
	prTitle: 'Add feature X',
	prUrl: 'https://github.com/acme/my-app/pull/42',
	status: 'success',
	detectedLanguages: ['typescript', 'python'],
	logicScore: 8,
	securityScore: 9,
	efficiencyScore: 7,
	readabilityScore: 10,
	totalTokens: 1234,
	durationMs: 5000,
};

describe('ReviewSession.create', () => {
	it('正常に ReviewSession を生成できる', () => {
		const result = ReviewSession.create(validParams);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.id).toBe('session-1');
			expect(result.value.detectedLanguages).toEqual(['typescript', 'python']);
			expect(result.value.logicScore).toBe(8);
			expect(result.value.totalTokens).toBe(1234);
		}
	});

	it('owner が空の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, owner: '   ' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('OWNER_EMPTY');
	});

	it('repo が空の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, repo: '  ' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('REPO_EMPTY');
	});

	it('prTitle が空の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, prTitle: '  ' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('PR_TITLE_EMPTY');
	});

	it('prUrl が空の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, prUrl: '  ' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('PR_URL_EMPTY');
	});

	it('prNumber が 0 以下の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, prNumber: 0 });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('PR_NUMBER_INVALID');
	});

	it('status が無効値の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, status: 'unknown' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('INVALID_STATUS');
	});

	it('detectedLanguages に未対応言語が含まれる場合エラーを返す', () => {
		const result = ReviewSession.create({
			...validParams,
			detectedLanguages: ['typescript', 'cobol'],
		});
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('INVALID_LANGUAGE');
	});

	it('detectedLanguages に重複がある場合エラーを返す', () => {
		const result = ReviewSession.create({
			...validParams,
			detectedLanguages: ['typescript', 'typescript'],
		});
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('DUPLICATE_LANGUAGE');
	});

	it('スコアが 0-10 の範囲外の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, logicScore: 11 });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('SCORE_OUT_OF_RANGE');
	});

	it('スコアが null の場合は許容される', () => {
		const result = ReviewSession.create({
			...validParams,
			logicScore: null,
			securityScore: null,
			efficiencyScore: null,
			readabilityScore: null,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.logicScore).toBeNull();
		}
	});

	it('totalTokens が負の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, totalTokens: -1 });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('TOTAL_TOKENS_NEGATIVE');
	});

	it('durationMs が負の場合エラーを返す', () => {
		const result = ReviewSession.create({ ...validParams, durationMs: -100 });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('DURATION_NEGATIVE');
	});

	it('owner / repo / prTitle / prUrl の前後空白をトリムする', () => {
		const result = ReviewSession.create({
			...validParams,
			owner: '  acme  ',
			repo: '  my-app  ',
			prTitle: '  Add feature X  ',
			prUrl: '  https://github.com/acme/my-app/pull/42  ',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.owner).toBe('acme');
			expect(result.value.repo).toBe('my-app');
			expect(result.value.prTitle).toBe('Add feature X');
			expect(result.value.prUrl).toBe('https://github.com/acme/my-app/pull/42');
		}
	});
});

describe('ReviewSession.reconstruct', () => {
	it('DB レコードから ReviewSession を復元できる', () => {
		const date = new Date('2026-05-02T10:00:00Z');
		const session = ReviewSession.reconstruct({
			...validParams,
			analysisChain: 'step1\nstep2',
			createdAt: date,
		});

		expect(session.id).toBe('session-1');
		expect(session.analysisChain).toBe('step1\nstep2');
		expect(session.createdAt).toBe(date);
	});
});
