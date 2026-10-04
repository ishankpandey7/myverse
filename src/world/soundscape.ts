// Synthesised locally: no audio files, network requests or autoplay.
export function createSoundscape() {
  const context = new AudioContext();
  const volume = context.createGain();
  volume.gain.value = 0.055;
  volume.connect(context.destination);
  const voices = [130.81, 196, 261.63].map((frequency, index) => {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.12 / (index + 1);
    oscillator.connect(gain);
    gain.connect(volume);
    oscillator.start();
    return oscillator;
  });
  void context.resume().catch(() => {});
  return {
    chime() {
      if (context.state === "closed") return;
      [523.25, 659.25, 783.99].forEach((frequency, i) => {
        const oscillator = context.createOscillator(),
          envelope = context.createGain();
        const at = context.currentTime + i * 0.1;
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(0.3, at + 0.03);
        envelope.gain.exponentialRampToValueAtTime(0.001, at + 1.4);
        oscillator.connect(envelope);
        envelope.connect(volume);
        oscillator.start(at);
        oscillator.stop(at + 1.5);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      });
    },
    pause(paused: boolean) {
      if (context.state === "closed") return;
      void (paused ? context.suspend() : context.resume()).catch(() => {});
    },
    close() {
      voices.forEach((voice) => voice.stop());
      void context.close();
    },
  };
}
