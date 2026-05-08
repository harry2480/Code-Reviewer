import type { ReviewPerspective } from '../models/review-comment.model';
import type { AiGateway } from './ai.gateway';

export interface AiRouter {
	forPerspective(perspective: ReviewPerspective): AiGateway;
}
