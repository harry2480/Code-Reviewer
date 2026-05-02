import {
	isGitHubAppConnected,
	listLanguageRuleSettingsUseCase,
} from '../composition/review-frontend.composition';
import type { SupportedLanguage } from '../types/review-frontend.types';
import { dashboardLoader } from './dashboard.loader';

export type SettingsLoaderResult = {
	githubApp: {
		connected: boolean;
		appIdConfigured: boolean;
		privateKeyConfigured: boolean;
	};
	languageRules: { language: SupportedLanguage; enabled: boolean }[];
	budget: {
		dailyLimitUsd: number;
		usedUsd: number;
	} | null;
};

export async function settingsLoader(): Promise<SettingsLoaderResult> {
	const [languageRules, dashboard] = await Promise.all([
		listLanguageRuleSettingsUseCase.execute(),
		dashboardLoader(),
	]);

	return {
		githubApp: {
			connected: isGitHubAppConnected(),
			appIdConfigured: Boolean(process.env.GITHUB_APP_ID),
			privateKeyConfigured: Boolean(process.env.GITHUB_APP_PRIVATE_KEY),
		},
		languageRules: languageRules.map((s) => ({
			language: s.language,
			enabled: s.enabled,
		})),
		budget: dashboard.budget
			? {
					dailyLimitUsd: dashboard.budget.dailyLimitUsd,
					usedUsd: dashboard.budget.usedUsd,
				}
			: null,
	};
}
