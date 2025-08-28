import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de presets de produtos para clientes...');

  try {
    // Buscar alguns clientes existentes
    const customers = await prisma.customer.findMany({
      take: 3,
      where: { active: true }
    });

    if (customers.length === 0) {
      console.log('❌ Nenhum cliente encontrado. Execute primeiro o seed de clientes.');
      return;
    }

    // Buscar alguns produtos existentes
    const products = await prisma.product.findMany({
      take: 5,
      where: { 
        active: true,
        productType: 'sellable'
      }
    });

    if (products.length === 0) {
      console.log('❌ Nenhum produto encontrado. Execute primeiro o seed de produtos.');
      return;
    }

    console.log(`📋 Encontrados ${customers.length} clientes e ${products.length} produtos`);

    // Criar presets para cada cliente
    for (const customer of customers) {
      console.log(`\n👤 Configurando presets para cliente: ${customer.name}`);
      
      // Limpar presets existentes
      await prisma.customerProductPreset.updateMany({
        where: { customerId: customer.id },
        data: { active: false }
      });

      // Criar novos presets (2-3 produtos por cliente)
      const numPresets = Math.floor(Math.random() * 3) + 2;
      const selectedProducts = products
        .sort(() => 0.5 - Math.random())
        .slice(0, numPresets);

      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        await prisma.customerProductPreset.create({
          data: {
            customerId: customer.id,
            productId: product.id,
            quantity,
            active: true
          }
        });

        console.log(`  ✅ ${product.name} (${quantity}x)`);
      }
    }

    console.log('\n🎉 Seed de presets de produtos concluído com sucesso!');
    
    // Mostrar resumo
    const totalPresets = await prisma.customerProductPreset.count({
      where: { active: true }
    });
    
    console.log(`📊 Total de presets ativos: ${totalPresets}`);

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
