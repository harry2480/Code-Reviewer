'use client';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/frontend/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

const LANGUAGES = ['typescript', 'python', 'swift', 'php', 'go', 'rust'] as const;
const STATUSES = ['success', 'failed', 'skipped'] as const;
const ALL = 'all';

export function ReviewHistoryFilters({
	language,
	status,
}: {
	language: string;
	status: string;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();

	function update(key: 'language' | 'status', value: string) {
		const next = new URLSearchParams(searchParams.toString());
		if (value === ALL) {
			next.delete(key);
		} else {
			next.set(key, value);
		}
		next.delete('page');
		router.push(`/review-history?${next.toString()}`);
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">言語</span>
				<Select value={language} onValueChange={(v) => update('language', v)}>
					<SelectTrigger className="w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>すべて</SelectItem>
						{LANGUAGES.map((lang) => (
							<SelectItem key={lang} value={lang}>
								{lang}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">ステータス</span>
				<Select value={status} onValueChange={(v) => update('status', v)}>
					<SelectTrigger className="w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>すべて</SelectItem>
						{STATUSES.map((s) => (
							<SelectItem key={s} value={s}>
								{s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
