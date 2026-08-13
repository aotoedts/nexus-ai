import { v4 as uuid } from 'uuid';
import { IConversationRepository } from '../../../domain/repositories/IConversationRepository.js';
import { IModelAdapter, ChatMessageInput } from '../../../infrastructure/ai/IModelAdapter.js';
import { Message } from '../../../domain/entities/Message.js';
import { Conversation } from '../../../domain/entities/Conversation.js';
import { RetrieveRelevantMemoriesUseCase } from '../memory/RetrieveRelevantMemoriesUseCase.js';
import { SaveMemoryUseCase } from '../memory/SaveMemoryUseCase.js';
import { NotFoundError } from '../../../../shared/errors/AppError.js';

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

    const result = input.onToken
      ? await this.model.stream(chatMessages, input.onToken)
      : await this.model.complete(chatMessages);

    const assistantMessage = await this.conversationRepository.addMessage(
      Message.create({
        id: uuid(),
        conversationId,
        role: 'ASSISTANT',
        content: result.content,
        createdAt: new Date(),
      }),
    );

    await this.saveMemory.execute({
      userId: input.userId,
      content: `Usuario perguntou: "${input.content}". Assistente respondeu: "${result.content.slice(0, 200)}"`,
      kind: 'event',
    });

    return { conversationId, userMessage, assistantMessage };
  }
}
