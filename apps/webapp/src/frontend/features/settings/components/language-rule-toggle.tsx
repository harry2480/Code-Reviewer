'use client';

import { toggleLanguageRuleAction } from '@/backend/presentation/actions/settings.action';
import { Switch } from '@/frontend/components/ui/switch';
import { useTransition } from 'react';

export function LanguageRuleToggle({
	language,
	enabled,
}: {
	language: string;
	enabled: boolean;
}) {
	const [isPending, startTransition] = useTransition();

	function onCheckedChange(next: boolean) {
		const formData = new FormData();
		formData.set('language', language);
		formData.set('enabled', next ? 'true' : 'false');
		startTransition(async () => {
			await toggleLanguageRuleAction({}, formData);
		});
	}

	return (
		<Switch
			checked={enabled}
			onCheckedChange={onCheckedChange}
			disabled={isPending}
			aria-label={`${language} ルールを切り替える`}
		/>
	);
}
