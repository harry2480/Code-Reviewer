import { LanguageExpert } from '../models/language-expert.model';

export class PolyglotExpertService {
	detectLanguages(diff: string): LanguageExpert[] {
		const regex = /^diff --git a\/(.+?) b\//gm;
		const languageMap = new Map<string, LanguageExpert>();
		let match: RegExpExecArray | null = regex.exec(diff);
		while (match !== null) {
			const ext = match[1].split('.').pop() ?? '';
			const expert = LanguageExpert.fromExtension(ext);
			if (expert && !languageMap.has(expert.language)) {
				languageMap.set(expert.language, expert);
			}
			match = regex.exec(diff);
		}
		return Array.from(languageMap.values());
	}

	buildLanguageRulesPrompt(experts: LanguageExpert[]): string {
		if (experts.length === 0) return '';
		const sections = experts.map(
			(e) => `### ${e.language}\n${e.rules.map((r) => `- ${r}`).join('\n')}`,
		);
		return `\n\n## Language-Specific Rules\n${sections.join('\n\n')}`;
	}
}
