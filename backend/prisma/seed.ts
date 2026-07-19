import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexusai.local' },
    update: {},
    create: {
      id: uuid(),
      name: 'Administrador Nexus',
      email: 'admin@nexusai.local',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Usuario admin criado/existente:', admin.email, '(senha: admin123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
