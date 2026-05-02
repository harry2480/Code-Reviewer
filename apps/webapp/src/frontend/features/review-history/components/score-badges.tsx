import { Badge } from '@/frontend/components/ui/badge';

type Scores = {
	logic: number | null;
	security: number | null;
	efficiency: number | null;
	readability: number | null;
};

function scoreVariant(score: number | null): 'default' | 'warn' | 'error' | 'outline' {
	if (score === null) return 'outline';
	if (score >= 8) return 'default';
	if (score >= 5) return 'warn';
	return 'error';
}

function display(score: number | null): string {
	return score === null ? '-' : `${score}/10`;
}

export function ScoreBadges({ scores }: { scores: Scores }) {
	return (
		<div className="flex flex-wrap gap-1">
			<Badge variant={scoreVariant(scores.logic)} className="font-mono">
				L {display(scores.logic)}
			</Badge>
			<Badge variant={scoreVariant(scores.security)} className="font-mono">
				S {display(scores.security)}
			</Badge>
			<Badge variant={scoreVariant(scores.efficiency)} className="font-mono">
				E {display(scores.efficiency)}
			</Badge>
			<Badge variant={scoreVariant(scores.readability)} className="font-mono">
				R {display(scores.readability)}
			</Badge>
		</div>
	);
}
