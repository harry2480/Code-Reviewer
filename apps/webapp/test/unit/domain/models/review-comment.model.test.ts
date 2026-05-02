import { ReviewComment } from '@/backend/domain/models/review-comment.model';
import { describe, expect, it } from 'vitest';

const validParams = {
	id: 'comment-1',
	sessionId: 'session-1',
	filePath: 'src/utils/parser.ts',
	lineNumber: 42,
	perspective: 'security' as const,
	severity: 'critical' as const,
	body: 'SQL インジェクションの脆弱性があります。プリペアドステートメントを使用してください。',
	prNumber: 1,
	owner: 'acme',
	repo: 'my-app',
};

describe('ReviewComment.create', () => {
	it('正常に ReviewComment を生成できる', () => {
		const result = ReviewComment.create(validParams);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.id).toBe('comment-1');
			expect(result.value.filePath).toBe('src/utils/parser.ts');
			expect(result.value.lineNumber).toBe(42);
			expect(result.value.perspective).toBe('security');
			expect(result.value.severity).toBe('critical');
		}
	});

	it('ファイルパスが空の場合エラーを返す', () => {
		const result = ReviewComment.create({ ...validParams, filePath: '   ' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('FILE_PATH_EMPTY');
		}
	});

	it('行番号が 0 以下の場合エラーを返す', () => {
		const result = ReviewComment.create({ ...validParams, lineNumber: 0 });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('LINE_NUMBER_INVALID');
		}
	});

	it('無効な perspective の場合エラーを返す', () => {
		const result = ReviewComment.create({ ...validParams, perspective: 'unknown' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('INVALID_PERSPECTIVE');
		}
	});

	it('無効な severity の場合エラーを返す', () => {
		const result = ReviewComment.create({ ...validParams, severity: 'blocker' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('INVALID_SEVERITY');
		}
	});

	it('body が空の場合エラーを返す', () => {
		const result = ReviewComment.create({ ...validParams, body: '  ' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('BODY_EMPTY');
		}
	});

	it('前後の空白をトリムする', () => {
		const result = ReviewComment.create({
			...validParams,
			filePath: '  src/utils/parser.ts  ',
			body: '  問題があります  ',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.filePath).toBe('src/utils/parser.ts');
			expect(result.value.body).toBe('問題があります');
		}
	});

	it('sessionId が空の場合エラーを返す', () => {
		const result = ReviewComment.create({ ...validParams, sessionId: '   ' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('SESSION_ID_EMPTY');
		}
	});
});

describe('ReviewComment.reconstruct', () => {
	it('DB レコードから ReviewComment を復元できる', () => {
		const date = new Date('2025-01-01');
		const comment = ReviewComment.reconstruct({
			...validParams,
			suggestedCode: null,
			createdAt: date,
		});

		expect(comment.id).toBe('comment-1');
		expect(comment.createdAt).toBe(date);
		expect(comment.suggestedCode).toBeNull();
	});
});
