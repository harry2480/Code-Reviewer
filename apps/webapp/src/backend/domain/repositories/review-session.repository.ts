import type { SupportedLanguage } from '../models/language-expert.model';
import type { ReviewSession, ReviewSessionStatus } from '../models/review-session.model';

export type ReviewSessionListFilter = {
	language?: SupportedLanguage;
	status?: ReviewSessionStatus;
};

export type ReviewSessionPage = {
	sessions: ReviewSession[];
	total: number;
};

export interface ReviewSessionRepository {
	save(session: ReviewSession): Promise<void>;
	findById(id: string): Promise<ReviewSession | null>;
	findRecent(limit: number): Promise<ReviewSession[]>;
	findPaginated(params: {
		page: number;
		perPage: number;
		filter?: ReviewSessionListFilter;
	}): Promise<ReviewSessionPage>;
	countByDateRange(start: Date, end: Date): Promise<number>;
}
