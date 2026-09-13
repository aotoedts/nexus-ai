const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface GeneratedImage {
  dataUrl: string;
}

export class ImageGenerationService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'google/gemini-2.5-flash-image-preview') {
    if (!apiKey) {
      throw new Error('OpenRouter API key e obrigatoria para geracao de imagem');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(prompt: string): Promise<GeneratedImage> {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://nexus-ai.com',
        'X-Title': 'Nexus AI',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao gerar imagem via OpenRouter: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;
    const message = data.choices?.[0]?.message;
    const imageUrl = message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('Resposta da OpenRouter nao contem imagem gerada');
    }

    return { dataUrl: imageUrl };
  }
}
