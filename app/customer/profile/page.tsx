"use client";

import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CheckCircle, Edit, Eye, EyeOff, Loader2, MapPin, User, Mail, Phone, Lock, Building2 } from "lucide-react";

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  doc?: string | null;
  address?: any;
}

export default function CustomerProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    doc: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip: ''
    },
    password: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/customer/profile');
        if (!response.ok) throw new Error('Erro ao carregar perfil');
        
        const data = await response.json();
        setCustomer(data);
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          doc: data.doc || '',
          address: data.address && typeof data.address === 'object' 
            ? {
                street: data.address.street || '',
                number: data.address.number || '',
                complement: data.address.complement || '',
                neighborhood: data.address.neighborhood || '',
                city: data.address.city || '',
                state: data.address.state || '',
                zip: data.address.zip || ''
              }
            : {
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: '',
                zip: ''
              },
          password: ''
        });
      } catch (err) {
        setError('Erro ao carregar dados do perfil');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      loadProfile();
    }
  }, [session]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Converter email vazio para null (banco não aceita string vazia)
      const emailValue = formData.email?.trim() || null;
      
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        email: emailValue,
        doc: formData.doc?.trim() || null,
      };

      // Processar endereço
      updateData.address = formData.address;

      // Adicionar senha apenas se foi fornecida
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar perfil');
      }

      const updated = await response.json();
      setCustomer(updated.customer);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        doc: customer.doc || '',
        address: customer.address && typeof customer.address === 'object'
          ? {
              street: customer.address.street || '',
              number: customer.address.number || '',
              complement: customer.address.complement || '',
              neighborhood: customer.address.neighborhood || '',
              city: customer.address.city || '',
              state: customer.address.state || '',
              zip: customer.address.zip || ''
            }
          : {
              street: '',
              number: '',
              complement: '',
              neighborhood: '',
              city: '',
              state: '',
              zip: ''
            },
        password: ''
      });
    }
    setEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-6 md:p-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Meu Perfil</h1>
              <p className="text-orange-100 text-sm md:text-base">Gerencie suas informações pessoais</p>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <Alert className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            Perfil atualizado com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="shadow-md">
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Card de Informações Pessoais */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-gray-800">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                <User className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl">Informações Pessoais</span>
            </CardTitle>
            {!editing && (
              <Button
                onClick={() => setEditing(true)}
                className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4 text-orange-500" />
                Nome Completo
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Phone className="h-4 w-4 text-orange-500" />
                Telefone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-500" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-500" />
                CPF/CNPJ
              </Label>
              <Input
                id="doc"
                value={formData.doc}
                onChange={(e) => setFormData({ ...formData, doc: e.target.value })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Endereço */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="flex items-center gap-3 text-gray-800">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl">Endereço</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address.street" className="text-sm font-semibold text-gray-700">Rua/Logradouro</Label>
              <Input
                id="address.street"
                value={formData.address.street}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, street: e.target.value }
                })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
                placeholder="Ex: Rua das Flores"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address.number" className="text-sm font-semibold text-gray-700">Número</Label>
              <Input
                id="address.number"
                value={formData.address.number}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, number: e.target.value }
                })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
                placeholder="Ex: 123"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address.complement" className="text-sm font-semibold text-gray-700">Complemento</Label>
              <Input
                id="address.complement"
                value={formData.address.complement}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, complement: e.target.value }
                })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
                placeholder="Ex: Apto 101"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address.neighborhood" className="text-sm font-semibold text-gray-700">Bairro</Label>
              <Input
                id="address.neighborhood"
                value={formData.address.neighborhood}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, neighborhood: e.target.value }
                })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
                placeholder="Ex: Centro"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address.city" className="text-sm font-semibold text-gray-700">Cidade</Label>
              <Input
                id="address.city"
                value={formData.address.city}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, city: e.target.value }
                })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
                placeholder="Ex: Santa Maria"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address.state" className="text-sm font-semibold text-gray-700">Estado</Label>
              <Input
                id="address.state"
                value={formData.address.state}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, state: e.target.value }
                })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
                placeholder="Ex: RS"
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address.zip" className="text-sm font-semibold text-gray-700">CEP</Label>
              <Input
                id="address.zip"
                value={formData.address.zip}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, zip: e.target.value }
                })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
                placeholder="Ex: 97000-000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Segurança */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <CardTitle className="flex items-center gap-3 text-gray-800">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl">Segurança</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              Nova Senha (deixe em branco para não alterar)
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={!editing}
                className={`h-12 rounded-xl border-2 pr-12 transition-all ${!editing ? "bg-gray-50 border-gray-200" : "border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"}`}
                placeholder="••••••••"
              />
              {editing && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-purple-50"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <div className="flex gap-4 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 gap-2 h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Salvar Alterações
              </>
            )}
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={saving}
            className="h-14 px-8 rounded-xl border-2 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
