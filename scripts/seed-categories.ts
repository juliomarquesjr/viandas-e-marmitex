import prisma from '../lib/prisma';

async function main() {
  const categories = [
    { name: 'Pratos Principais' },
    { name: 'Entradas' },
    { name: 'Sobremesas' },
    { name: 'Bebidas' },
    { name: 'Acompanhamentos' }
  ];

  for (const categoryData of categories) {
    const existingCategory = await prisma.category.findFirst({
      where: { name: categoryData.name }
    });

    if (!existingCategory) {
      await prisma.category.create({
        data: categoryData
      });
      console.log(`Created category: ${categoryData.name}`);
    } else {
      console.log(`Category already exists: ${categoryData.name}`);
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