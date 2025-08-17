import prisma from '../lib/prisma';
import bcrypt from "bcryptjs";

async function main() {
  const users = [
    {
      name: "Administrador do Sistema",
      email: "admin@viandas.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
      active: true
    },
    {
      name: "Operador PDV",
      email: "pdv@viandas.com",
      password: await bcrypt.hash("pdv123", 10),
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