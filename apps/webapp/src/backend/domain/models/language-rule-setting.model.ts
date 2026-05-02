import type { SupportedLanguage } from './language-expert.model';
import type { Result } from './result.model';

type LanguageRuleSettingError = 'INVALID_LANGUAGE';

const VALID_LANGUAGES: SupportedLanguage[] = ['typescript', 'python', 'swift', 'php', 'go', 'rust'];

export class LanguageRuleSetting {
	private constructor(
		public readonly language: SupportedLanguage,
		public readonly enabled: boolean,
		public readonly updatedAt: Date,
	) {}

	static create(params: {
		language: string;
		enabled: boolean;
		updatedAt?: Date;
	}): Result<LanguageRuleSetting, LanguageRuleSettingError> {
		if (!VALID_LANGUAGES.includes(params.language as SupportedLanguage)) {
			return { success: false, error: 'INVALID_LANGUAGE' };
		}

		return {
			success: true,
			value: new LanguageRuleSetting(
				params.language as SupportedLanguage,
				params.enabled,
				params.updatedAt ?? new Date(),
			),
		};
	}

	static reconstruct(params: {
		language: string;
		enabled: boolean;
		updatedAt: Date;
	}): LanguageRuleSetting {
		return new LanguageRuleSetting(
			params.language as SupportedLanguage,
			params.enabled,
			params.updatedAt,
		);
	}

	static defaultsForAllLanguages(): LanguageRuleSetting[] {
		const now = new Date();
		return VALID_LANGUAGES.map((language) => new LanguageRuleSetting(language, true, now));
	}
}
