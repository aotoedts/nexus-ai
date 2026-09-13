import { v4 as uuid } from 'uuid';
import { IConversationRepository } from '../../../domain/repositories/IConversationRepository.js';
import { IModelAdapter, ChatMessageInput, ToolDefinition } from '../../../infrastructure/ai/IModelAdapter.js';
import { Message } from '../../../domain/entities/Message.js';
import { Conversation } from '../../../domain/entities/Conversation.js';
import { RetrieveRelevantMemoriesUseCase } from '../memory/RetrieveRelevantMemoriesUseCase.js';
import { SaveMemoryUseCase } from '../memory/SaveMemoryUseCase.js';
import { NotFoundError } from '../../../../shared/errors/AppError.js';
import { ImageGenerationService } from '../../../infrastructure/ai/ImageGenerationService.js';
import { logger } from '../../../../config/logger.js';

const GENERATE_IMAGE_TOOL: ToolDefinition = {
  name: 'generate_image',
  description:
    'Gera uma imagem a partir de uma descricao em texto. Use sempre que o usuario pedir para criar, gerar, desenhar, ' +
    'ilustrar ou fazer uma imagem de algo.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Descricao detalhada da imagem a ser gerada, em ingles, para melhor qualidade do resultado.',
      },
    },
    required: ['prompt'],
  },
};

export interface SendMessageInput {
  userId: string;
  conversationId?: string;
  content: string;
  images?: string[];
  onToken?: (token: string) => void;
}

export interface SendMessageOutput {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
}

export class SendMessageUseCase {
  constructor(
    private conversationRepository: IConversationRepository,
    private model: IModelAdapter,
    private retrieveMemories: RetrieveRelevantMemoriesUseCase,
    private saveMemory: SaveMemoryUseCase,
    private imageGenerationService?: ImageGenerationService,
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    let conversationId = input.conversationId;

    if (!conversationId) {
      const conversation = Conversation.create({
        id: uuid(),
        title: 'Nova conversa',
        userId: input.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const created = await this.conversationRepository.create(conversation);
      conversationId = created.id;
    } else {
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) throw new NotFoundError('Conversa');
    }

    const history = await this.conversationRepository.listMessages(conversationId, 20);
    const relevantMemories = await this.retrieveMemories.execute(input.userId, input.content);

    const userMessage = await this.conversationRepository.addMessage(
      Message.create({
        id: uuid(),
        conversationId,
        role: 'USER',
        content: input.content,
        createdAt: new Date(),
      }),
    );

    const memoryContext = relevantMemories.length
      ? `Memorias relevantes sobre o usuario:\n${relevantMemories.map((m) => `- ${m.content}`).join('\n')}`
      : '';

    const chatMessages: ChatMessageInput[] = [
      {
        role: 'system',
        content:
          'Voce e o Nexus AI, um assistente pessoal util, direto e gentil. ' +
          (memoryContext ? `\n${memoryContext}` : ''),
      },
      ...history.map((m) => ({ role: m.role.toLowerCase() as any, content: m.content })),
      {
        role: 'user',
        content:
          input.images && input.images.length
            ? [
                { type: 'text' as const, text: input.content },
                ...input.images.map((img) => ({
                  type: 'image_url' as const,
                  image_url: { url: img },
                })),
              ]
            : input.content,
      },
    ];

      const tools = this.imageGenerationService ? [GENERATE_IMAGE_TOOL] : undefined;

      const result = input.onToken
        ? await this.model.stream(chatMessages, input.onToken, { tools })
        : await this.model.complete(chatMessages, { tools });

      let finalContent = result.content;
      let metadata: Record<string, unknown> | undefined;

      const imageCall = result.toolCalls?.find((tc) => tc.toolName === 'generate_image');
      if (imageCall && this.imageGenerationService) {
        const prompt = String(imageCall.arguments.prompt ?? input.content);
        try {
          const generated = await this.imageGenerationService.generate(prompt);
          finalContent = finalContent && finalContent.trim().length > 0
            ? finalContent
            : `Aqui esta a imagem que voce pediu: "${prompt}"`;
          metadata = { imageUrl: generated.dataUrl, prompt };
        } catch (error) {
          logger.error({ err: error }, 'Falha ao gerar imagem');
          finalContent = 'Nao consegui gerar a imagem agora. Pode tentar novamente em instantes?';
        }
      }

      const assistantMessage = await this.conversationRepository.addMessage(
        Message.create({
          id: uuid(),
          conversationId,
          role: 'ASSISTANT',
          content: finalContent,
          metadata,
          createdAt: new Date(),
        }),
      );

    try {
      await this.saveMemory.execute({
        userId: input.userId,
        content: `Usuario perguntou: "${input.content}". Assistente respondeu: "${result.content.slice(0, 200)}"`,
        kind: 'event',
      });
    } catch (error) {
      // Falha ao salvar memoria (ex: embeddings nao suportados pelo provider
      // atual) nao deve derrubar a resposta ja gerada para o usuario.
      console.error('Falha ao salvar memoria, seguindo sem persistir:', error);
    }

    return { conversationId, userMessage, assistantMessage };
  }
}
