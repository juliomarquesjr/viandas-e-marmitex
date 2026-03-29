# Plano de Integração de Upload no Modal de Foto do Cliente

## Análise do Fluxo Atual

### Fluxo Atual (Redundante)
1. Usuário abre CustomerPhotoModal
2. Seleciona modo "Arquivo"
3. Clica na área de upload
4. **Abre ImageCropModal (novo modal)**
5. Seleciona arquivo
6. Faz crop, zoom e rotação
7. Confirma e fecha ImageCropModal
8. Volta para CustomerPhotoModal na etapa de preview

**Problema:** Redundância de modais e experiência de usuário fragmentada

### Fluxo Proposto (Integrado)
1. Usuário abre CustomerPhotoModal
2. Seleciona modo "Arquivo"
3. Clica na área de upload
4. **Seleciona arquivo diretamente no mesmo modal**
5. Faz crop, zoom e rotação (se necessário)
6. Confirma e vai para etapa de preview

**Vantagem:** Experiência fluida em um único modal

---

## Plano de Implementação

### Etapa 1: Adicionar Estados para Funcionalidade de Crop
Adicionar estados necessários para controlar o fluxo de upload e crop:
- `uploadedImageSrc`: string - URL da imagem carregada
- `uploadedFile`: File | null - Arquivo original carregado
- `crop`: Crop | undefined - Estado do crop
- `completedCrop`: PixelCrop | undefined - Crop completado
- `scale`: number - Zoom da imagem (padrão: 1)
- `rotate`: number - Rotação da imagem (padrão: 0)
- `isProcessing`: boolean - Estado de processamento

### Etapa 2: Adicionar Refs para Crop
- `imgRef`: Ref<HTMLImageElement> - Referência para a imagem sendo cropada

### Etapa 3: Implementar Função de Seleção de Arquivo
Criar função `onSelectFile` para:
- Receber arquivo do input type="file"
- Armazenar arquivo no estado `uploadedFile`
- Ler arquivo com FileReader e definir `uploadedImageSrc`
- Resetar estado de crop

### Etapa 4: Implementar Função de Crop
Criar função `getCroppedImg` para:
- Receber imagem, crop, scale e rotate
- Criar canvas para desenhar imagem cropada
- Aplicar escala e rotação
- Converter canvas para blob e criar File
- Retornar Promise<File>

### Etapa 5: Implementar Função de Confirmar Crop
Criar função `handleConfirmCrop` para:
- Validar se há imagem e crop completado
- Chamar `getCroppedImg`
- Definir `pendingFile` com imagem cropada
- Definir `previewUrl` com URL da imagem cropada
- Mudar para etapa "preview"
- Resetar estados de crop

### Etapa 6: Implementar Função de Resetar Crop
Criar função `resetCropSettings` para:
- Resetar scale para 1
- Resetar rotate para 0
- Resetar crop para valor inicial (centerCrop)

### Etapa 7: Adicionar Componentes de UI para Upload
Adicionar área de seleção de arquivo:
- Input type="file" oculto com accept="image/*"
- Área clicável para abrir seletor de arquivo
- Preview da imagem carregada
- Interface de crop (ReactCrop)
- Controles de zoom (Slider)
- Controles de rotação (Slider)
- Botões de ação (Escolher outra imagem, Resetar configurações, Confirmar crop)

### Etapa 8: Atualizar Lógica de Upload
Modificar a área de upload atual:
- Remover chamada para `setCropModalOpen(true)`
- Implementar lógica de seleção de arquivo direta
- Adicionar estados para controlar visualização de área de upload vs área de crop

### Etapa 9: Remover Dependência do ImageCropModal
- Remover import de `ImageCropModal`
- Remover estado `cropModalOpen`
- Remover componente `ImageCropModal` do JSX
- Remover função `handleCropComplete` (será substituída por `handleConfirmCrop`)

### Etapa 10: Adicionar Imports Necessários
Adicionar imports para funcionalidade de crop:
- `ReactCrop`, `Crop`, `PixelCrop`, `centerCrop`, `makeAspectCrop` de 'react-image-crop'
- 'react-image-crop/dist/ReactCrop.css'
- `Slider` de '@/app/components/ui/slider'
- `Check`, `Crop as CropIcon`, `RotateCcw` de 'lucide-react'

