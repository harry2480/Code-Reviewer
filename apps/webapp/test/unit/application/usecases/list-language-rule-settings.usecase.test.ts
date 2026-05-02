import { ListLanguageRuleSettingsUseCase } from '@/backend/application/usecases/list-language-rule-settings.usecase';
import { LanguageRuleSetting } from '@/backend/domain/models/language-rule-setting.model';
import type { LanguageRuleSettingRepository } from '@/backend/domain/repositories/language-rule-setting.repository';
import { describe, expect, it, vi } from 'vitest';

function createRepo(): LanguageRuleSettingRepository {
	return {
		findAll: vi.fn().mockResolvedValue([]),
		findByLanguage: vi.fn(),
		upsert: vi.fn(),
	};
}

describe('ListLanguageRuleSettingsUseCase', () => {
	it('DB に何もない場合は全 6 言語を有効として返す', async () => {
		const repo = createRepo();
		const useCase = new ListLanguageRuleSettingsUseCase(repo);

		const settings = await useCase.execute();

		expect(settings).toHaveLength(6);
		expect(settings.every((s) => s.enabled)).toBe(true);
	});

	it('DB に値があれば DB の値で上書きする', async () => {
		const repo = createRepo();
		const goDisabled = LanguageRuleSetting.reconstruct({
			language: 'go',
			enabled: false,
			updatedAt: new Date(),
		});
		(repo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([goDisabled]);

		const useCase = new ListLanguageRuleSettingsUseCase(repo);
		const settings = await useCase.execute();

		const go = settings.find((s) => s.language === 'go');
		expect(go?.enabled).toBe(false);
		const ts = settings.find((s) => s.language === 'typescript');
		expect(ts?.enabled).toBe(true);
	});
});
