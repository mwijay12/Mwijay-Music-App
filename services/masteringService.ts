export interface MasteringOptions {
    preset: 'general' | 'pop' | 'classical' | 'jazz';
    targetLoudness: number;
    bassPreservation: boolean;
    outputFormat: 'wav' | 'mp3';
}

const API_BASE = 'https://api.bakuage.com';
const DEFAULT_TOKEN = 'guest_ffokjd01s8v7ps69hphosq42due7td4k2a6qc86a9c';

export class MasteringService {
    private token: string;

    constructor(token?: string) {
        this.token = token || DEFAULT_TOKEN;
    }

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
        };
    }

    /**
     * Upload audio ArrayBuffer to Bakuage /audios
     */
    async uploadAudio(arrayBuffer: ArrayBuffer, mimeType: string, filename: string): Promise<number> {
        console.log(`[MasteringService] Uploading audio: ${filename} (${arrayBuffer.byteLength} bytes)`);
        
        const blob = new Blob([arrayBuffer], { type: mimeType });
        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('name', filename);

        const response = await fetch(`${API_BASE}/audios`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[MasteringService] Upload failed:', errText);
            throw new Error(`Upload failed: ${response.statusText}. ${errText}`);
        }

        const data = await response.json();
        if (!data.id) {
            throw new Error('Upload succeeded but no audio ID was returned.');
        }

        console.log(`[MasteringService] Audio uploaded successfully. ID: ${data.id}`);
        return data.id;
    }

    /**
     * Poll audio preprocess status until ready
     */
    async waitForAudioReady(audioId: number): Promise<void> {
        console.log(`[MasteringService] Checking audio status for ID: ${audioId}`);
        const maxRetries = 15;
        for (let i = 0; i < maxRetries; i++) {
            const response = await fetch(`${API_BASE}/audios/${audioId}`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to check audio status: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.status === 'succeeded' || !data.status || data.status === 'ready') {
                console.log('[MasteringService] Audio is ready for processing.');
                return;
            }

            if (data.status === 'failed') {
                throw new Error(`Audio preprocessing failed: ${data.failure_reason || 'Unknown error'}`);
            }

            console.log(`[MasteringService] Audio status: ${data.status || 'waiting'}. Retrying in 1s...`);
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    /**
     * Create a mastering job for the uploaded audio
     */
    async createMastering(audioId: number, options: MasteringOptions): Promise<number> {
        console.log(`[MasteringService] Creating mastering job for audio ID ${audioId}`, options);

        const formData = new FormData();
        formData.append('input_audio_id', String(audioId));
        formData.append('mode', 'custom');
        formData.append('preset', options.preset);
        formData.append('target_loudness', String(options.targetLoudness));
        formData.append('target_loudness_mode', 'loudness');
        formData.append('bass_preservation', String(options.bassPreservation));
        formData.append('mastering_algorithm', 'v2');
        formData.append('bit_depth', '16');
        formData.append('sample_rate', '44100');
        formData.append('output_format', options.outputFormat);

        const response = await fetch(`${API_BASE}/masterings`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[MasteringService] Mastering creation failed:', errText);
            throw new Error(`Mastering creation failed: ${response.statusText}. ${errText}`);
        }

        const data = await response.json();
        if (!data.id) {
            throw new Error('Mastering creation succeeded but no job ID was returned.');
        }

        console.log(`[MasteringService] Mastering job created successfully. ID: ${data.id}`);
        return data.id;
    }

    /**
     * Poll mastering status until succeeded or failed
     */
    async pollMastering(masteringId: number, onProgress: (progress: number) => void): Promise<number> {
        console.log(`[MasteringService] Polling mastering job ID: ${masteringId}`);
        
        while (true) {
            const response = await fetch(`${API_BASE}/masterings/${masteringId}`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to check mastering status: ${response.statusText}`);
            }

            const data = await response.json();
            const progression = typeof data.progression === 'number' ? data.progression : 0;
            onProgress(progression);

            if (data.status === 'succeeded') {
                if (!data.output_audio_id) {
                    throw new Error('Mastering succeeded but output_audio_id is missing.');
                }
                console.log(`[MasteringService] Mastering succeeded. Output Audio ID: ${data.output_audio_id}`);
                return data.output_audio_id;
            }

            if (data.status === 'failed') {
                throw new Error(`Mastering process failed: ${data.failure_reason || 'Unknown error'}`);
            }

            if (data.status === 'canceled') {
                throw new Error('Mastering process was canceled.');
            }

            console.log(`[MasteringService] Polling status: ${data.status} | Progression: ${(progression * 100).toFixed(0)}%`);
            await new Promise((r) => setTimeout(r, 2000));
        }
    }

    /**
     * Download the mastered audio track binary data
     */
    async downloadAudio(audioId: number): Promise<ArrayBuffer> {
        console.log(`[MasteringService] Downloading mastered audio ID: ${audioId}`);
        
        const response = await fetch(`${API_BASE}/audios/${audioId}/download`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        console.log(`[MasteringService] Download completed. Size: ${buffer.byteLength} bytes`);
        return buffer;
    }
}
