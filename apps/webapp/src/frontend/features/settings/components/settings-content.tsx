import type { SettingsLoaderResult } from '@/backend/presentation/loaders/settings.loader';
import { Badge } from '@/frontend/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { ConnectionBadge } from '@/frontend/features/dashboard/components/connection-badge';
import Link from 'next/link';
import { BudgetLimitForm } from './budget-limit-form';
import { LanguageRuleToggle } from './language-rule-toggle';

export function SettingsContent({ data }: { data: SettingsLoaderResult }) {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-foreground">設定</h1>
				<p className="text-sm text-muted-foreground">
					GitHub App 設定の確認、言語別ルールの ON/OFF、日次予算上限を変更できます。
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-base">
						<span>GitHub App</span>
						<ConnectionBadge connected={data.githubApp.connected} />
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">GITHUB_APP_ID</span>
						<Badge variant={data.githubApp.appIdConfigured ? 'default' : 'outline'}>
							{data.githubApp.appIdConfigured ? '設定済み' : '未設定'}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">GITHUB_APP_PRIVATE_KEY</span>
						<Badge variant={data.githubApp.privateKeyConfigured ? 'default' : 'outline'}>
							{data.githubApp.privateKeyConfigured ? '設定済み' : '未設定'}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground pt-2">
						GitHub App の本格統合は Phase 6 で対応予定。現状は環境変数の存在のみを判定しています。
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">言語別ルール</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="divide-y divide-border">
						{data.languageRules.map((rule) => (
							<li
								key={rule.language}
								className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
							>
								<span className="text-sm font-medium text-foreground">{rule.language}</span>
								<LanguageRuleToggle language={rule.language} enabled={rule.enabled} />
							</li>
						))}
					</ul>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">予算管理</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{data.budget ? (
						<p className="text-xs text-muted-foreground">
							本日の使用量: ${data.budget.usedUsd.toFixed(3)} / 現在の上限 $
							{data.budget.dailyLimitUsd.toFixed(2)}
						</p>
					) : (
						<p className="text-xs text-muted-foreground">本日の予算は未設定です。</p>
					)}
					<BudgetLimitForm initialLimit={data.budget ? data.budget.dailyLimitUsd : null} />
				</CardContent>
			</Card>
		</div>
	);
}
