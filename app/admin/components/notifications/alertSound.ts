/**
 * Aviso sonoro do admin para pagamentos ainda não confirmados e pedidos aguardando resposta.
 * Toca o arquivo `public/audio/sompagamentosepedidos.mp3`; se ele não carregar, cai num beep gerado na hora (WebAudio).
 * A preferência fica no navegador deste computador e vem ligada até a pessoa desligar.
 */

export const ALERT_SOUND_KEY = "admin:alert-sound";
/** Quando o aviso tocou pela última vez (compartilhado entre abas e recargas da página). */
export const ALERT_LAST_PLAYED_KEY = "admin:alert-sound-last";
/** De quanto em quanto tempo o aviso se repete enquanto houver algo em aberto. */
export const ALERT_REPEAT_MS = 5 * 60 * 1000;

const SOUND_URL = "/audio/sompagamentosepedidos.mp3";

export function readAlertSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(ALERT_SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function readLastPlayedAt(): number {
  try {
    const value = Number(window.localStorage.getItem(ALERT_LAST_PLAYED_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function saveLastPlayedAt(at: number): void {
  try {
    window.localStorage.setItem(ALERT_LAST_PLAYED_KEY, String(at));
  } catch {
    // Sem armazenamento: o aviso repete a partir desta aba
  }
}

/** Já passou o intervalo desde o último aviso? (puro, para teste) */
export function isAlertDue(now: number, lastPlayedAt: number, repeatMs: number = ALERT_REPEAT_MS): boolean {
  return now - lastPlayedAt >= repeatMs;
}

export function saveAlertSoundPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(ALERT_SOUND_KEY, enabled ? "1" : "0");
  } catch {
    // Sem armazenamento (janela privada, bloqueio): a preferência vale só até recarregar
  }
}

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!audioContext) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    return audioContext;
  } catch {
    return null;
  }
}

let audio: HTMLAudioElement | null = null;

/**
 * Toca o som de pagamentos e pedidos. Devolve `true` se tocou e `false` se o navegador ainda não deixou
 * (sem clique da pessoa na página): quem chama tenta de novo depois, sem marcar como tocado.
 */
export async function playPendingSound(): Promise<boolean> {
  try {
    if (!audio) audio = new Audio(SOUND_URL);
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") return false;
    playAlertBeep(); // arquivo ausente ou formato não suportado
    return true;
  }
}

/** Dois toques curtos e suaves (dó-mi agudos). Nunca lança: sem áudio liberado, só fica em silêncio. */
export function playAlertBeep(): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    void ctx.resume?.();
    const start = ctx.currentTime + 0.01;
    [880, 1175].forEach((frequency, index) => {
      const at = start + index * 0.16;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.15);
    });
  } catch {
    // Silêncio é melhor que erro na tela
  }
}
