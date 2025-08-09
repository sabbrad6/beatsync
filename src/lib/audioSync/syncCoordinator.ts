// Sync coordinator for managing multi-device audio synchronization
// Handles timing calculations and client coordination

import { AudioSyncController } from './audioController';

interface SyncResult {
    clientId: string;
    offset: number;
}

export class SyncCoordinator {
    private readonly audioController: AudioSyncController;
    private readonly BPM = 240; // As specified in the issue
    private readonly BEAT_INTERVAL = 60000 / this.BPM; // in milliseconds
    private isHost: boolean = false;
    private clientId: string = '';
    private syncInProgress: boolean = false;

    constructor() {
        this.audioController = new AudioSyncController();
    }

    public async initializeAsHost(): Promise<void> {
        this.isHost = true;
        this.clientId = 'HOST';
        await this.audioController.initializeAudio();
    }

    public async initializeAsGuest(clientNumber: number): Promise<void> {
        this.isHost = false;
        this.clientId = `CLIENT${clientNumber}`;
        await this.audioController.initializeAudio();
    }

    public async startSyncProcess(): Promise<void> {
        this.syncInProgress = true;
        
        if (this.isHost) {
            await this.coordinateSync();
        } else {
            await this.participateInSync();
        }
    }

    private async coordinateSync(): Promise<SyncResult[]> {
        const results: SyncResult[] = [];
        const startTime = performance.now();
        
        // Host starts the rhythm pattern
        const pattern = ['HOST', 'CLIENT1', 'CLIENT2', 'CLIENT3'];
        let beatCount = 0;

        while (this.syncInProgress && beatCount < 12) { // 3 complete cycles
            const currentTime = performance.now();
            const expectedBeatTime = startTime + (beatCount * this.BEAT_INTERVAL);
            
            if (currentTime >= expectedBeatTime) {
                const clientId = pattern[beatCount % 4];
                const frequency = this.audioController.getClientFrequency(clientId);
                
                // Generate beep if it's the host's turn
                if (clientId === 'HOST') {
                    await this.audioController.generateBeep(frequency, 0.1);
                }
                
                // Listen for and analyze other clients' beeps
                const detectedBeeps = await this.audioController.detectBeeps();
                
                // Calculate timing differences
                detectedBeeps.forEach((time, freq) => {
                    const expectedTime = expectedBeatTime;
                    const offset = time - expectedTime;
                    
                    const clientId = Object.entries(this.audioController.CLIENT_FREQUENCIES)
                        .find(([_, f]) => f === freq)?.[0];
                        
                    if (clientId && clientId !== 'HOST') {
                        results.push({
                            clientId,
                            offset
                        });
                    }
                });
                
                beatCount++;
            }
            
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to prevent CPU overload
        }

        return results;
    }

    private async participateInSync(): Promise<void> {
        const frequency = this.audioController.getClientFrequency(this.clientId);
        let beatCount = 0;
        const startTime = performance.now();

        while (this.syncInProgress && beatCount < 12) {
            const currentTime = performance.now();
            const expectedBeatTime = startTime + (beatCount * this.BEAT_INTERVAL);
            
            if (currentTime >= expectedBeatTime) {
                // Only beep when it's this client's turn
                const position = beatCount % 4;
                const shouldBeep = (
                    (this.clientId === 'CLIENT1' && position === 1) ||
                    (this.clientId === 'CLIENT2' && position === 2) ||
                    (this.clientId === 'CLIENT3' && position === 3)
                );

                if (shouldBeep) {
                    await this.audioController.generateBeep(frequency, 0.1);
                }
                
                beatCount++;
            }
            
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    public stopSync(): void {
        this.syncInProgress = false;
    }

    public adjustTiming(offset: number): void {
        // Apply timing adjustment based on calculated offset
        // This would integrate with the main BeatSync timing system
        if (!this.isHost) {
            // Implementation depends on how the main app handles timing
            console.log(`Adjusting timing by ${offset}ms`);
        }
    }
}