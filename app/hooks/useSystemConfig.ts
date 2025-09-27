import { useCallback, useEffect, useState } from 'react';

export interface SystemConfig {
  id: string;
  key: string;
  value: string | null;
  type: 'text' | 'json' | 'image';
  category: 'general' | 'contact' | 'branding';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigFormData {
  contact_address_street: string;
  contact_address_number: string;
  contact_address_neighborhood: string;
  contact_address_city: string;
  contact_address_state: string;
  contact_address_zipcode: string;
  contact_address_complement: string;
  contact_phone_mobile: string;
  contact_phone_landline: string;
  branding_system_title: string;
  branding_pdv_title: string;
  branding_logo_url: string;
}

export function useSystemConfig() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar todas as configurações
  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/config');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações');
      }
      
      const data = await response.json();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Salvar configurações
  const saveConfigs = useCallback(async (formData: Partial<ConfigFormData>) => {
    try {
      setSaving(true);
      setError(null);

      // Converter formData para array de configurações
      const configsToSave = Object.entries(formData).map(([key, value]) => ({
        key,
        value: value || '',
        type: key.includes('logo') ? 'image' : 'text',
        category: key.startsWith('contact_') ? 'contact' : 'branding'
      }));

      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configs: configsToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar configurações');
      }

      // Recarregar configurações após salvar
      await loadConfigs();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao salvar configurações:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadConfigs]);

  // Obter valor de uma configuração específica
  const getConfigValue = useCallback((key: string, defaultValue: string = ''): string => {
    const config = configs.find(c => c.key === key);
    return config?.value || defaultValue;
  }, [configs]);

  // Converter configurações para objeto de formulário
  const getFormData = useCallback((): ConfigFormData => {
    return {
      contact_address_street: getConfigValue('contact_address_street'),
      contact_address_number: getConfigValue('contact_address_number'),
      contact_address_neighborhood: getConfigValue('contact_address_neighborhood'),
      contact_address_city: getConfigValue('contact_address_city'),
      contact_address_state: getConfigValue('contact_address_state'),
      contact_address_zipcode: getConfigValue('contact_address_zipcode'),
      contact_address_complement: getConfigValue('contact_address_complement'),
      contact_phone_mobile: getConfigValue('contact_phone_mobile'),
      contact_phone_landline: getConfigValue('contact_phone_landline'),
      branding_system_title: getConfigValue('branding_system_title', 'Viandas e Marmitex'),
      branding_pdv_title: getConfigValue('branding_pdv_title', 'PDV - Viandas e Marmitex'),
      branding_logo_url: getConfigValue('branding_logo_url'),
    };
  }, [getConfigValue]);

  // Carregar configurações na inicialização
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return {
    configs,
    loading,
    saving,
    error,
    loadConfigs,
    saveConfigs,
    getConfigValue,
    getFormData,
  };
}