---

## Estrutura Proposta para Área de Upload

```tsx
{/* Área de Upload - Estado Inicial */}
{!uploadedImageSrc && (
  <div className="space-y-4">
    <div
      onClick={() => document.getElementById('file-input')?.click()}
      className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group"
    >
      <div className="text-center space-y-3">
        <div className="h-14 w-14 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Upload className="h-7 w-7 text-slate-400 group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">
            Clique para selecionar
          </p>
          <p className="text-xs text-slate-500 mt-0.5">PNG, JPG ou JPEG</p>
        </div>
      </div>
    </div>
    <input
      type="file"
      accept="image/*"
      onChange={onSelectFile}
      className="hidden"
      id="file-input"
    />
  </div>
)}

{/* Área de Crop - Após Selecionar Arquivo */}
{uploadedImageSrc && (
  <div className="space-y-4">
    {/* Preview e Crop */}
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex justify-center">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={1}
          minWidth={50}
          minHeight={50}
          className="max-w-full max-h-[300px]"
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={uploadedImageSrc}
            style={{ 
              transform: `scale(${scale}) rotate(${rotate}deg)`,
              maxWidth: '100%',
              maxHeight: '300px',
              objectFit: 'contain'
            }}
            onLoad={onImageLoad}
            className="rounded-md"
          />
        </ReactCrop>
      </div>
    </div>

    {/* Controles */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Zoom */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Zoom: {scale.toFixed(2)}x
        </label>
        <Slider
          value={[scale]}
          onValueChange={(value) => setScale(value[0])}
          min={0.5}
          max={3}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Rotação */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Rotação: {rotate}°
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotate(0)}
            className="text-xs h-6 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
        <Slider
          value={[rotate]}
          onValueChange={(value) => setRotate(value[0])}
          min={-180}
          max={180}
          step={1}
          className="w-full"
        />
      </div>
    </div>

    {/* Botões de Ação */}
    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setUploadedImageSrc('');
          setUploadedFile(null);
          setCrop(undefined);
          setCompletedCrop(undefined);
          setScale(1);
          setRotate(0);
        }}
        className="flex-1"
      >
        <Upload className="h-4 w-4 mr-2" />
        Escolher Outra Imagem
      </Button>
      
      <Button
        type="button"
        variant="outline"
        onClick={resetCropSettings}
        className="flex-1"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Resetar Configurações
      </Button>
      
      <Button
        type="button"
        onClick={handleConfirmCrop}
        disabled={!completedCrop || isProcessing}
        className="flex-1"
      >
        {isProcessing ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
            Processando...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Confirmar
          </>
        )}
      </Button>
    </div>
  </div>
)}
```

---

## Prioridade das Mudanças

### Alta Prioridade
1. Adicionar estados e refs para funcionalidade de crop
2. Implementar função de seleção de arquivo
3. Implementar função de crop e confirmação
4. Adicionar UI para upload e crop

### Média Prioridade
5. Adicionar controles de zoom e rotação
6. Implementar função de resetar configurações
7. Remover dependência do ImageCropModal

### Baixa Prioridade
8. Ajustes finos de UI e UX
9. Validações adicionais
10. Testes e refinamentos

---

## Benefícios Esperados

1. **Experiência de Usuário Melhorada:** Fluxo contínuo em um único modal
2. **Menos Redundância:** Eliminação de modal secundário
3. **Maior Controle:** Usuário pode fazer ajustes antes de confirmar
4. **Consistência Visual:** Todo o fluxo segue o mesmo padrão visual
5. **Performance Menor:** Menos componentes renderizados simultaneamente

---

## Próximos Passos

1. ✅ Análise do fluxo atual concluída
2. ✅ Plano detalhado criado
3. ⏳ Aprovação do plano pelo usuário
4. ⏳ Implementação das mudanças
5. ⏳ Testes e validação
6. ⏳ Ajustes finais baseados em feedback
