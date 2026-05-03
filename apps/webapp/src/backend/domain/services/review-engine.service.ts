import type { Result } from '../models/result.model';
import { ReviewComment, type ReviewPerspective } from '../models/review-comment.model';

type RawComment = {
	filePath: unknown;
	lineNumber: unknown;
	severity: unknown;
	body: unknown;
	suggestedCode?: unknown;
};

const RESPONSE_FORMAT = `Return ONLY a JSON array of findings (no surrounding text). If no issues found, return [].
Each finding: {filePath: string, lineNumber: number (1-based), severity: "info"|"warning"|"critical", body: string, suggestedCode: string|null}.`;

const PERSPECTIVE_FOCUS: Record<ReviewPerspective, { role: string; bullets: string[] }> = {
	logic: {
		role: 'senior software engineer reviewing for Logic',
		bullets: [
			'Boundary value errors (off-by-one, missing null/undefined checks)',
			'Exception handling gaps (missing try/catch, unhandled promise rejections)',
			'Breaking changes (API contract violations, removed functionality)',
			'Logical correctness (wrong operators, unreachable code, incorrect conditions)',
		],
	},
	security: {
		role: 'senior security engineer reviewing for vulnerabilities',
		bullets: [
			'Secret/credential exposure (hardcoded API keys, passwords, tokens)',
			'Injection vulnerabilities (SQL injection, XSS, command injection)',
			'Insecure deserialization, path traversal, SSRF',
			'AuthN/AuthZ bypass and IDOR patterns',
		],
	},
	efficiency: {
		role: 'senior performance engineer reviewing for efficiency',
		bullets: [
			'Algorithmic complexity (O(n²) nested loops, wrong data structures)',
			'Redundant computations (missing memoization, repeated expensive ops)',
			'Inefficient lookups (array.find in a loop instead of a Map)',
			'Missing caching for repeated API calls or DB queries',
		],
	},
	readability: {
		role: 'senior software engineer reviewing for readability and maintainability',
		bullets: [
			'Naming conventions (unclear names, unexplained abbreviations)',
			'SOLID violations (large classes, tight coupling, missing abstractions)',
			'Code clarity (complex conditions, missing early returns)',
			'Dead code, commented-out code, overly verbose implementations',
		],
	},
};

function buildPerspectivePrompt(perspective: ReviewPerspective): string {
	const cfg = PERSPECTIVE_FOCUS[perspective];
	const bullets = cfg.bullets.map((b) => `- ${b}`).join('\n');
	return `You are a ${cfg.role}. Focus on:\n${bullets}\n\n${RESPONSE_FORMAT}`;
}

const SYSTEM_PROMPTS: Record<ReviewPerspective, string> = {
	logic: buildPerspectivePrompt('logic'),
	security: buildPerspectivePrompt('security'),
	efficiency: buildPerspectivePrompt('efficiency'),
	readability: buildPerspectivePrompt('readability'),
};

export class ReviewEngineService {
	readonly MAX_TOKENS = 2048;

	buildSystemPrompt(perspective: ReviewPerspective, languageRules = ''): string {
		return SYSTEM_PROMPTS[perspective] + languageRules;
	}

	buildUserPrompt(diff: string, commitMessages: string[]): string {
		const commitsSection =
			commitMessages.length > 0
				? `## Commit Messages\n${commitMessages.map((m) => `- ${m}`).join('\n')}\n\n`
				: '';
		return `${commitsSection}## Diff\n\`\`\`diff\n${diff}\n\`\`\``;
	}

	parseResponse(
		raw: string,
		perspective: ReviewPerspective,
		owner: string,
		repo: string,
		prNumber: number,
		sessionId: string,
	): Result<ReviewComment[], string> {
		let parsed: unknown;
		try {
			const jsonMatch = raw.match(/\[[\s\S]*\]/);
			if (!jsonMatch) {
				return { success: false, error: 'NO_JSON_ARRAY_FOUND' };
			}
			parsed = JSON.parse(jsonMatch[0]);
		} catch {
			return { success: false, error: 'INVALID_JSON' };
		}

		if (!Array.isArray(parsed)) {
			return { success: false, error: 'NOT_AN_ARRAY' };
		}

		const comments: ReviewComment[] = [];
		for (const item of parsed as RawComment[]) {
			const result = ReviewComment.create({
				id: crypto.randomUUID(),
				sessionId,
				filePath: typeof item.filePath === 'string' ? item.filePath : '',
				lineNumber: typeof item.lineNumber === 'number' ? item.lineNumber : 0,
				perspective,
				severity: typeof item.severity === 'string' ? item.severity : 'info',
				body: typeof item.body === 'string' ? item.body : '',
				suggestedCode: typeof item.suggestedCode === 'string' ? item.suggestedCode : null,
				prNumber,
				owner,
				repo,
			});
			if (result.success) {
				comments.push(result.value);
			}
		}

		return { success: true, value: comments };
	}
}
