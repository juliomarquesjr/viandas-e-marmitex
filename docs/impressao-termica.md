# Impressão Térmica

## Visão Geral

O sistema suporta dois modos de impressão térmica:

| Modo | Como funciona | Quando usar |
|---|---|---|
| **Browser** | Abre nova aba → `window.print()` → diálogo do SO | Web ou desktop sem impressora configurada |
| **Desktop silencioso** | Captura HTML como bitmap → envia raw ESC/POS para a impressora | Desktop com impressora térmica configurada |

No modo desktop silencioso **não aparece nenhum diálogo** — o cupom vai direto para a impressora.

---

## Pipeline de Impressão Silenciosa

```
Admin abre iframe oculto com ?captureMode=true
        ↓
Página de print renderiza normalmente (estilos, QR Code, logo)
        ↓
html2canvas captura o elemento .thermal-receipt (ou similar)
        ↓
getImageData() extrai RGBA brutos do canvas
        ↓
postMessage({ type:"thermal-bitmap-capture", imageData, width, height })
        ↓
Admin recebe os bytes → invoke("print_bitmap_to_printer")
        ↓
Rust converte RGBA → ESC/POS raster (GS v 0) → envia para a impressora
```

---

## Arquivos e Responsabilidades

### Frontend — Páginas de Print

| Arquivo | Módulo | Elemento capturado |
|---|---|---|
| `app/print/pre-order-thermal/page.tsx` | Pré-pedidos | `.preorder-thermal-receipt` |
| `app/print/receipt-thermal/page.tsx` | Vendas | `.thermal-receipt` |

Cada página de print suporta os seguintes parâmetros de URL:

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `captureMode=true` | bool | Ativa o modo bitmap (não chama `window.print()`) |
| `printSessionId=<uuid>` | string | ID da sessão, evita colisão entre capturas simultâneas |
| `autoPrint=0` | bool | Desativa auto-print (usado no fallback com diálogo) |

**Padrão de implementação em cada página de print:**

```ts
const captureMode = searchParams.get('captureMode') === 'true';
const autoPrint   = searchParams.get('autoPrint') !== '0';
const printSessionId = searchParams.get('printSessionId') ?? null;

// Notifica o admin (parent/opener) sobre eventos de impressão
const notifyParent = (type: string) => {
  const payload = { type, printSessionId };
  try { window.parent?.postMessage(payload, window.location.origin); } catch {}
  try { window.opener?.postMessage(payload, window.location.origin); } catch {}
};

// Captura bitmap e envia ao admin
const runBitmapCapture = async () => {
  const el = document.querySelector('.thermal-receipt') as HTMLElement | null;
  if (!el) return;
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  window.parent.postMessage(
    { type: 'thermal-bitmap-capture', printSessionId, imageData: Array.from(data), width: canvas.width, height: canvas.height },
    window.location.origin,
  );
};

// useEffect de auto-print
useEffect(() => {
  if (data && !loading && !error) {
    setTimeout(() => {
      if (captureMode) {
        runBitmapCapture();
      } else {
        if (!autoPrint) notifyParent('desktop-print-dialog-opening');
        window.print();
      }
    }, 500); // aguarda QR Code ou outros elementos assíncronos se necessário
  }
}, [autoPrint, captureMode, data, loading, error]);

// Notifica ao fechar o diálogo de impressão
useEffect(() => {
  const handleAfterPrint = () => notifyParent('desktop-print-finished');
  window.addEventListener('afterprint', handleAfterPrint);
  return () => window.removeEventListener('afterprint', handleAfterPrint);
}, []);
```

---

### Frontend — Páginas Admin

| Arquivo | Módulo | Chave de módulo (`ThermalAutoPrintModuleKey`) |
|---|---|---|
| `app/admin/pre-orders/page.tsx` | Pré-pedidos | `"preOrders"` |
| `app/admin/orders/page.tsx` | Vendas | `"sales"` |

**Padrão de implementação em cada página admin:**

