export interface ContextExtractorGateway {
	extractContext(owner: string, repo: string, filePath: string): Promise<string>;
}
