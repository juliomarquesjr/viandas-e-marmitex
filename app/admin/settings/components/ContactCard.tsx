"use client";

import { useToast } from "@/app/components/Toast";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { ConfigFormData } from "@/app/hooks/useSystemConfig";
import { Loader2, MapPin, Phone, Search } from "lucide-react";
import { useRef, useState } from "react";

interface ContactCardProps {
  formData: ConfigFormData;
  onFieldChange: (key: keyof ConfigFormData, value: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-2.5 bg-slate-50/80 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</span>
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-8 px-8 py-5 border-b border-slate-100 last:border-0">
      <div className="w-48 flex-shrink-0 pt-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function ContactCard({ formData, onFieldChange }: ContactCardProps) {
  const { showToast } = useToast();
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'Viandas-e-Marmitex/1.0' } }
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch {
      showToast('Erro ao buscar endereço. Tente novamente.', 'error');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectAddress = (result: any) => {
    onFieldChange('restaurant_latitude', parseFloat(result.lat).toString());
    onFieldChange('restaurant_longitude', parseFloat(result.lon).toString());
    setAddressSearch(result.display_name || '');
    setShowResults(false);
    setSearchResults([]);
    showToast('Coordenadas preenchidas automaticamente!', 'success');
  };

  return (
    <div>
      <SectionLabel>Telefones</SectionLabel>

      <SettingsRow label="Celular" description="Número de celular com DDD">
        <div className="relative max-w-xs">
          <Input
            value={formData.contact_phone_mobile}
            onChange={(e) => onFieldChange('contact_phone_mobile', e.target.value)}
            placeholder="(11) 99999-9999"
            className="pl-9 h-9 text-sm rounded-lg border-slate-200"
          />
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </SettingsRow>

      <SettingsRow label="Telefone Fixo" description="Telefone residencial ou comercial">
        <div className="relative max-w-xs">
          <Input
            value={formData.contact_phone_landline}
            onChange={(e) => onFieldChange('contact_phone_landline', e.target.value)}
            placeholder="(11) 3333-3333"
            className="pl-9 h-9 text-sm rounded-lg border-slate-200"
          />
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </SettingsRow>

      <SectionLabel>Endereço</SectionLabel>

      {/* Address grid row */}
      <div className="px-8 py-5 border-b border-slate-100">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Rua</Label>
            <div className="relative">
              <Input
                value={formData.contact_address_street}
                onChange={(e) => onFieldChange('contact_address_street', e.target.value)}
                placeholder="Nome da rua"
                className="pl-9 h-9 text-sm rounded-lg border-slate-200"
              />
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Número</Label>
            <Input
              value={formData.contact_address_number}
              onChange={(e) => onFieldChange('contact_address_number', e.target.value)}
              placeholder="123"
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Bairro</Label>
            <Input
              value={formData.contact_address_neighborhood}
              onChange={(e) => onFieldChange('contact_address_neighborhood', e.target.value)}
              placeholder="Centro"
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Cidade</Label>
            <Input
              value={formData.contact_address_city}
              onChange={(e) => onFieldChange('contact_address_city', e.target.value)}
              placeholder="São Paulo"
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Estado (UF)</Label>
            <Input
              value={formData.contact_address_state}
              onChange={(e) => onFieldChange('contact_address_state', e.target.value)}
              placeholder="SP"
              maxLength={2}
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">CEP</Label>
            <Input
              value={formData.contact_address_zipcode}
              onChange={(e) => onFieldChange('contact_address_zipcode', e.target.value)}
              placeholder="01234-567"
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Complemento</Label>
            <Input
              value={formData.contact_address_complement}
              onChange={(e) => onFieldChange('contact_address_complement', e.target.value)}
              placeholder="Apto 45, Bloco B"
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>
        </div>
      </div>

      <SectionLabel>Coordenadas GPS</SectionLabel>

      <SettingsRow
        label="Buscar Localização"
        description="Pesquise o endereço para preencher as coordenadas automaticamente"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={addressSearch}
              onChange={(e) => {
                const value = e.target.value;
                setAddressSearch(value);
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                if (value.length >= 3) {
                  searchTimeoutRef.current = setTimeout(() => searchAddress(value), 500);
                } else {
                  setSearchResults([]);
                  setShowResults(false);
                }
              }}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              placeholder="Ex: Rua Hermes Cortes, 75, Santa Maria, RS"
              className="pl-9 h-9 text-sm rounded-lg border-slate-200"
            />
            {isSearching && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin" />
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectAddress(result)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{result.display_name}</p>
                      {result.address && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {[result.address.road, result.address.house_number, result.address.city || result.address.town, result.address.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {addressSearch && !isSearching && searchResults.length === 0 && showResults && (
            <p className="text-xs text-slate-400">Nenhum resultado encontrado.</p>
          )}
        </div>
      </SettingsRow>

      <SettingsRow label="Coordenadas" description="Latitude e longitude do restaurante">
        <div className="grid gap-3 sm:grid-cols-2 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Latitude</Label>
            <Input
              value={formData.restaurant_latitude || ''}
              onChange={(e) => onFieldChange('restaurant_latitude', e.target.value)}
              placeholder="-23.5505"
              type="number"
              step="any"
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Longitude</Label>
            <Input
              value={formData.restaurant_longitude || ''}
              onChange={(e) => onFieldChange('restaurant_longitude', e.target.value)}
              placeholder="-46.6333"
              type="number"
              step="any"
              className="h-9 text-sm rounded-lg border-slate-200"
            />
          </div>
        </div>
      </SettingsRow>
    </div>
  );
}
