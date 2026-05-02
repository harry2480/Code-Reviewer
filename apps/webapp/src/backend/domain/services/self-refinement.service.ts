import type { AiGateway } from '../gateways/ai.gateway';
import type { ReviewComment } from '../models/review-comment.model';
import { SELF_REFINEMENT_SYSTEM_PROMPT } from './prompts/self-refinement.prompt';

export type RefinementOutcome = {
	acceptedComments: ReviewComment[];
	rejectedComments: { comment: ReviewComment; reason: string }[];
};

type VerificationItem = {
	id: string;
	verdict: 'accept' | 'reject';
	reason: string;
};

export class SelfRefinementService {
	constructor(private readonly ai: AiGateway) {}

	async refine(params: {
		diff: string;
		candidateComments: ReviewComment[];
	}): Promise<RefinementOutcome> {
		const { diff, candidateComments } = params;

		if (candidateComments.length === 0) {
			return { acceptedComments: [], rejectedComments: [] };
		}

		const { systemPrompt, userPrompt } = this.buildVerificationPrompt(diff, candidateComments);

		const raw = await this.ai.generate({
			systemPrompt,
			userPrompt,
			maxTokens: 1024,
		});

		const verdicts = this.parseVerdicts(raw);
		if (!verdicts) {
			// fail-open: return all candidates as accepted
			return { acceptedComments: candidateComments, rejectedComments: [] };
		}

		const verdictMap = new Map(verdicts.map((v) => [v.id, v]));
		const acceptedComments: ReviewComment[] = [];
		const rejectedComments: { comment: ReviewComment; reason: string }[] = [];

		for (const comment of candidateComments) {
			const verdict = verdictMap.get(comment.id);
			if (!verdict || verdict.verdict === 'accept') {
				acceptedComments.push(comment);
			} else {
				rejectedComments.push({ comment, reason: verdict.reason });
			}
		}

		return { acceptedComments, rejectedComments };
	}

	private buildVerificationPrompt(
		diff: string,
		comments: ReviewComment[],
	): { systemPrompt: string; userPrompt: string } {
		const commentsJson = JSON.stringify(
			comments.map((c) => ({
				id: c.id,
				filePath: c.filePath,
				lineNumber: c.lineNumber,
				perspective: c.perspective,
				severity: c.severity,
				body: c.body,
				suggestedCode: c.suggestedCode,
			})),
			null,
			2,
		);

		const userPrompt = `## Diff\n\`\`\`diff\n${diff}\n\`\`\`\n\n## Review Comments to Validate\n\`\`\`json\n${commentsJson}\n\`\`\``;

		return { systemPrompt: SELF_REFINEMENT_SYSTEM_PROMPT, userPrompt };
	}

	private parseVerdicts(raw: string): VerificationItem[] | null {
		try {
			const jsonMatch = raw.match(/\[[\s\S]*\]/);
			if (!jsonMatch) return null;
			const parsed: unknown = JSON.parse(jsonMatch[0]);
			if (!Array.isArray(parsed)) return null;

			return parsed.filter(
				(item): item is VerificationItem =>
					typeof item === 'object' &&
					item !== null &&
					typeof (item as Record<string, unknown>).id === 'string' &&
					((item as Record<string, unknown>).verdict === 'accept' ||
						(item as Record<string, unknown>).verdict === 'reject'),
			);
		} catch {
			return null;
		}
	}
}
