import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Habilita o agente para o usuário de teste
await prisma.user.update({
  where: { id: '10fbe100-4ef6-49a1-a540-b61c90dc34f6' },
  data: { agentEnabled: true },
});

// Cria uma conversa nova para esse usuário
const conv = await prisma.conversation.create({
  data: {
    userId: '10fbe100-4ef6-49a1-a540-b61c90dc34f6',
    title: 'Teste do Agente',
  },
});

console.log('Conversa criada:', conv);
await prisma.$disconnect();
