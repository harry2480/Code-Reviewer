import { GetDashboardStatsUseCase } from '../../application/usecases/get-dashboard-stats.usecase';
import { GetReviewSessionDetailUseCase } from '../../application/usecases/get-review-session-detail.usecase';
import { ListLanguageRuleSettingsUseCase } from '../../application/usecases/list-language-rule-settings.usecase';
import { ListReviewSessionsUseCase } from '../../application/usecases/list-review-sessions.usecase';
import { ToggleLanguageRuleUseCase } from '../../application/usecases/toggle-language-rule.usecase';
import { UpdateDailyBudgetLimitUseCase } from '../../application/usecases/update-daily-budget-limit.usecase';
import { PrismaBudgetRepository } from '../../infrastructure/repositories/prisma-budget.repository';
import { PrismaLanguageRuleSettingRepository } from '../../infrastructure/repositories/prisma-language-rule-setting.repository';
import { PrismaReviewCommentRepository } from '../../infrastructure/repositories/prisma-review-comment.repository';
import { PrismaReviewSessionRepository } from '../../infrastructure/repositories/prisma-review-session.repository';

const reviewSessionRepository = new PrismaReviewSessionRepository();
const reviewCommentRepository = new PrismaReviewCommentRepository();
const budgetRepository = new PrismaBudgetRepository();
const languageRuleSettingRepository = new PrismaLanguageRuleSettingRepository();

export const getDashboardStatsUseCase = new GetDashboardStatsUseCase(
	reviewSessionRepository,
	reviewCommentRepository,
	budgetRepository,
);

export const listReviewSessionsUseCase = new ListReviewSessionsUseCase(reviewSessionRepository);

export const getReviewSessionDetailUseCase = new GetReviewSessionDetailUseCase(
	reviewSessionRepository,
	reviewCommentRepository,
);

export const listLanguageRuleSettingsUseCase = new ListLanguageRuleSettingsUseCase(
	languageRuleSettingRepository,
);

export const toggleLanguageRuleUseCase = new ToggleLanguageRuleUseCase(
	languageRuleSettingRepository,
);

export const updateDailyBudgetLimitUseCase = new UpdateDailyBudgetLimitUseCase(
	budgetRepository,
	() => crypto.randomUUID(),
);

export function isGitHubAppConnected(): boolean {
	return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}
