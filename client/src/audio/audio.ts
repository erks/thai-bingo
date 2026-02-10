let audioCtx: AudioContext | null = null;

export function ensureAudio(): void {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (audioCtx.currentTime < 0.1) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.01);
    }
}

export function playTone(freq: number, dur: number, vol = 0.2, type: OscillatorType = "sine"): void {
    ensureAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
}

export function sfxCall(): void { playTone(587, 0.15, 0.2); setTimeout(() => playTone(784, 0.15, 0.2), 100); }
export function sfxMark(): void { playTone(880, 0.12, 0.15); }
export function sfxWrong(): void { playTone(200, 0.15, 0.15, "square"); }
export function sfxWin(): void { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 0.25), i * 140)); }
export function sfxReady(): void { playTone(660, 0.1, 0.15); }
export function sfxAllReady(): void { [660, 784, 988].forEach((f, i) => setTimeout(() => playTone(f, 0.12, 0.2), i * 100)); }
