import { LanguageRuleSetting } from '@/backend/domain/models/language-rule-setting.model';
import { describe, expect, it } from 'vitest';

describe('LanguageRuleSetting.create', () => {
	it('正常に LanguageRuleSetting を生成できる', () => {
		const result = LanguageRuleSetting.create({ language: 'typescript', enabled: true });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.language).toBe('typescript');
			expect(result.value.enabled).toBe(true);
		}
	});

	it.each(['typescript', 'python', 'swift', 'php', 'go', 'rust'])(
		'%s は有効な言語として受け入れる',
		(language) => {
			const result = LanguageRuleSetting.create({ language, enabled: false });
			expect(result.success).toBe(true);
		},
	);

	it('未対応言語の場合エラーを返す', () => {
		const result = LanguageRuleSetting.create({ language: 'cobol', enabled: true });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('INVALID_LANGUAGE');
		}
	});
});

describe('LanguageRuleSetting.reconstruct', () => {
	it('DB レコードから復元できる', () => {
		const date = new Date('2026-05-02T10:00:00Z');
		const setting = LanguageRuleSetting.reconstruct({
			language: 'go',
			enabled: false,
			updatedAt: date,
		});

		expect(setting.language).toBe('go');
		expect(setting.enabled).toBe(false);
		expect(setting.updatedAt).toBe(date);
	});
});

describe('LanguageRuleSetting.defaultsForAllLanguages', () => {
	it('全 6 言語をデフォルト有効で返す', () => {
		const settings = LanguageRuleSetting.defaultsForAllLanguages();

		expect(settings).toHaveLength(6);
		expect(settings.every((s) => s.enabled)).toBe(true);
		expect(settings.map((s) => s.language).sort()).toEqual([
			'go',
			'php',
			'python',
			'rust',
			'swift',
			'typescript',
		]);
	});
});
