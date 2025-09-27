import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

// Configurações padrão do sistema
const defaultConfigs = [
  // Configurações de Contato
  {
    key: 'contact_address_street',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_address_number',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_address_neighborhood',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_address_city',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_address_state',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_address_zipcode',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_address_complement',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_phone_mobile',
    value: '',
    type: 'text',
    category: 'contact'
  },
  {
    key: 'contact_phone_landline',
    value: '',
    type: 'text',
    category: 'contact'
  },

  // Configurações de Marca
  {
    key: 'branding_system_title',
    value: 'Viandas e Marmitex',
    type: 'text',
    category: 'branding'
  },
  {
    key: 'branding_pdv_title',
    value: 'PDV - Viandas e Marmitex',
    type: 'text',
    category: 'branding'
  },
  {
    key: 'branding_logo_url',
    value: '',
    type: 'image',
    category: 'branding'
  }
];

async function seedConfigs() {
  console.log('🌱 Iniciando seed das configurações...');

  try {
    for (const config of defaultConfigs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          type: config.type,
          category: config.category
        },
        create: config
      });
      
      console.log(`✅ Configuração criada/atualizada: ${config.key}`);
    }

    console.log('🎉 Seed das configurações concluído!');
  } catch (error) {
    console.error('❌ Erro no seed das configurações:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedConfigs()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedConfigs };

