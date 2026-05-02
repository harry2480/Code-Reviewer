import type { CallerReference } from '../models/pull-request-context.model';
import type { Result } from '../models/result.model';
import { ReviewComment, type ReviewPerspective } from '../models/review-comment.model';

type RawComment = {
	filePath: unknown;
	lineNumber: unknown;
	severity: unknown;
	body: unknown;
	suggestedCode?: unknown;
};

const SYSTEM_PROMPTS: Record<ReviewPerspective, string> = {
	logic: `You are a senior software engineer reviewing a GitHub Pull Request from a Logic perspective. Your focus is on:
- Boundary value errors (off-by-one, null/undefined checks missing)
- Exception handling (missing try/catch, unhandled promise rejections)
- Breaking changes (API contract violations, removed functionality)
- Logical correctness (incorrect conditions, wrong operators, unreachable code)

Review the provided diff and identify logic issues. Return ONLY a JSON array of findings.
Each finding must have: filePath (string), lineNumber (number, 1-based), severity ("info"|"warning"|"critical"), body (string), suggestedCode (string|null).
If no issues found, return [].
Return ONLY valid JSON — no explanation text outside the array.`,

	security: `You are a senior security engineer reviewing a GitHub Pull Request for vulnerabilities. Your focus is on:
- Secret/credential exposure (hardcoded API keys, passwords, tokens)
- Injection vulnerabilities (SQL injection, XSS, command injection)
- Insecure deserialization, path traversal, SSRF
- Authentication/authorization bypass patterns
- Insecure direct object references

Review the provided diff and identify security issues. Return ONLY a JSON array of findings.
Each finding must have: filePath (string), lineNumber (number, 1-based), severity ("info"|"warning"|"critical"), body (string), suggestedCode (string|null).
If no issues found, return [].
Return ONLY valid JSON — no explanation text outside the array.`,

	efficiency: `You are a senior performance engineer reviewing a GitHub Pull Request for efficiency issues. Your focus is on:
- Algorithmic complexity (O(n²) nested loops, inefficient data structure choices)
- Redundant computations (repeated expensive operations, missing memoization)
- Inefficient patterns (array.find in a loop instead of a Map lookup)
- Missing caching for repeated API calls or DB queries

Review the provided diff and identify efficiency issues. Return ONLY a JSON array of findings.
Each finding must have: filePath (string), lineNumber (number, 1-based), severity ("info"|"warning"|"critical"), body (string), suggestedCode (string|null).
If no issues found, return [].
Return ONLY valid JSON — no explanation text outside the array.`,

	readability: `You are a senior software engineer reviewing a GitHub Pull Request for readability and maintainability. Your focus is on:
- Naming conventions (unclear names, unexplained abbreviations)
- SOLID principle violations (large classes, tight coupling, missing abstractions)
- Code clarity (complex conditions that could be simplified, missing early returns)
- Dead code, commented-out code, overly verbose implementations

Review the provided diff and identify readability issues. Return ONLY a JSON array of findings.
Each finding must have: filePath (string), lineNumber (number, 1-based), severity ("info"|"warning"|"critical"), body (string), suggestedCode (string|null).
If no issues found, return [].
Return ONLY valid JSON — no explanation text outside the array.`,
};

export class ReviewEngineService {
	readonly MAX_TOKENS = 2048;

	buildSystemPrompt(perspective: ReviewPerspective, languageRules = ''): string {
		return SYSTEM_PROMPTS[perspective] + languageRules;
	}

	buildUserPrompt(
		diff: string,
		commitMessages: string[],
		callerReferences: CallerReference[] = [],
	): string {
		const commitsSection =
			commitMessages.length > 0
				? `## Commit Messages\n${commitMessages.map((m) => `- ${m}`).join('\n')}\n\n`
				: '';
		const callersSection =
			callerReferences.length > 0
				? `## Call Sites of Changed Symbols\n${callerReferences.map((r) => `- \`${r.symbol}\` in \`${r.filePath}:${r.lineNumber}\``).join('\n')}\n\n`
				: '';
		return `${commitsSection}${callersSection}## Diff\n\`\`\`diff\n${diff}\n\`\`\``;
	}

	parseResponse(
		raw: string,
		perspective: ReviewPerspective,
		owner: string,
		repo: string,
		prNumber: number,
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
