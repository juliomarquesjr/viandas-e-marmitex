import prisma from '../lib/prisma';

async function main() {
  // Obter categorias
  const categories = await prisma.category.findMany();
  
  // Mapear categorias por nome para facilitar a associação
  const categoryMap = categories.reduce((acc, category) => {
    acc[category.name] = category.id;
    return acc;
  }, {} as Record<string, string>);

  const products = [
    {
      name: "Prato Executivo",
      barcode: "7891234567890",
      categoryId: categoryMap["Pratos Principais"],
      priceCents: 2500,
      description: "Arroz, feijão, bife e salada",
      stockEnabled: true,
      stock: 50,
      imageUrl: "https://picsum.photos/seed/prato-executivo/200/200",
      productType: "sellable",
      variableProduct: false,
      active: true
    },
    {
      name: "Salada Caesar",
      barcode: "7891234567891",
      categoryId: categoryMap["Entradas"],
      priceCents: 1200,
      description: "Alface, croutons, parmesão e molho caesar",
      stockEnabled: true,
      stock: 30,
      imageUrl: "https://picsum.photos/seed/salada-caesar/200/200",
      productType: "sellable",
      variableProduct: false,
      active: true
    },
    {
      name: "Pudim de Leite",
      barcode: "7891234567892",
      categoryId: categoryMap["Sobremesas"],
      priceCents: 800,
      description: "Pudim tradicional de leite condensado",
      stockEnabled: false,
      imageUrl: "https://picsum.photos/seed/pudim-leite/200/200",
      productType: "sellable",
      variableProduct: false,
      active: true
    },
    {
      name: "Queijo Ralado Extra",
      barcode: "7891234567893",
      categoryId: categoryMap["Acompanhamentos"],
      priceCents: 300,
      description: "Queijo parmesão ralado para complementar pratos",
      stockEnabled: true,
      stock: 100,
      imageUrl: "https://picsum.photos/seed/queijo-ralado/200/200",
      productType: "addon",
      variableProduct: false,
      active: true
    },
    {
      name: "Molho Especial",
      barcode: "7891234567894",
      categoryId: categoryMap["Acompanhamentos"],
      priceCents: 200,
      description: "Molho caseiro especial para acompanhar pratos",
      stockEnabled: false,
      imageUrl: "https://picsum.photos/seed/molho-especial/200/200",
      productType: "addon",
      variableProduct: false,
      active: true
    },
    {
      name: "Suco de Laranja",
      barcode: "7891234567895",
      categoryId: categoryMap["Bebidas"],
      priceCents: 600,
      description: "Suco de laranja natural",
      stockEnabled: true,
      stock: 25,
      imageUrl: "https://picsum.photos/seed/suco-laranja/200/200",
      productType: "sellable",
      variableProduct: false,
      active: true
    }
  ];

  for (const productData of products) {
    const existingProduct = await prisma.product.findFirst({
      where: { barcode: productData.barcode }
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: productData
      });
      console.log(`Created product: ${productData.name}`);
    } else {
      console.log(`Product already exists: ${productData.name}`);
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