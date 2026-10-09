/**
 * Aviso sonoro opcional do admin: um beep curto gerado na hora (WebAudio), sem arquivo de áudio.
 * A preferência fica no navegador deste computador, desligada por padrão.
 */

export const ALERT_SOUND_KEY = "admin:alert-sound";

export function readAlertSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(ALERT_SOUND_KEY) === "1";
  } catch {
    return false;
  }
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
