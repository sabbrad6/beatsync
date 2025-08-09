// Audio synchronization controller for BeatSync
// Handles microphone input, beep generation, and synchronization logic

export class AudioSyncController {
    private readonly sampleRate = 48000;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private microphone: MediaStreamAudioSourceNode | null = null;
    
    // Frequencies for different clients (A4 to D4 notes in Hz)
    private readonly CLIENT_FREQUENCIES = {
        HOST: 440.00,  // A4
        CLIENT1: 493.88, // B4
        CLIENT2: 523.25, // C4
        CLIENT3: 587.33  // D4
    };

    constructor() {
        this.initializeAudio();
    }

    private async initializeAudio(): Promise<void> {
        try {
            this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.microphone.connect(this.analyser);
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            throw error;
        }
    }

    public async generateBeep(frequency: number, duration: number): Promise<void> {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        // Apply fade in/out to avoid clicks
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    public async detectBeeps(): Promise<Map<number, number>> {
        if (!this.analyser) throw new Error('Analyser not initialized');

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.analyser.getFloatFrequencyData(dataArray);

        const detectedBeeps = new Map<number, number>();
        const frequencies = Object.values(this.CLIENT_FREQUENCIES);

        frequencies.forEach(targetFreq => {
            const binIndex = Math.round(targetFreq * bufferLength / this.sampleRate);
            const magnitude = dataArray[binIndex];
            if (magnitude > -50) { // Threshold for detecting a beep
                detectedBeeps.set(targetFreq, this.audioContext!.currentTime);
            }
        });

        return detectedBeeps;
    }

    public getClientFrequency(clientId: string): number {
        return this.CLIENT_FREQUENCIES[clientId as keyof typeof this.CLIENT_FREQUENCIES];
    }
}