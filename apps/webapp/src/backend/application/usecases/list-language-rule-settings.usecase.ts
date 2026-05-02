import { LanguageRuleSetting } from '../../domain/models/language-rule-setting.model';
import type { LanguageRuleSettingRepository } from '../../domain/repositories/language-rule-setting.repository';

export class ListLanguageRuleSettingsUseCase {
	constructor(private readonly repository: LanguageRuleSettingRepository) {}

	async execute(): Promise<LanguageRuleSetting[]> {
		const stored = await this.repository.findAll();
		const storedByLanguage = new Map(stored.map((s) => [s.language, s]));

		return LanguageRuleSetting.defaultsForAllLanguages().map(
			(defaultSetting) => storedByLanguage.get(defaultSetting.language) ?? defaultSetting,
		);
	}
}
