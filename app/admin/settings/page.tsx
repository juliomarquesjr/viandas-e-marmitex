"use client";

import { ImageCropModal } from "@/app/components/ImageCropModal";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { ConfigFormData, useSystemConfig } from "@/app/hooks/useSystemConfig";
import {
    AlertCircle,
    Building2,
    Edit3,
    Image as ImageIcon,
    Mail,
    MapPin,
    Phone,
    QrCode,
    RefreshCw,
    Save,
    Send,
    Trash2,
    Upload
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
    email_smtp_host: '',
    email_smtp_port: '587',
    email_smtp_secure: 'false',
    email_smtp_user: '',
    email_smtp_password: '',
    email_from_name: 'Viandas e Marmitex',
    email_from_address: '',
    email_reply_to: '',
    email_enabled: 'false',
    payment_pix_key: '',
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

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
      // Validar arquivo antes do upload
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione um arquivo de imagem válido.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('O arquivo deve ter no máximo 5MB.');
      }

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      
      // Incluir URL da logo antiga para deletar se existir
      if (formData.branding_logo_url) {
        uploadFormData.append("oldImageUrl", formData.branding_logo_url);
        console.log('Incluindo URL da logo antiga para remoção:', formData.branding_logo_url);
      }
      
      console.log('Iniciando upload da logo:', file.name, file.size, file.type);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro no upload:', errorData);
        throw new Error(errorData.error || "Falha no upload");
      }

      const { url } = await response.json();
      console.log('Upload concluído com sucesso:', url);
      
      // Atualizar o estado com a nova URL
      handleInputChange('branding_logo_url', url);
      
      showToast(
        "Logo enviada com sucesso!",
        "success",
        "Logo enviada com sucesso!",
        "A logo foi atualizada e a imagem antiga foi removida. Não esqueça de salvar as configurações."
      );
    } catch (error) {
      console.error("Erro no upload da logo:", error);
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
        console.log('Removendo logo do storage:', formData.branding_logo_url);
        
        const response = await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: formData.branding_logo_url })
        });

        if (response.ok) {
          console.log('Logo removida do storage com sucesso');
          showToast(
            "Logo removida!",
            "success",
            "Logo removida!",
            "A logo foi removida do sistema de arquivos."
          );
        } else {
          console.warn('Falha ao remover logo do storage:', await response.text());
          showToast(
            "Aviso",
            "warning",
            "Logo removida do formulário",
            "A logo foi removida do formulário, mas pode não ter sido removida do sistema de arquivos."
          );
        }
      } catch (error) {
        console.error('Erro ao remover logo do storage:', error);
        showToast(
          "Aviso",
          "warning",
          "Logo removida do formulário",
          "A logo foi removida do formulário, mas pode não ter sido removida do sistema de arquivos."
        );
      }
    }
    
    // Sempre limpar o campo, mesmo se a remoção do storage falhar
    handleInputChange('branding_logo_url', '');
  };

  // Função para lidar com drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      showToast(
        "Arquivo inválido",
        "error",
        "Arquivo inválido",
        "Por favor, selecione um arquivo de imagem válido."
      );
    }
  };

  // Função para lidar com seleção de arquivo
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(
        "Arquivo inválido",
        "error",
        "Arquivo inválido",
        "Por favor, selecione um arquivo de imagem válido."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      showToast(
        "Arquivo muito grande",
        "error",
        "Arquivo muito grande",
        "O arquivo deve ter no máximo 5MB."
      );
      return;
    }

    setIsCropModalOpen(true);
  };

  // Handle cropped image upload
  const handleCroppedImageUpload = async (croppedImageFile: File) => {
    setIsUploadingImage(true);
    try {
      await handleLogoUpload(croppedImageFile);
    } catch (error) {
      console.error('Error uploading cropped image:', error);
    } finally {
      setIsUploadingImage(false);
    }
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

  // Função para testar configurações de email
  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      showToast("Digite um email para teste", "error");
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      showToast("Formato de email inválido", "error");
      return;
    }

    try {
      setIsTestingEmail(true);
      
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message, "success");
        setTestEmail(''); // Limpar campo após sucesso
      } else {
        showToast(data.error || "Erro ao testar configurações", "error");
      }
    } catch (error) {
      console.error('Erro ao testar email:', error);
      showToast("Erro ao testar configurações de email", "error");
    } finally {
      setIsTestingEmail(false);
    }
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
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-gray-200 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Configurações do Sistema
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Gerencie as configurações gerais, contato e marca do sistema
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
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
        <Card className="shadow-lg border-gray-200 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Phone className="h-6 w-6 text-blue-600" />
              Informações de Contato
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Configure os dados de contato da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Seção Telefones */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <h3 className="text-base font-semibold text-blue-800">
                  Telefones
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100"></div>
              
              <div className="grid gap-6 sm:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="contact_phone_mobile"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Telefone Celular
                  </Label>
                  <div className="relative">
                    <Input
                      id="contact_phone_mobile"
                      value={formData.contact_phone_mobile}
                      onChange={(e) => handleInputChange('contact_phone_mobile', e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="contact_phone_landline"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Telefone Residencial
                  </Label>
                  <div className="relative">
                    <Input
                      id="contact_phone_landline"
                      value={formData.contact_phone_landline}
                      onChange={(e) => handleInputChange('contact_phone_landline', e.target.value)}
                      placeholder="(11) 3333-3333"
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Endereço */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <h3 className="text-base font-semibold text-blue-800">
                  Endereço Completo
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100"></div>
              
              <div className="grid gap-6 sm:grid-cols-2 mt-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label 
                    htmlFor="contact_address_street"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Rua
                  </Label>
                  <div className="relative">
                    <Input
                      id="contact_address_street"
                      value={formData.contact_address_street}
                      onChange={(e) => handleInputChange('contact_address_street', e.target.value)}
                      placeholder="Nome da rua"
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                    />
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="contact_address_number"
                    className="text-sm font-medium text-gray-700"
                  >
                    Número
                  </Label>
                  <Input
                    id="contact_address_number"
                    value={formData.contact_address_number}
                    onChange={(e) => handleInputChange('contact_address_number', e.target.value)}
                    placeholder="123"
                    className="py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="contact_address_neighborhood"
                    className="text-sm font-medium text-gray-700"
                  >
                    Bairro
                  </Label>
                  <Input
                    id="contact_address_neighborhood"
                    value={formData.contact_address_neighborhood}
                    onChange={(e) => handleInputChange('contact_address_neighborhood', e.target.value)}
                    placeholder="Centro"
                    className="py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="contact_address_city"
                    className="text-sm font-medium text-gray-700"
                  >
                    Cidade
                  </Label>
                  <Input
                    id="contact_address_city"
                    value={formData.contact_address_city}
                    onChange={(e) => handleInputChange('contact_address_city', e.target.value)}
                    placeholder="São Paulo"
                    className="py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="contact_address_state"
                    className="text-sm font-medium text-gray-700"
                  >
                    Estado (UF)
                  </Label>
                  <Input
                    id="contact_address_state"
                    value={formData.contact_address_state}
                    onChange={(e) => handleInputChange('contact_address_state', e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    className="py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="contact_address_zipcode"
                    className="text-sm font-medium text-gray-700"
                  >
                    CEP
                  </Label>
                  <Input
                    id="contact_address_zipcode"
                    value={formData.contact_address_zipcode}
                    onChange={(e) => handleInputChange('contact_address_zipcode', e.target.value)}
                    placeholder="01234-567"
                    className="py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                  />
                </div>
                
                <div className="sm:col-span-2 space-y-2">
                  <Label 
                    htmlFor="contact_address_complement"
                    className="text-sm font-medium text-gray-700"
                  >
                    Complemento
                  </Label>
                  <Input
                    id="contact_address_complement"
                    value={formData.contact_address_complement}
                    onChange={(e) => handleInputChange('contact_address_complement', e.target.value)}
                    placeholder="Apto 45, Bloco B"
                    className="py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Marca */}
        <Card className="shadow-lg border-gray-200 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-purple-600" />
              Marca e Identidade
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Configure os títulos e logo do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Seção Títulos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <h3 className="text-base font-semibold text-purple-800">
                  Títulos do Sistema
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-purple-100 via-purple-300 to-purple-100"></div>
              
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="branding_system_title"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Título do Sistema
                  </Label>
                  <div className="relative">
                    <Input
                      id="branding_system_title"
                      value={formData.branding_system_title}
                      onChange={(e) => handleInputChange('branding_system_title', e.target.value)}
                      placeholder="Viandas e Marmitex"
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 shadow-sm transition-all"
                    />
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="branding_pdv_title"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Título do PDV
                  </Label>
                  <div className="relative">
                    <Input
                      id="branding_pdv_title"
                      value={formData.branding_pdv_title}
                      onChange={(e) => handleInputChange('branding_pdv_title', e.target.value)}
                      placeholder="PDV - Viandas e Marmitex"
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 shadow-sm transition-all"
                    />
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Logo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <ImageIcon className="h-4 w-4 text-purple-600" />
                <h3 className="text-base font-semibold text-purple-800">
                  Logo da Empresa
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-purple-100 via-purple-300 to-purple-100"></div>
              
              {formData.branding_logo_url ? (
                // Logo preview with edit/remove options
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Logo Atual
                  </Label>
                  <div className="relative">
                    <div className="flex items-start gap-4 p-4 border border-purple-200 rounded-xl bg-purple-50">
                      <img
                        src={formData.branding_logo_url}
                        alt="Logo da empresa"
                        className="h-24 w-24 rounded-lg object-contain border border-purple-300"
                      />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm text-gray-600">
                          Logo carregada com sucesso
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCropModalOpen(true)}
                            className="flex items-center gap-2 border-purple-200 hover:bg-purple-100 text-purple-700"
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeLogo}
                            className="flex items-center gap-2 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Upload area when no logo
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Adicionar Logo
                  </Label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                      isDragOver 
                        ? 'border-purple-500 bg-purple-100' 
                        : 'border-purple-300 hover:border-purple-500 bg-purple-50/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => setIsCropModalOpen(true)}
                  >
                    <ImageIcon className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {isDragOver ? 'Solte a imagem aqui' : 'Selecione uma logo'}
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                      {isDragOver 
                        ? 'Solte o arquivo para fazer upload' 
                        : 'Clique para selecionar e editar uma logo da empresa'
                      }
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCropModalOpen(true);
                      }}
                      disabled={isUploadingImage || isUploadingLogo}
                      className="bg-purple-600 hover:bg-purple-700 border-purple-700 text-white hover:text-white px-4 py-3 rounded-xl"
                    >
                      {isUploadingImage || isUploadingLogo ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Selecionar Logo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                Formatos aceitos: JPEG, PNG, WebP, GIF. Tamanho máximo: 5MB.
                A logo será redimensionada para formato quadrado.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Email */}
        <Card className="shadow-lg border-gray-200 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Mail className="h-6 w-6 text-green-600" />
              Configurações de Email
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Configure o servidor SMTP para envio de relatórios por email
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Seção Status e Configurações Básicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Mail className="h-4 w-4 text-green-600" />
                <h3 className="text-base font-semibold text-green-800">
                  Configurações Básicas
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-green-100 via-green-300 to-green-100"></div>
              
              <div className="grid gap-6 sm:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_enabled"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Habilitar Envio de Emails
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="email_enabled"
                      checked={formData.email_enabled === 'true'}
                      onChange={(e) => handleInputChange('email_enabled', e.target.checked ? 'true' : 'false')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      {formData.email_enabled === 'true' ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_from_name"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Nome do Remetente
                  </Label>
                  <div className="relative">
                    <Input
                      id="email_from_name"
                      value={formData.email_from_name}
                      onChange={(e) => handleInputChange('email_from_name', e.target.value)}
                      placeholder="Viandas e Marmitex"
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Servidor SMTP */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Send className="h-4 w-4 text-green-600" />
                <h3 className="text-base font-semibold text-green-800">
                  Servidor SMTP
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-green-100 via-green-300 to-green-100"></div>
              
              <div className="grid gap-6 sm:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_smtp_host"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    Servidor SMTP
                  </Label>
                  <div className="relative">
                    <Input
                      id="email_smtp_host"
                      value={formData.email_smtp_host}
                      onChange={(e) => handleInputChange('email_smtp_host', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                    />
                    <Send className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_smtp_port"
                    className="text-sm font-medium text-gray-700"
                  >
                    Porta SMTP
                  </Label>
                  <Input
                    id="email_smtp_port"
                    value={formData.email_smtp_port}
                    onChange={(e) => handleInputChange('email_smtp_port', e.target.value)}
                    placeholder="587"
                    type="number"
                    className="py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_smtp_user"
                    className="text-sm font-medium text-gray-700"
                  >
                    Usuário/Email
                  </Label>
                  <Input
                    id="email_smtp_user"
                    value={formData.email_smtp_user}
                    onChange={(e) => handleInputChange('email_smtp_user', e.target.value)}
                    placeholder="seu-email@gmail.com"
                    type="email"
                    className="py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_smtp_password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Senha do App
                  </Label>
                  <Input
                    id="email_smtp_password"
                    value={formData.email_smtp_password}
                    onChange={(e) => handleInputChange('email_smtp_password', e.target.value)}
                    placeholder="Sua senha de aplicativo"
                    type="password"
                    className="py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                  />
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_smtp_secure"
                    className="text-sm font-medium text-gray-700"
                  >
                    Conexão Segura (SSL/TLS)
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="email_smtp_secure"
                      checked={formData.email_smtp_secure === 'true'}
                      onChange={(e) => handleInputChange('email_smtp_secure', e.target.checked ? 'true' : 'false')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      {formData.email_smtp_secure === 'true' ? 'SSL/TLS Ativado' : 'STARTTLS (Recomendado)'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_reply_to"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email para Resposta
                  </Label>
                  <Input
                    id="email_reply_to"
                    value={formData.email_reply_to}
                    onChange={(e) => handleInputChange('email_reply_to', e.target.value)}
                    placeholder="contato@viandase.com"
                    type="email"
                    className="py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Seção Email do Remetente */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Mail className="h-4 w-4 text-green-600" />
                <h3 className="text-base font-semibold text-green-800">
                  Email do Remetente
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-green-100 via-green-300 to-green-100"></div>
              
              <div className="mt-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="email_from_address"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email de Envio
                  </Label>
                  <Input
                    id="email_from_address"
                    value={formData.email_from_address}
                    onChange={(e) => handleInputChange('email_from_address', e.target.value)}
                    placeholder="noreply@viandase.com"
                    type="email"
                    className="py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                  />
                  <p className="text-xs text-gray-500">
                    Este será o email que aparece como remetente nos relatórios enviados
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Teste */}
            <div className="pt-4 border-t border-gray-200">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="test_email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email para Teste
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="test_email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="seu-email@exemplo.com"
                      type="email"
                      className="flex-1 py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={!formData.email_enabled || !formData.email_smtp_host || !formData.email_smtp_user || !testEmail.trim() || isTestingEmail}
                      className="px-6 py-3 border-green-200 hover:bg-green-50 text-green-700 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      {isTestingEmail ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                          Testando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Testar Email
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Digite um email válido para testar as configurações SMTP
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Pagamento */}
        <Card className="shadow-lg border-gray-200 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-xl">
              <QrCode className="h-6 w-6 text-purple-600" />
              Configurações de Pagamento
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Configure os dados de pagamento PIX
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Seção PIX */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <QrCode className="h-4 w-4 text-purple-600" />
                <h3 className="text-base font-semibold text-purple-800">
                  Chave PIX
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-purple-100 via-purple-300 to-purple-100"></div>
              
              <div className="space-y-2 mt-4">
                <Label 
                  htmlFor="payment_pix_key"
                  className="text-sm font-medium text-gray-700 flex items-center gap-1"
                >
                  Chave PIX
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="payment_pix_key"
                    value={formData.payment_pix_key}
                    onChange={(e) => handleInputChange('payment_pix_key', e.target.value)}
                    placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                    className="pl-10 py-3 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 shadow-sm transition-all"
                  />
                  <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  A chave PIX será usada para gerar os QR codes de pagamento nos recibos. 
                  Pode ser CPF (11 dígitos), CNPJ (14 dígitos), email, telefone (com DDD) ou chave aleatória.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCroppedImageUpload}
        onUploadStart={() => setIsUploadingImage(true)}
        aspectRatio={1} // Square for logo
        maxWidth={800}
        maxHeight={800}
        title="Editar Logo da Empresa"
        description="Ajuste e faça o crop da logo para garantir que ela fique perfeita"
        selectImageTitle="Selecione uma logo"
        selectImageDescription="Escolha uma logo para editar e fazer o crop"
        cropButtonText="Aplicar e Salvar Logo"
        selectAnotherButtonText="Escolher Outra Logo"
      />
    </div>
  );
}
