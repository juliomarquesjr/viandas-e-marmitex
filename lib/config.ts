import prisma from './prisma';

export interface SystemConfigData {
  // Configurações de contato
  contact_address_street: string;
  contact_address_number: string;
  contact_address_neighborhood: string;
  contact_address_city: string;
  contact_address_state: string;
  contact_address_zipcode: string;
  contact_address_complement: string;
  contact_phone_mobile: string;
  contact_phone_landline: string;
  
  // Configurações de marca
  branding_system_title: string;
  branding_pdv_title: string;
  branding_logo_url: string;
}

// Cache para configurações (evita múltiplas consultas ao banco)
let configCache: SystemConfigData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca todas as configurações do sistema
 */
export async function getSystemConfigs(): Promise<SystemConfigData> {
  const now = Date.now();
  
  // Verificar se o cache ainda é válido
  if (configCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return configCache;
  }

  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });

    // Converter array de configurações para objeto
    const configData: SystemConfigData = {
      contact_address_street: '',
      contact_address_number: '',
      contact_address_neighborhood: '',
      contact_address_city: '',
      contact_address_state: '',
      contact_address_zipcode: '',
      contact_address_complement: '',
      contact_phone_mobile: '',
      contact_phone_landline: '',
      branding_system_title: 'Viandas e Marmitex',
      branding_pdv_title: 'PDV - Viandas e Marmitex',
      branding_logo_url: '',
    };

    configs.forEach(config => {
      const key = config.key as keyof SystemConfigData;
      if (key in configData) {
        configData[key] = config.value || '';
      }
    });

    // Atualizar cache
    configCache = configData;
    cacheTimestamp = now;

    return configData;
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    
    // Retornar valores padrão em caso de erro
    return {
      contact_address_street: '',
      contact_address_number: '',
      contact_address_neighborhood: '',
      contact_address_city: '',
      contact_address_state: '',
      contact_address_zipcode: '',
      contact_address_complement: '',
      contact_phone_mobile: '',
      contact_phone_landline: '',
      branding_system_title: 'Viandas e Marmitex',
      branding_pdv_title: 'PDV - Viandas e Marmitex',
      branding_logo_url: '',
    };
  }
}

/**
 * Busca uma configuração específica
 */
export async function getSystemConfig(key: keyof SystemConfigData): Promise<string> {
  const configs = await getSystemConfigs();
  return configs[key] || '';
}

/**
 * Invalida o cache de configurações (chamar após atualizações)
 */
export function invalidateConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
}

/**
 * Formata o endereço completo
 */
export async function getFormattedAddress(): Promise<string> {
  const configs = await getSystemConfigs();
  
  const parts = [
    configs.contact_address_street,
    configs.contact_address_number,
    configs.contact_address_neighborhood,
    configs.contact_address_city,
    configs.contact_address_state,
    configs.contact_address_zipcode,
    configs.contact_address_complement
  ].filter(part => part && part.trim());

  return parts.join(', ');
}

/**
 * Formata os telefones
 */
export async function getFormattedPhones(): Promise<{ mobile: string; landline: string }> {
  const configs = await getSystemConfigs();
  
  return {
    mobile: configs.contact_phone_mobile || '',
    landline: configs.contact_phone_landline || ''
  };
}
