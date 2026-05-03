'use client';

import type { TokenLedgerEntry } from '@/backend/presentation/types/budget-frontend.types';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/frontend/components/ui/table';
import { Download } from 'lucide-react';

type Props = {
	entries: TokenLedgerEntry[];
};

export function TokenLedgerTable({ entries }: Props) {
	const handleExport = () => {
		const header = [
			'timestamp',
			'sessionId',
			'prId',
			'model',
			'perspective',
			'inputTokens',
			'outputTokens',
			'totalTokens',
			'costUsd',
		];
		const rows = entries.map((e) => [
			e.timestamp,
			e.sessionId,
			e.prId,
			e.model,
			e.perspective,
			String(e.inputTokens),
			String(e.outputTokens),
			String(e.totalTokens),
			e.costUsd.toFixed(6),
		]);
		const csv = [header, ...rows]
			.map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
			.join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `token-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-base">本日のトークン消費ログ</CardTitle>
				<Button variant="outline" size="sm" onClick={handleExport} disabled={entries.length === 0}>
					<Download className="mr-2 h-4 w-4" />
					CSV エクスポート
				</Button>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						本日のトークン消費はまだ記録されていません。
					</p>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>時刻</TableHead>
									<TableHead>PR</TableHead>
									<TableHead>視点</TableHead>
									<TableHead>モデル</TableHead>
									<TableHead className="text-right">入力</TableHead>
									<TableHead className="text-right">出力</TableHead>
									<TableHead className="text-right">コスト (USD)</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map((entry, idx) => (
									<TableRow key={`${entry.sessionId}-${entry.perspective}-${idx}`}>
										<TableCell className="font-mono text-xs">
											{new Date(entry.timestamp).toLocaleTimeString('ja-JP')}
										</TableCell>
										<TableCell className="font-mono text-xs">{entry.prId}</TableCell>
										<TableCell>{entry.perspective}</TableCell>
										<TableCell className="font-mono text-xs">{entry.model}</TableCell>
										<TableCell className="text-right">
											{entry.inputTokens.toLocaleString()}
										</TableCell>
										<TableCell className="text-right">
											{entry.outputTokens.toLocaleString()}
										</TableCell>
										<TableCell className="text-right font-mono">
											${entry.costUsd.toFixed(6)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
