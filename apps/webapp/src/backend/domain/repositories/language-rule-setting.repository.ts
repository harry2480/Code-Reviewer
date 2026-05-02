import type { SupportedLanguage } from '../models/language-expert.model';
import type { LanguageRuleSetting } from '../models/language-rule-setting.model';

export interface LanguageRuleSettingRepository {
	findAll(): Promise<LanguageRuleSetting[]>;
	upsert(setting: LanguageRuleSetting): Promise<void>;
	findByLanguage(language: SupportedLanguage): Promise<LanguageRuleSetting | null>;
}
