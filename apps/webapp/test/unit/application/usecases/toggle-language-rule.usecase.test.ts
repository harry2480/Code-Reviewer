import { ToggleLanguageRuleUseCase } from '@/backend/application/usecases/toggle-language-rule.usecase';
import type { LanguageRuleSettingRepository } from '@/backend/domain/repositories/language-rule-setting.repository';
import { describe, expect, it, vi } from 'vitest';

function createRepo(): LanguageRuleSettingRepository {
	return {
		findAll: vi.fn(),
		findByLanguage: vi.fn(),
		upsert: vi.fn().mockResolvedValue(undefined),
	};
}

describe('ToggleLanguageRuleUseCase', () => {
	it('対応言語を upsert する', async () => {
		const repo = createRepo();
		const useCase = new ToggleLanguageRuleUseCase(repo);

		const result = await useCase.execute({ language: 'python', enabled: false });

		expect(result.success).toBe(true);
		expect(repo.upsert).toHaveBeenCalledOnce();
		const passed = (repo.upsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
		expect(passed.language).toBe('python');
		expect(passed.enabled).toBe(false);
	});

	it('未対応言語の場合エラーを返し upsert しない', async () => {
		const repo = createRepo();
		const useCase = new ToggleLanguageRuleUseCase(repo);

		const result = await useCase.execute({ language: 'cobol', enabled: true });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('INVALID_LANGUAGE');
		expect(repo.upsert).not.toHaveBeenCalled();
	});
});
