import type { ReviewSessionDetailLoaderResult } from '@/backend/presentation/loaders/review-session-detail.loader';
import { Badge } from '@/frontend/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { ScoreBadges } from './score-badges';

const SEVERITY_VARIANT: Record<string, 'default' | 'warn' | 'error' | 'outline'> = {
	info: 'outline',
	warning: 'warn',
	critical: 'error',
};

const STATUS_VARIANT: Record<string, 'default' | 'warn' | 'error' | 'outline'> = {
	success: 'default',
	skipped: 'outline',
	failed: 'error',
};

function formatJa(iso: string): string {
	return new Date(iso).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' });
}

export function ReviewDetailContent({ data }: { data: ReviewSessionDetailLoaderResult }) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<div className="flex items-center gap-2 flex-wrap">
					<Badge variant={STATUS_VARIANT[data.status] ?? 'outline'}>{data.status}</Badge>
					{data.detectedLanguages.map((lang) => (
						<Badge key={lang} variant="secondary">
							{lang}
						</Badge>
					))}
				</div>
				<h1 className="text-2xl font-bold text-foreground">{data.prTitle}</h1>
				<a
					href={data.prUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
				>
					{data.owner}/{data.repo}#{data.prNumber}
					<ExternalLink className="h-3 w-3" />
				</a>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">サマリー</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
					<div>
						<p className="text-xs text-muted-foreground">4 つの眼スコア</p>
						<div className="mt-1">
							<ScoreBadges scores={data.scores} />
						</div>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">トータルトークン</p>
						<p className="font-mono text-base text-foreground">
							{data.totalTokens.toLocaleString()}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">実行時間</p>
						<p className="font-mono text-base text-foreground">{data.durationMs} ms</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">実行時刻</p>
						<p className="text-base text-foreground">{formatJa(data.createdAt)}</p>
					</div>
				</CardContent>
			</Card>

			{data.analysisChain ? (
				<Card>
					<CardContent className="pt-6">
						<details className="text-sm">
							<summary className="cursor-pointer font-semibold text-foreground">
								推論プロセス（Analysis Chain）
							</summary>
							<pre className="mt-3 whitespace-pre-wrap bg-muted/50 p-3 rounded text-xs text-foreground">
								{data.analysisChain}
							</pre>
						</details>
					</CardContent>
				</Card>
			) : null}

			<div className="space-y-3">
				<h2 className="text-lg font-semibold text-foreground">
					レビューコメント（{data.comments.length} 件）
				</h2>
				{data.comments.length === 0 ? (
					<p className="text-sm text-muted-foreground">指摘はありません。</p>
				) : (
					<ul className="space-y-3">
						{data.comments.map((c) => (
							<li key={c.id} className="rounded-card border-l-4 border-primary bg-primary/5 p-4">
								<div className="flex items-center gap-2 flex-wrap mb-2">
									<Badge variant="default">{c.perspective}</Badge>
									<Badge variant={SEVERITY_VARIANT[c.severity] ?? 'outline'}>{c.severity}</Badge>
									<span className="text-xs text-muted-foreground font-mono">
										{c.filePath}:{c.lineNumber}
									</span>
								</div>
								<p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
								{c.suggestedCode ? (
									<pre className="mt-3 bg-muted p-2 rounded text-xs overflow-auto">
										{c.suggestedCode}
									</pre>
								) : null}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
