export const CHAR_AUDIO_KEY: Record<string, string> = {
    'ก': 'consonant-ko-kai', 'ข': 'consonant-kho-khay',
    'ค': 'consonant-kho-khwai', 'ฆ': 'consonant-kho-rakhang',
    'ง': 'consonant-ngo-ngu', 'จ': 'consonant-jo-jan',
    'ฉ': 'consonant-cho-ching', 'ช': 'consonant-cho-chang',
    'ซ': 'consonant-so-so', 'ฌ': 'consonant-cho-cho',
    'ญ': 'consonant-yo-ying', 'ฎ': 'consonant-do-chada',
    'ฏ': 'consonant-to-patak', 'ฐ': 'consonant-tho-than',
    'ฑ': 'consonant-tho-montho', 'ฒ': 'consonant-tho-phuthau',
    'ณ': 'consonant-no-nen', 'ด': 'consonant-do-dek',
    'ต': 'consonant-to-tau', 'ถ': 'consonant-tho-thung',
    'ท': 'consonant-tho-thahan', 'ธ': 'consonant-tho-thong',
    'น': 'consonant-no-nu', 'บ': 'consonant-bo-baimai',
    'ป': 'consonant-po-pla', 'ผ': 'consonant-pho-phing',
    'ฝ': 'consonant-fo-fa', 'พ': 'consonant-pho-phan',
    'ฟ': 'consonant-fo-fan', 'ภ': 'consonant-pho-samphau',
    'ม': 'consonant-mo-ma', 'ย': 'consonant-yo-yak',
    'ร': 'consonant-ro-ria', 'ล': 'consonant-lo-ling',
    'ว': 'consonant-wo-weng', 'ศ': 'consonant-so-sala',
    'ษ': 'consonant-so-risi', 'ส': 'consonant-so-sia',
    'ห': 'consonant-ho-hip', 'ฬ': 'consonant-lo-jula',
    'อ': 'consonant-o-ang', 'ฮ': 'consonant-ho-nokhu',
    '-ะ': 'sara-a-short', '-า': 'sara-a-long',
    '-ิ': 'sara-i-short', '-ี': 'sara-i-long',
    '-ึ': 'sara-eu-short', '-ื': 'sara-eu-long',
    '-ุ': 'sara-u-short', '-ู': 'sara-u-long',
    'เ-': 'sara-e-long', 'เ-ะ': 'sara-e-short',
    'แ-': 'sara-ae-long', 'แ-ะ': 'sara-ae-short',
    'โ-': 'sara-o-long', 'โ-ะ': 'sara-o-short',
    'เ-าะ': 'sara-aw-short', '-อ': 'sara-aw-long',
    'เ-อะ': 'sara-uh-short', 'เ-อ': 'sara-uh-long',
    'เ-ียะ': 'sara-ia-short', 'เ-ีย': 'sara-ia-long',
    'เ-ือะ': 'sara-eua-short', 'เ-ือ': 'sara-eua-long',
    '-ัวะ': 'sara-ua-short', '-ัว': 'sara-ua-long',
    'ใ-': 'sara-ay-may-muan', 'ไ-': 'sara-ay-may-malay',
    '-ำ': 'sara-am', 'เ-า': 'sara-au',
    '-รร': 'sara-an-rohan', 'ฤ': 'sara-reu-short', 'ฤๅ': 'sara-reu-long',
};

// Single reusable audio element — "blessed" once on first user gesture so
// subsequent .play() calls work even from non-gesture contexts (e.g. WebSocket
// handlers on mobile browsers).
const voiceEl = new Audio();

// Tiny silent WAV (1 sample, 16-bit mono, 44.1 kHz)
const SILENT_WAV = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==";

let _warmedUp = false;

/** Pre-unlock the voiceover element. Must be called during a user gesture. */
export function warmupVoiceover(): void {
    if (_warmedUp) return;
    _warmedUp = true;
    voiceEl.src = SILENT_WAV;
    voiceEl.play().then(() => voiceEl.pause()).catch(() => {});
    // Pre-load audio data module so speakChar resolves instantly later
    import("./audio-data").catch(() => {});
}

export function speakChar(char: string): void {
    voiceEl.pause();
    voiceEl.currentTime = 0;
    const key = CHAR_AUDIO_KEY[char];
    if (!key) return;

    import("./audio-data").then(mod => {
        const data = mod.AUDIO_DATA.get(key);
        if (data) {
            voiceEl.src = "data:audio/mpeg;base64," + data;
            voiceEl.play().catch(err => {
                console.log("Audio playback blocked:", err);
            });
        }
    });
}

export function stopCharVoiceover(): void {
    voiceEl.pause();
    voiceEl.currentTime = 0;
}
