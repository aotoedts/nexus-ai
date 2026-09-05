import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const user = await prisma.user.findFirst();
console.log(user);
await prisma.$disconnect();
