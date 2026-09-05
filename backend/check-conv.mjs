import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const conv = await prisma.conversation.findFirst();
console.log('Primeira conversa qualquer:', conv);

const user = await prisma.user.findFirst({ where: { email: 'testefinal4000@gmail.com' } });
console.log('Usuário:', user);

await prisma.$disconnect();
