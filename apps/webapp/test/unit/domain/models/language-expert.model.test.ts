import { LanguageExpert } from '@/backend/domain/models/language-expert.model';
import { describe, expect, it } from 'vitest';

describe('LanguageExpert.fromExtension', () => {
	it.each([
		['ts', 'typescript'],
		['tsx', 'typescript'],
		['py', 'python'],
		['swift', 'swift'],
		['php', 'php'],
		['go', 'go'],
		['rs', 'rust'],
	])('拡張子 %s から言語 %s を判定する', (ext, expected) => {
		const expert = LanguageExpert.fromExtension(ext);
		expect(expert).not.toBeNull();
		expect(expert?.language).toBe(expected);
	});

	it('未対応の拡張子は null を返す', () => {
		const expert = LanguageExpert.fromExtension('java');
		expect(expert).toBeNull();
	});

	it('先頭のドットを除去して判定する', () => {
		const expert = LanguageExpert.fromExtension('.ts');
		expect(expert?.language).toBe('typescript');
	});

	it('大文字小文字を無視して判定する', () => {
		const expert = LanguageExpert.fromExtension('TS');
		expect(expert?.language).toBe('typescript');
	});

	it('ルールが空でないことを確認する', () => {
		const expert = LanguageExpert.fromExtension('ts');
		expect(expert?.rules.length).toBeGreaterThan(0);
	});
});
