import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaConversationRepository } from '../../../core/infrastructure/repositories/PrismaConversationRepository.js';
import { PrismaMemoryRepository } from '../../../core/infrastructure/repositories/PrismaMemoryRepository.js';
import { SendMessageUseCase } from '../../../core/application/use-cases/chat/SendMessageUseCase.js';
import { SaveMemoryUseCase } from '../../../core/application/use-cases/memory/SaveMemoryUseCase.js';
import { RetrieveRelevantMemoriesUseCase } from '../../../core/application/use-cases/memory/RetrieveRelevantMemoriesUseCase.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';
import { ImageGenerationService } from '../../../core/infrastructure/ai/ImageGenerationService.js';
import { env } from '../../../config/env.js';
import { JwtPayload } from '../plugins/auth.plugin.js';

const sendMessageSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    content: z.string().default(''),
    images: z.array(z.string()).max(4).optional(),
  })
  .refine((data) => data.content.trim().length > 0 || (data.images && data.images.length > 0), {
    message: 'Envie um texto ou pelo menos uma imagem',
  });

export async function chatRoutes(app: FastifyInstance, opts: { model: IModelAdapter }) {
  const conversationRepository = new PrismaConversationRepository();
  const memoryRepository = new PrismaMemoryRepository();
  const saveMemory = new SaveMemoryUseCase(memoryRepository, opts.model);
  const retrieveMemories = new RetrieveRelevantMemoriesUseCase(memoryRepository, opts.model);
  const imageGenerationService = env.OPENROUTER_API_KEY
    ? new ImageGenerationService(env.OPENROUTER_API_KEY, env.IMAGE_GENERATION_MODEL)
    : undefined;
  const sendMessage = new SendMessageUseCase(
    conversationRepository,
    opts.model,
    retrieveMemories,
    saveMemory,
    imageGenerationService,
  );

  app.post('/chat/messages', { onRequest: [app.authenticate] }, async (request) => {
    const body = sendMessageSchema.parse(request.body);
    return sendMessage.execute({ userId: request.user.sub, ...body });
  });

  // Navegadores nao permitem headers customizados no handshake do
  // WebSocket, entao o JWT vem via query string e e verificado manualmente.
  app.get('/ws/chat', { websocket: true }, (socket, request) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);
    let user: JwtPayload;
    try {
      user = app.jwt.verify<JwtPayload>(token);
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Token invalido ou expirado' }));
      socket.close();
      return;
    }

    socket.on('message', async (raw: Buffer) => {
      try {
        const payload = sendMessageSchema.parse(JSON.parse(raw.toString()));
        const result = await sendMessage.execute({
          userId: user.sub,
          ...payload,
          onToken: (token) => socket.send(JSON.stringify({ type: 'token', token })),
        });
        const imageUrl = (result.assistantMessage.metadata as any)?.imageUrl;
        socket.send(JSON.stringify({
          type: 'done',
          conversationId: result.conversationId,
          message: result.assistantMessage.content,
          imageUrl,
        }));
      } catch (err) {
        socket.send(JSON.stringify({ type: 'error', message: (err as Error).message }));
      }
    });
  });
}
