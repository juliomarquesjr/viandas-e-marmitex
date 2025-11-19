import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const customers = [
    {
      name: "João Silva",
      phone: "(11) 99999-9999",
      email: "joao.silva@email.com",
      doc: "123.456.789-00",
      address: {
        street: "Rua das Flores",
        number: "123",
        complement: "Apto 101",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zip: "01001-000"
      },
      active: true
    },
    {
      name: "Maria Oliveira",
      phone: "(21) 98888-8888",
      email: "maria.oliveira@email.com",
      doc: "987.654.321-00",
      address: {
        street: "Av. Brasil",
        number: "456",
        neighborhood: "Jardim América",
        city: "Rio de Janeiro",
        state: "RJ",
        zip: "20001-000"
      },
      active: true
    },
    {
      name: "Carlos Santos",
      phone: "(31) 97777-7777",
      email: "carlos.santos@email.com",
      doc: "456.789.123-00",
      address: {
        street: "Rua da Praça",
        number: "789",
        neighborhood: "Savassi",
        city: "Belo Horizonte",
        state: "MG",
        zip: "30110-000"
      },
      active: false
    },
    {
      name: "Ana Costa",
      phone: "(51) 96666-6666",
      email: "ana.costa@email.com",
      doc: "321.654.987-00",
      address: {
        street: "Rua dos Andradas",
        number: "101",
        complement: "Sala 501",
        neighborhood: "Centro",
        city: "Porto Alegre",
        state: "RS",
        zip: "90010-000"
      },
      active: true
    },
    {
      name: "Pedro Almeida",
      phone: "(41) 95555-5555",
      email: "pedro.almeida@email.com",
      doc: "159.753.486-00",
      address: {
        street: "Rua das Palmeiras",
        number: "202",
        neighborhood: "Batel",
        city: "Curitiba",
        state: "PR",
        zip: "80450-000"
      },
      active: true
    }
  ];

  for (const customerData of customers) {
    const existingCustomer = await prisma.customer.findFirst({
      where: { 
        OR: [
          { email: customerData.email },
          { phone: customerData.phone }
        ]
      }
    });

    if (!existingCustomer) {
      // Criar senha padrão baseada no telefone (sem formatação)
      const phoneWithoutFormatting = customerData.phone.replace(/\D/g, '');
      const defaultPassword = await bcrypt.hash(phoneWithoutFormatting, 10);
      
      await prisma.customer.create({
        data: {
          ...customerData,
          password: defaultPassword, // Senha padrão é o telefone sem formatação
          address: customerData.address ? JSON.stringify(customerData.address) : undefined
        }
      });
      console.log(`Created customer: ${customerData.name} - Senha padrão: ${phoneWithoutFormatting}`);
    } else {
      // Se o cliente já existe mas não tem senha, criar uma
      if (!existingCustomer.password) {
        const phoneWithoutFormatting = customerData.phone.replace(/\D/g, '');
        const defaultPassword = await bcrypt.hash(phoneWithoutFormatting, 10);
        
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: { password: defaultPassword }
        });
        console.log(`Updated customer password: ${customerData.name} - Senha padrão: ${phoneWithoutFormatting}`);
      } else {
        console.log(`Customer already exists: ${customerData.name}`);
      }
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