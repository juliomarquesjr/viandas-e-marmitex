import prisma from '../lib/prisma';

// Função auxiliar para hash de senha (placeholder)
async function hashPassword(password: string): Promise<string> {
  // Em produção, usar bcrypt ou outra biblioteca de hash
  return `hashed_${password}`;
}

async function main() {
  const users = [
    {
      name: "Administrador do Sistema",
      email: "admin@viandas.com",
      password: await hashPassword("admin123"),
      role: "admin",
      active: true
    },
    {
      name: "Operador PDV",
      email: "pdv@viandas.com",
      password: await hashPassword("pdv123"),
      role: "pdv",
      active: true
    }
  ];

  for (const userData of users) {
    const existingUser = await prisma.user.findFirst({
      where: { email: userData.email }
    });

    if (!existingUser) {
      await prisma.user.create({
        data: userData
      });
      console.log(`Created user: ${userData.name}`);
    } else {
      console.log(`User already exists: ${userData.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });