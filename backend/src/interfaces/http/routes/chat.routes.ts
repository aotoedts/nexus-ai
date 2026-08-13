import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaConversationRepository } from '../../../core/infrastructure/repositories/PrismaConversationRepository.js';
import { PrismaMemoryRepository } from '../../../core/infrastructure/repositories/PrismaMemoryRepository.js';
import { SendMessageUseCase } from '../../../core/application/use-cases/chat/SendMessageUseCase.js';
import { SaveMemoryUseCase } from '../../../core/application/use-cases/memory/SaveMemoryUseCase.js';
import { RetrieveRelevantMemoriesUseCase } from '../../../core/application/use-cases/memory/RetrieveRelevantMemoriesUseCase.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';
import { JwtPayload } from '../plugins/auth.plugin.js';

const sendMessageSchema = z.object({ conversationId: z.string().uuid().optional(), content: z.string().min(1) });

export async function chatRoutes(app: FastifyInstance, opts: { model: IModelAdapter }) {
  const conversationRepository = new PrismaConversationRepository();
  const memoryRepository = new PrismaMemoryRepository();
  const saveMemory = new SaveMemoryUseCase(memoryRepository, opts.model);
  const retrieveMemories = new RetrieveRelevantMemoriesUseCase(memoryRepository, opts.model);
  const sendMessage = new SendMessageUseCase(conversationRepository, opts.model, retrieveMemories, saveMemory);

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
        socket.send(JSON.stringify({ type: 'done', conversationId: result.conversationId, message: result.assistantMessage.content }));
      } catch (err) {
        socket.send(JSON.stringify({ type: 'error', message: (err as Error).message }));
      }
    });
  });
}
