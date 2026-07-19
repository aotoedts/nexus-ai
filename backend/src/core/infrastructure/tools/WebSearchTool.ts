import { ITool, ToolResult } from './ITool.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Ferramenta de pesquisa na internet. Suporta multiplos providers por
 * tras da mesma interface (Tavily, SerpAPI, ou um "mock" para dev/test
 * sem depender de chave de API externa).
 */
export class WebSearchTool implements ITool {
  readonly name = 'web_search';
  readonly description = 'Pesquisa na internet e retorna os resultados mais relevantes.';
  readonly parametersSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Termo de busca' },
      maxResults: { type: 'number', description: 'Numero maximo de resultados', default: 5 },
    },
    required: ['query'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const query = String(args.query ?? '');
    const maxResults = Number(args.maxResults ?? 5);

    if (!query.trim()) {
      return { success: false, error: 'Query de busca vazia' };
    }

    try {
      const results = await this.search(query, maxResults);
      return { success: true, data: { results } };
    } catch (err) {
      logger.error({ err }, 'Erro na WebSearchTool');
      return { success: false, error: 'Falha ao pesquisar na internet' };
    }
  }

  private async search(query: string, maxResults: number): Promise<WebSearchResultItem[]> {
    switch (env.WEB_SEARCH_PROVIDER) {
      case 'tavily':
        return this.searchTavily(query, maxResults);
      case 'serpapi':
        return this.searchSerpApi(query, maxResults);
      case 'mock':
      default:
        return this.searchMock(query, maxResults);
    }
  }

  private async searchTavily(query: string, maxResults: number): Promise<WebSearchResultItem[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: env.WEB_SEARCH_API_KEY, query, max_results: maxResults }),
    });
    const data = (await response.json()) as any;
    return (data.results ?? []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.content }));
  }

  private async searchSerpApi(query: string, maxResults: number): Promise<WebSearchResultItem[]> {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${env.WEB_SEARCH_API_KEY}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;
    return (data.organic_results ?? [])
      .slice(0, maxResults)
      .map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet }));
  }

  private async searchMock(query: string, maxResults: number): Promise<WebSearchResultItem[]> {
    return Array.from({ length: Math.min(maxResults, 3) }).map((_, i) => ({
      title: `Resultado simulado ${i + 1} para "${query}"`,
      url: `https://example.com/search?q=${encodeURIComponent(query)}&r=${i + 1}`,
      snippet:
        'Configure WEB_SEARCH_PROVIDER e WEB_SEARCH_API_KEY para obter resultados reais da internet.',
    }));
  }
}
