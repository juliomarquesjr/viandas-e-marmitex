"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { ConfigFormData, useSystemConfig } from "@/app/hooks/useSystemConfig";
import {
    AlertCircle,
    Building2,
    Image as ImageIcon,
    MapPin,
    Phone,
    RefreshCw,
    Save
} from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { 
    configs, 
    loading, 
    saving, 
    error, 
    loadConfigs, 
    saveConfigs, 
    getFormData 
  } = useSystemConfig();
  
  const { showToast } = useToast();
  const [formData, setFormData] = useState<ConfigFormData>({
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
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Carregar dados do formulário quando as configurações forem carregadas
  useEffect(() => {
    if (configs.length > 0) {
      setFormData(getFormData());
    }
  }, [configs, getFormData]);

  // Função para lidar com mudanças nos campos
  const handleInputChange = (key: keyof ConfigFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Função para lidar com o upload da logo
  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      
      // Incluir URL da logo antiga para deletar se existir
      if (formData.branding_logo_url) {
        uploadFormData.append("oldImageUrl", formData.branding_logo_url);
      }
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha no upload");
      }

      const { url } = await response.json();
      handleInputChange('branding_logo_url', url);
      
      showToast(
        "Logo enviada com sucesso!",
        "success",
        "Logo enviada com sucesso!",
        "A logo foi atualizada. Não esqueça de salvar as configurações."
      );
    } catch (error) {
      console.error("Erro no upload:", error);
      showToast(
        "Erro no upload",
        "error",
        "Erro no upload",
        error instanceof Error ? error.message : "Falha no upload da logo"
      );
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Função para remover a logo
  const removeLogo = async () => {
    if (formData.branding_logo_url) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: formData.branding_logo_url })
        });
      } catch (error) {
        console.warn('Could not delete logo from storage:', error);
      }
    }
    handleInputChange('branding_logo_url', '');
  };

  // Função para salvar configurações
  const handleSave = async () => {
    const success = await saveConfigs(formData);
    
    if (success) {
      showToast(
        "Configurações salvas!",
        "success",
        "Configurações salvas!",
        "Todas as configurações foram atualizadas com sucesso."
      );
    } else {
      showToast(
        "Erro ao salvar",
        "error",
        "Erro ao salvar",
        error || "Não foi possível salvar as configurações"
      );
    }
  };

  // Função para recarregar configurações
  const handleReload = async () => {
    await loadConfigs();
    showToast(
      "Configurações recarregadas",
      "info",
      "Configurações recarregadas",
      "As configurações foram atualizadas com os dados do servidor."
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as configurações gerais, contato e marca do sistema
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReload}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Informações de Contato
            </CardTitle>
            <CardDescription>
              Configure os dados de contato da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Telefones */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact_phone_mobile">Telefone Celular</Label>
                <Input
                  id="contact_phone_mobile"
                  value={formData.contact_phone_mobile}
                  onChange={(e) => handleInputChange('contact_phone_mobile', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div>
                <Label htmlFor="contact_phone_landline">Telefone Residencial</Label>
                <Input
                  id="contact_phone_landline"
                  value={formData.contact_phone_landline}
                  onChange={(e) => handleInputChange('contact_phone_landline', e.target.value)}
                  placeholder="(11) 3333-3333"
                />
              </div>
            </div>

            <Separator />

            {/* Endereço */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Endereço Completo</span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="contact_address_street">Rua</Label>
                  <Input
                    id="contact_address_street"
                    value={formData.contact_address_street}
                    onChange={(e) => handleInputChange('contact_address_street', e.target.value)}
                    placeholder="Nome da rua"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact_address_number">Número</Label>
                  <Input
                    id="contact_address_number"
                    value={formData.contact_address_number}
                    onChange={(e) => handleInputChange('contact_address_number', e.target.value)}
                    placeholder="123"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact_address_neighborhood">Bairro</Label>
                  <Input
                    id="contact_address_neighborhood"
                    value={formData.contact_address_neighborhood}
                    onChange={(e) => handleInputChange('contact_address_neighborhood', e.target.value)}
                    placeholder="Centro"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact_address_city">Cidade</Label>
                  <Input
                    id="contact_address_city"
                    value={formData.contact_address_city}
                    onChange={(e) => handleInputChange('contact_address_city', e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact_address_state">Estado (UF)</Label>
                  <Input
                    id="contact_address_state"
                    value={formData.contact_address_state}
                    onChange={(e) => handleInputChange('contact_address_state', e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact_address_zipcode">CEP</Label>
                  <Input
                    id="contact_address_zipcode"
                    value={formData.contact_address_zipcode}
                    onChange={(e) => handleInputChange('contact_address_zipcode', e.target.value)}
                    placeholder="01234-567"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <Label htmlFor="contact_address_complement">Complemento</Label>
                  <Input
                    id="contact_address_complement"
                    value={formData.contact_address_complement}
                    onChange={(e) => handleInputChange('contact_address_complement', e.target.value)}
                    placeholder="Apto 45, Bloco B"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Marca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Marca e Identidade
            </CardTitle>
            <CardDescription>
              Configure os títulos e logo do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Títulos */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="branding_system_title">Título do Sistema</Label>
                <Input
                  id="branding_system_title"
                  value={formData.branding_system_title}
                  onChange={(e) => handleInputChange('branding_system_title', e.target.value)}
                  placeholder="Viandas e Marmitex"
                />
              </div>
              
              <div>
                <Label htmlFor="branding_pdv_title">Título do PDV</Label>
                <Input
                  id="branding_pdv_title"
                  value={formData.branding_pdv_title}
                  onChange={(e) => handleInputChange('branding_pdv_title', e.target.value)}
                  placeholder="PDV - Viandas e Marmitex"
                />
              </div>
            </div>

            <Separator />

            {/* Logo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Logo da Empresa</span>
              </div>
              
              {formData.branding_logo_url ? (
                <div className="space-y-3">
                  <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={formData.branding_logo_url}
                      alt="Logo da empresa"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4 mr-2" />
                      )}
                      Alterar Logo
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeLogo}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Sem logo</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4 mr-2" />
                    )}
                    Enviar Logo
                  </Button>
                </div>
              )}
              
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleLogoUpload(file);
                  }
                }}
              />
              
              <p className="text-sm text-gray-500">
                Formatos aceitos: JPEG, PNG, WebP, GIF. Tamanho máximo: 5MB.
                A logo será redimensionada para formato quadrado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
