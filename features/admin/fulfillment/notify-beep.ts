/**
 * Beep curto via Web Audio API — sem dependência npm (T19 / docs/03).
 * Falha silenciosa se o browser bloquear autoplay até interação do usuário.
 */
export function playOrderNotificationBeep(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);

    oscillator.onended = () => {
      void ctx.close();
    };
  } catch {
    // Autoplay / AudioContext indisponível — badge visual ainda cobre o alerta.
  }
}
