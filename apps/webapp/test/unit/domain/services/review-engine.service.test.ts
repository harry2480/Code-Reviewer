import { ReviewEngineService } from '@/backend/domain/services/review-engine.service';
import { describe, expect, it } from 'vitest';

describe('ReviewEngineService.buildSystemPrompt', () => {
	const service = new ReviewEngineService();

	it('logicプロンプトに境界値・例外処理キーワードを含む', () => {
		const prompt = service.buildSystemPrompt('logic');
		expect(prompt).toContain('Boundary value');
		expect(prompt).toContain('Exception handling');
	});

	it('securityプロンプトにSQL injection・XSSキーワードを含む', () => {
		const prompt = service.buildSystemPrompt('security');
		expect(prompt).toContain('SQL injection');
		expect(prompt).toContain('XSS');
	});

	it('efficiencyプロンプトに計算量キーワードを含む', () => {
		const prompt = service.buildSystemPrompt('efficiency');
		expect(prompt).toContain('O(n²)');
	});

	it('readabilityプロンプトにSOLIDキーワードを含む', () => {
		const prompt = service.buildSystemPrompt('readability');
		expect(prompt).toContain('SOLID');
	});

	it('languageRules を渡すと基本プロンプトの末尾に付加される', () => {
		const langRules = '\n\n## Language-Specific Rules\n### typescript\n- Use strict null checks';
		const prompt = service.buildSystemPrompt('logic', langRules);
		expect(prompt).toContain('Boundary value');
		expect(prompt).toContain('Language-Specific Rules');
		expect(prompt).toContain('strict null checks');
		expect(prompt.endsWith(langRules)).toBe(true);
	});

	it('languageRules 未指定なら基本プロンプトのみを返す', () => {
		const promptWithDefault = service.buildSystemPrompt('logic');
		const promptWithEmpty = service.buildSystemPrompt('logic', '');
		expect(promptWithDefault).toBe(promptWithEmpty);
		expect(promptWithDefault).not.toContain('Language-Specific Rules');
	});
});

describe('ReviewEngineService.buildUserPrompt', () => {
	const service = new ReviewEngineService();

	it('diffとコミットメッセージを含むプロンプトを生成する', () => {
		const diff = '+ const x = 1;';
		const commits = ['fix: null check'];
		const prompt = service.buildUserPrompt(diff, commits);
		expect(prompt).toContain(diff);
		expect(prompt).toContain('fix: null check');
	});

	it('コミットメッセージが空の場合もdiffを含む', () => {
		const diff = '- old line\n+ new line';
		const prompt = service.buildUserPrompt(diff, []);
		expect(prompt).toContain(diff);
		expect(prompt).not.toContain('Commit Messages');
	});
});

describe('ReviewEngineService.parseResponse', () => {
	const service = new ReviewEngineService();
	const ctx = { owner: 'org', repo: 'repo', prNumber: 1, sessionId: 'session-1' };

	it('正常なJSONレスポンスからReviewCommentを返す', () => {
		const raw = JSON.stringify([
			{
				filePath: 'src/index.ts',
				lineNumber: 10,
				severity: 'warning',
				body: 'Null check missing',
				suggestedCode: 'if (x !== null)',
			},
		]);
		const result = service.parseResponse(
			raw,
			'logic',
			ctx.owner,
			ctx.repo,
			ctx.prNumber,
			ctx.sessionId,
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value).toHaveLength(1);
			expect(result.value[0].filePath).toBe('src/index.ts');
			expect(result.value[0].perspective).toBe('logic');
			expect(result.value[0].severity).toBe('warning');
			expect(result.value[0].sessionId).toBe('session-1');
		}
	});

	it('空配列を含むレスポンスは空のコメントリストを返す', () => {
		const result = service.parseResponse(
			'[]',
			'security',
			ctx.owner,
			ctx.repo,
			ctx.prNumber,
			ctx.sessionId,
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value).toHaveLength(0);
		}
	});

	it('JSONでないレスポンスはfailureを返す（throwしない）', () => {
		const result = service.parseResponse(
			'No issues found.',
			'logic',
			ctx.owner,
			ctx.repo,
			ctx.prNumber,
			ctx.sessionId,
		);
		expect(result.success).toBe(false);
	});

	it('不正なJSON文字列はfailureを返す', () => {
		const result = service.parseResponse(
			'[invalid json',
			'logic',
			ctx.owner,
			ctx.repo,
			ctx.prNumber,
			ctx.sessionId,
		);
		expect(result.success).toBe(false);
	});

	it('バリデーション失敗のコメントはスキップされ残りは返す', () => {
		const raw = JSON.stringify([
			{ filePath: 'src/a.ts', lineNumber: 1, severity: 'info', body: 'Valid comment' },
			{ filePath: '', lineNumber: 1, severity: 'info', body: 'Empty filePath' },
			{ filePath: 'src/b.ts', lineNumber: -1, severity: 'info', body: 'Invalid line' },
		]);
		const result = service.parseResponse(
			raw,
			'readability',
			ctx.owner,
			ctx.repo,
			ctx.prNumber,
			ctx.sessionId,
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value).toHaveLength(1);
			expect(result.value[0].filePath).toBe('src/a.ts');
		}
	});

	it('プロンプト前後の余計なテキストがあってもJSONを抽出できる', () => {
		const raw = `Here are my findings:\n${JSON.stringify([
			{ filePath: 'src/x.ts', lineNumber: 5, severity: 'critical', body: 'XSS risk' },
		])}\nEnd of review.`;
		const result = service.parseResponse(
			raw,
			'security',
			ctx.owner,
			ctx.repo,
			ctx.prNumber,
			ctx.sessionId,
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value).toHaveLength(1);
		}
	});
});
