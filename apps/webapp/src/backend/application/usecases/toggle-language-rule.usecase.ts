import { LanguageRuleSetting } from '../../domain/models/language-rule-setting.model';
import type { Result } from '../../domain/models/result.model';
import type { LanguageRuleSettingRepository } from '../../domain/repositories/language-rule-setting.repository';

type ToggleLanguageRuleError = 'INVALID_LANGUAGE';

export class ToggleLanguageRuleUseCase {
	constructor(private readonly repository: LanguageRuleSettingRepository) {}

	async execute(params: {
		language: string;
		enabled: boolean;
	}): Promise<Result<LanguageRuleSetting, ToggleLanguageRuleError>> {
		const result = LanguageRuleSetting.create({
			language: params.language,
			enabled: params.enabled,
		});

		if (!result.success) {
			return { success: false, error: 'INVALID_LANGUAGE' };
		}

		await this.repository.upsert(result.value);
		return { success: true, value: result.value };
	}
}