```ts
// Estados
const [isBitmapPrinting, setIsBitmapPrinting] = useState(false);   // overlay verde (silencioso)
const [desktopPrintWaiting, setDesktopPrintWaiting] = useState(false); // overlay azul (diálogo)
const [activePrintSessionId, setActivePrintSessionId] = useState<string | null>(null);

// Remove o iframe oculto de fallback
const removeDesktopPrintFrame = useCallback(() => {
  document.getElementById(DESKTOP_PRINT_FRAME_ID)?.remove();
}, []);

// Escuta mensagens das páginas de print (para limpar os overlays)
useEffect(() => {
  const onPrintMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as { type?: string; printSessionId?: string | null } | null;
    if (!data?.type) return;

    if (data.type === "desktop-print-dialog-opening") {
      setDesktopPrintWaiting(false);
      setActivePrintSessionId(null);
    }
    if (data.type === "desktop-print-finished") {
      setDesktopPrintWaiting(false);
      setActivePrintSessionId(null);
      removeDesktopPrintFrame();
    }
  };
  window.addEventListener("message", onPrintMessage);
  return () => window.removeEventListener("message", onPrintMessage);
}, [activePrintSessionId, removeDesktopPrintFrame]);

// Impressão direta (silenciosa) via bitmap
const tryDirectThermalPrint = useCallback(async (id: string) => {
  const preferences = await getDesktopPrintPreferences();
  const printerTarget = preferences.defaultThermalPrinterName?.trim()
    || preferences.defaultThermalPrinterId?.trim() || null;

  if (!printerTarget || !preferences.thermalAutoPrintModules.sales) return false; // trocar chave conforme módulo

  const printSessionId = crypto.randomUUID();
  setIsBitmapPrinting(true);
  try {
    const bitmapData = await new Promise<{ imageData: number[]; width: number; height: number }>(
      (resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:320px;height:1px;opacity:0;pointer-events:none;border:none;';
        iframe.src = `/print/receipt-thermal?orderId=${id}&printSessionId=${printSessionId}&captureMode=true`;
        document.body.appendChild(iframe);

        const timeout = setTimeout(() => {
          document.body.removeChild(iframe);
          reject(new Error('Timeout'));
        }, 30_000);

        const handler = (e: MessageEvent) => {
          if (e.data?.type === 'thermal-bitmap-capture' && e.data.printSessionId === printSessionId) {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            document.body.removeChild(iframe);
            resolve({ imageData: e.data.imageData, width: e.data.width, height: e.data.height });
          }
        };
        window.addEventListener('message', handler);
      },
    );

    await printBitmapToDesktopPrinter(printerTarget, bitmapData.imageData, bitmapData.width, bitmapData.height, `Documento ${id.slice(-8).toUpperCase()}`);
  } finally {
    setIsBitmapPrinting(false);
  }
  return true;
}, []);

// Função principal de impressão
const printThermalReceipt = async (id: string) => {
  const printSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  if (isDesktopRuntime()) {
    try {
      const printedDirectly = await tryDirectThermalPrint(id);
      if (printedDirectly) {
        showToast("Enviado para a impressora térmica.", "success");
        return;
      }
    } catch (error) {
      console.warn("Falha na impressão direta:", error);
    }

    // Fallback: abre diálogo de impressão via iframe oculto
    setActivePrintSessionId(printSessionId);
    setDesktopPrintWaiting(true);
    removeDesktopPrintFrame();

    const iframe = document.createElement("iframe");
    iframe.id = DESKTOP_PRINT_FRAME_ID;
    iframe.src = `/print/receipt-thermal?orderId=${id}&printSessionId=${printSessionId}&autoPrint=0`;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;right:-9999px;bottom:-9999px;opacity:0;pointer-events:none;border:0;';
    document.body.appendChild(iframe);

    window.setTimeout(() => {
      setDesktopPrintWaiting(false);
      setActivePrintSessionId(null);
      iframe.remove();
    }, 60000); // timeout de segurança
    return;
  }

  // Web: nova aba
  window.open(`/print/receipt-thermal?orderId=${id}&printSessionId=${printSessionId}`, '_blank');
};
```

**Overlays no JSX:**

```tsx
{/* Overlay azul: aguardando o diálogo do SO aparecer */}
{desktopPrintWaiting && (
  <div className="fixed inset-0 z-[100] bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center p-4">
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Preparando impressão</h3>
          <p className="mt-1 text-sm text-slate-600">
            Aguarde um instante. A janela de escolha da impressora será exibida em seguida.
          </p>
        </div>
      </div>
    </div>
  </div>
)}

{/* Overlay verde: bitmap sendo capturado e enviado */}
{isBitmapPrinting && (
  <div className="fixed inset-0 z-[100] bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center p-4">
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Enviando para a impressora</h3>
          <p className="mt-1 text-sm text-slate-600">
            Aguarde enquanto o cupom é preparado e enviado para a impressora térmica.
          </p>
        </div>
      </div>
    </div>
  </div>
)}
```

---

### Backend Rust (`src-tauri/src/main.rs`)

#### Conversão RGBA → ESC/POS Raster

```rust
fn rgba_to_escpos_raster(image_bytes: &[u8], width: u32, height: u32) -> Vec<u8> {
    let bytes_per_row = ((width + 7) / 8) as usize;
    let mut bitmap = Vec::with_capacity(bytes_per_row * height as usize);

    for y in 0..height as usize {
        for x_byte in 0..bytes_per_row {
            let mut byte = 0u8;
            for bit in 0..8u32 {
                let x = (x_byte as u32) * 8 + bit;
                if x < width {
                    let idx = (y as u32 * width + x) as usize * 4;
                    if idx + 2 < image_bytes.len() {
                        let r = image_bytes[idx] as u32;
                        let g = image_bytes[idx + 1] as u32;
                        let b = image_bytes[idx + 2] as u32;
                        let luminance = (r * 299 + g * 587 + b * 114) / 1000;
                        if luminance < 128 { byte |= 0x80u8 >> bit; }
                    }
                }
            }
            bitmap.push(byte);
        }
    }

    let x_l = (bytes_per_row & 0xFF) as u8;
    let x_h = ((bytes_per_row >> 8) & 0xFF) as u8;
    let y_l = (height & 0xFF) as u8;
    let y_h = ((height >> 8) & 0xFF) as u8;

    // ESC @ (reset) + GS v 0 (raster) + bitmap + 3x LF + GS V 0 (corte)
    let mut cmd = vec![0x1B, 0x40, 0x1D, 0x76, 0x30, 0x00, x_l, x_h, y_l, y_h];
    cmd.extend_from_slice(&bitmap);
    cmd.extend_from_slice(&[0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00]);
    cmd
}
```

