export type SupportedLanguage = 'typescript' | 'python' | 'swift' | 'php' | 'go' | 'rust';

const EXTENSION_MAP: Record<string, SupportedLanguage> = {
	ts: 'typescript',
	tsx: 'typescript',
	py: 'python',
	swift: 'swift',
	php: 'php',
	go: 'go',
	rs: 'rust',
};

const DEFAULT_RULES: Record<SupportedLanguage, string[]> = {
	typescript: [
		'Prefer explicit return types on public functions',
		'Use strict null checks',
		'Avoid any type',
		'Use readonly where possible',
	],
	python: [
		'Follow PEP 8 style guide',
		'Use type hints',
		'Prefer f-strings over format()',
		'Use dataclasses or Pydantic for data structures',
	],
	swift: [
		'Use Swift-idiomatic error handling with Result type',
		'Prefer value types (structs) over reference types',
		'Avoid force unwrapping',
		'Use guard for early returns',
	],
	php: [
		'Use strict types declaration',
		'Follow PSR-12 coding standard',
		'Use typed properties',
		'Avoid global state',
	],
	go: [
		'Handle errors explicitly',
		'Use idiomatic error wrapping with fmt.Errorf',
		'Prefer composition over inheritance',
		'Follow effective Go guidelines',
	],
	rust: [
		'Use Result and Option idiomatically',
		'Prefer ownership over cloning',
		'Use iterators instead of manual loops',
		'Avoid unwrap() in production code',
	],
};

export class LanguageExpert {
	private constructor(
		public readonly language: SupportedLanguage,
		public readonly rules: string[],
	) {}

	static fromExtension(ext: string): LanguageExpert | null {
		const language = EXTENSION_MAP[ext.toLowerCase().replace(/^\./, '')];
		if (!language) return null;
		return new LanguageExpert(language, DEFAULT_RULES[language]);
	}

	static fromLanguage(language: SupportedLanguage): LanguageExpert {
		return new LanguageExpert(language, DEFAULT_RULES[language]);
	}
}
