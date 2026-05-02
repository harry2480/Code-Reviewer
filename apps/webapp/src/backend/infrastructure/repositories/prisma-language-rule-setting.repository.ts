import type { SupportedLanguage } from '../../domain/models/language-expert.model';
import { LanguageRuleSetting } from '../../domain/models/language-rule-setting.model';
import type { LanguageRuleSettingRepository } from '../../domain/repositories/language-rule-setting.repository';
import { prisma } from '../db/prisma-client';

type LanguageRuleSettingRecord = {
	language: string;
	enabled: boolean;
	updatedAt: Date;
};

function toDomain(record: LanguageRuleSettingRecord): LanguageRuleSetting {
	return LanguageRuleSetting.reconstruct({
		language: record.language,
		enabled: record.enabled,
		updatedAt: record.updatedAt,
	});
}

export class PrismaLanguageRuleSettingRepository implements LanguageRuleSettingRepository {
	async findAll(): Promise<LanguageRuleSetting[]> {
		const records = await prisma.languageRuleSetting.findMany({
			orderBy: { language: 'asc' },
		});
		return records.map(toDomain);
	}

	async findByLanguage(language: SupportedLanguage): Promise<LanguageRuleSetting | null> {
		const record = await prisma.languageRuleSetting.findUnique({
			where: { language },
		});
		if (!record) return null;
		return toDomain(record);
	}

	async upsert(setting: LanguageRuleSetting): Promise<void> {
		await prisma.languageRuleSetting.upsert({
			where: { language: setting.language },
			create: {
				language: setting.language,
				enabled: setting.enabled,
			},
			update: {
				enabled: setting.enabled,
			},
		});
	}
}
