import { AlertTriangle, CheckCircle2 } from 'lucide-react';

type Props = {
	usedUsd: number;
	dailyLimitUsd: number;
};

export function BudgetAlert({ usedUsd, dailyLimitUsd }: Props) {
	const percent = (usedUsd / dailyLimitUsd) * 100;

	if (percent >= 100) {
		return (
			<div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
				<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
				<div>
					<p className="text-sm font-semibold">本日の予算上限を超過しました</p>
					<p className="mt-1 text-xs">
						${usedUsd.toFixed(3)} / ${dailyLimitUsd.toFixed(2)} ({Math.round(percent)}%)。新規 PR
						レビューは自動的にスキップされます。
					</p>
				</div>
			</div>
		);
	}

	if (percent >= 80) {
		return (
			<div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
				<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
				<div>
					<p className="text-sm font-semibold">本日の予算上限に近づいています</p>
					<p className="mt-1 text-xs">
						${usedUsd.toFixed(3)} / ${dailyLimitUsd.toFixed(2)} ({Math.round(percent)}
						%)。残り予算にご注意ください。
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
			<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
			<div>
				<p className="text-sm font-semibold">予算は健全な範囲内です</p>
				<p className="mt-1 text-xs">
					${usedUsd.toFixed(3)} / ${dailyLimitUsd.toFixed(2)} ({Math.round(percent)}%)
				</p>
			</div>
		</div>
	);
}
