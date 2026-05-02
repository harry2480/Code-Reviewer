import type { SupportedLanguage } from '../../domain/models/language-expert.model';
import type { ReviewSessionStatus } from '../../domain/models/review-session.model';

export type { SupportedLanguage, ReviewSessionStatus };

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
	'typescript',
	'python',
	'swift',
	'php',
	'go',
	'rust',
];

export const REVIEW_SESSION_STATUSES: ReviewSessionStatus[] = ['success', 'failed', 'skipped'];

export function parseLanguage(raw: unknown): SupportedLanguage | undefined {
	if (typeof raw !== 'string') return undefined;
	return SUPPORTED_LANGUAGES.includes(raw as SupportedLanguage)
		? (raw as SupportedLanguage)
		: undefined;
}

export function parseStatus(raw: unknown): ReviewSessionStatus | undefined {
	if (typeof raw !== 'string') return undefined;
	return REVIEW_SESSION_STATUSES.includes(raw as ReviewSessionStatus)
		? (raw as ReviewSessionStatus)
		: undefined;
}