**Conversão de pixel:** usa luminância ponderada (BT.601): `(R×299 + G×587 + B×114) / 1000`. Pixels com luminância < 128 viram ponto impresso (bit 1), os demais ficam brancos.

**Formato ESC/POS raster (`GS v 0`):**
- `1D 76 30 00` — comando GS v 0, modo normal
- `xL xH` — bytes por linha (little-endian)
- `yL yH` — número de linhas (little-endian)
- `[bitmap]` — dados raster, MSB primeiro por byte

#### Comando Tauri

```rust
#[tauri::command]
async fn print_bitmap_to_printer(
    printer_name: String,
    image_bytes: Vec<u8>,
    width: u32,
    height: u32,
    document_name: Option<String>,
) -> Result<(), String> {
    let escpos_bytes = rgba_to_escpos_raster(&image_bytes, width, height);
    print_raw_to_windows_printer(&printer_name, &escpos_bytes, document_name.as_deref())
}
```

Registrado no `invoke_handler` junto com os demais comandos.

---

### Camada TypeScript (`lib/runtime/capabilities.ts`)

```ts
export async function printBitmapToDesktopPrinter(
  printerName: string,
  imageBytes: number[],
  width: number,
  height: number,
  documentName?: string,
): Promise<void> {
  if (!isDesktopRuntime()) {
    throw new Error("Impressão bitmap só está disponível no runtime desktop");
  }
  return invoke<void>("print_bitmap_to_printer", {
    printerName, imageBytes, width, height,
    documentName: documentName ?? null,
  });
}
```

---

## Configuração de Preferências

As preferências ficam em `lib/runtime/printing.ts` e são persistidas pelo backend Tauri.

```ts
type ThermalAutoPrintModuleKey = "preOrders" | "sales"; // adicionar novos módulos aqui

interface DesktopPrintPreferences {
  defaultThermalPrinterId: string | null;
  defaultThermalPrinterName: string | null;
  thermalAutoPrintModules: Record<ThermalAutoPrintModuleKey, boolean>;
}
```

A UI de configuração fica em `/admin/settings` → seção Impressão.

---

## Fluxo Completo (Decisão em Runtime)

```
printThermalReceipt(id)
        │
        ├─ isDesktopRuntime()?
        │         │
        │         ├─ SIM → tryDirectThermalPrint(id)
        │         │              │
        │         │              ├─ impressora configurada + módulo ativo?
        │         │              │         │
        │         │              │         ├─ SIM → iframe captureMode=true
        │         │              │         │        → html2canvas → bitmap
        │         │              │         │        → print_bitmap_to_printer
        │         │              │         │        → overlay verde
        │         │              │         │        → toast sucesso ✓
        │         │              │         │
        │         │              │         └─ NÃO → return false
        │         │              │
        │         │              └─ return false → fallback ↓
        │         │
        │         └─ fallback desktop: iframe autoPrint=0
        │                  → window.print() (diálogo do SO)
        │                  → overlay azul até o diálogo aparecer
        │
        └─ NÃO (web) → window.open(url, '_blank')
```

---

## Como Adicionar um Novo Módulo

1. **`lib/runtime/printing.ts`** — adicionar a nova chave em `ThermalAutoPrintModuleKey` e no default de `thermalAutoPrintModules`.

2. **`src-tauri/src/main.rs`** — nenhuma alteração necessária (o comando `print_bitmap_to_printer` é genérico).

3. **Página de print** (`app/print/<modulo>/page.tsx`):
   - Adicionar leitura de `captureMode`, `autoPrint`, `printSessionId`
   - Importar `html2canvas`
   - Implementar `notifyParent()`, `runBitmapCapture()`
   - Ajustar `useEffect` de auto-print e adicionar listener `afterprint`
   - Adicionar classe `capture-mode` no wrapper e CSS `.capture-mode .no-print { display: none !important; }`

4. **Página admin** (`app/admin/<modulo>/page.tsx`):
   - Importar `getDesktopPrintPreferences`, `isDesktopRuntime`, `printBitmapToDesktopPrinter`
   - Adicionar estados: `isBitmapPrinting`, `desktopPrintWaiting`, `activePrintSessionId`
   - Implementar `removeDesktopPrintFrame`, `useEffect` de mensagens, `tryDirectThermalPrint`
   - Modificar a função de impressão principal para tentar direto primeiro
   - Adicionar os dois overlays (azul e verde) no JSX
