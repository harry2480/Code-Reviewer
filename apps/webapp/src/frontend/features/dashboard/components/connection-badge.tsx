import { Badge } from '@/frontend/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

export function ConnectionBadge({ connected }: { connected: boolean }) {
	if (connected) {
		return (
			<Badge variant="default" className="gap-1">
				<CheckCircle2 className="h-3 w-3" />
				Connected
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className="gap-1 text-muted-foreground">
			<XCircle className="h-3 w-3" />
			Not Connected
		</Badge>
	);
}
