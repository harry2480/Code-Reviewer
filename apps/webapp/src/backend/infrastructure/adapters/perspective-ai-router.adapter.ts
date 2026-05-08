import type { AiRouter } from '../../domain/gateways/ai-router.gateway';
import type { AiGateway } from '../../domain/gateways/ai.gateway';
import type { ReviewPerspective } from '../../domain/models/review-comment.model';

/**
 * perspective ごとに使用する AiGateway を選択するルーター。
 * 各 perspective に最適化されたモデルチェーンを割り当てるために使う。
 */
export class PerspectiveAiRouter implements AiRouter {
	constructor(private readonly routes: Record<ReviewPerspective, AiGateway>) {}

	forPerspective(perspective: ReviewPerspective): AiGateway {
		return this.routes[perspective];
	}
}
