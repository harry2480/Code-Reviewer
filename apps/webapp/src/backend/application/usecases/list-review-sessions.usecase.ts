import type { SupportedLanguage } from '../../domain/models/language-expert.model';
import type { ReviewSessionStatus } from '../../domain/models/review-session.model';
import type {
	ReviewSessionPage,
	ReviewSessionRepository,
} from '../../domain/repositories/review-session.repository';

export type ListReviewSessionsInput = {
	page: number;
	perPage: number;
	language?: SupportedLanguage;
	status?: ReviewSessionStatus;
};

export class ListReviewSessionsUseCase {
	constructor(private readonly reviewSessionRepository: ReviewSessionRepository) {}

	async execute(input: ListReviewSessionsInput): Promise<ReviewSessionPage> {
		const safePage = Math.max(1, Math.floor(input.page));
		const safePerPage = Math.max(1, Math.min(100, Math.floor(input.perPage)));

		return this.reviewSessionRepository.findPaginated({
			page: safePage,
			perPage: safePerPage,
			filter: { language: input.language, status: input.status },
		});
	}
}
