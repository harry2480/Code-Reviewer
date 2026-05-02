'use server';

import { revalidatePath } from 'next/cache';
import {
	toggleLanguageRuleUseCase,
	updateDailyBudgetLimitUseCase,
} from '../composition/review-frontend.composition';

export type ToggleLanguageRuleState = { error?: string; success?: boolean };

export async function toggleLanguageRuleAction(
	_prev: ToggleLanguageRuleState,
	formData: FormData,
): Promise<ToggleLanguageRuleState> {
	const language = formData.get('language');
	const enabledRaw = formData.get('enabled');

	if (typeof language !== 'string' || language.length === 0) {
		return { error: '言語が指定されていません' };
	}

	const enabled = enabledRaw === 'true';

	const result = await toggleLanguageRuleUseCase.execute({ language, enabled });
	if (!result.success) {
		return { error: '対応していない言語です' };
	}

	revalidatePath('/settings');
	return { success: true };
}

export type UpdateDailyBudgetLimitState = { error?: string; success?: boolean };

export async function updateDailyBudgetLimitAction(
	_prev: UpdateDailyBudgetLimitState,
	formData: FormData,
): Promise<UpdateDailyBudgetLimitState> {
	const raw = formData.get('dailyLimitUsd');
	if (typeof raw !== 'string' || raw.trim().length === 0) {
		return { error: '上限額を入力してください' };
	}

	const dailyLimitUsd = Number(raw);
	if (!Number.isFinite(dailyLimitUsd) || dailyLimitUsd <= 0) {
		return { error: '0 より大きい数値を入力してください' };
	}

	const result = await updateDailyBudgetLimitUseCase.execute({
		date: new Date(),
		dailyLimitUsd,
	});

	if (!result.success) {
		return { error: '上限額の更新に失敗しました' };
	}

	revalidatePath('/settings');
	revalidatePath('/dashboard');
	return { success: true };
}
