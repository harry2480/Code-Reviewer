'use client';

import { updateDailyBudgetLimitAction } from '@/backend/presentation/actions/settings.action';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { useActionState } from 'react';

export function BudgetLimitForm({ initialLimit }: { initialLimit: number | null }) {
	const [state, formAction, isPending] = useActionState(updateDailyBudgetLimitAction, {});

	return (
		<form action={formAction} className="space-y-3">
			<div className="space-y-1.5">
				<Label htmlFor="dailyLimitUsd">日次上限（USD）</Label>
				<Input
					id="dailyLimitUsd"
					name="dailyLimitUsd"
					type="number"
					step="0.01"
					min="0.01"
					defaultValue={initialLimit?.toFixed(2) ?? ''}
					placeholder="0.50"
					required
					className="max-w-[180px]"
				/>
			</div>
			<div className="flex items-center gap-3">
				<Button type="submit" disabled={isPending}>
					{isPending ? '保存中…' : '保存'}
				</Button>
				{state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
				{state.success ? <span className="text-sm text-muted-foreground">保存しました</span> : null}
			</div>
		</form>
	);
}
