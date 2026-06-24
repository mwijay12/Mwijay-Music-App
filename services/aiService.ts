interface AIServiceConfig {
  apiKey: string | null
  model: string
  enabled: boolean
}

class AIService {
  private config: AIServiceConfig = {
    apiKey: null,
    model: 'gemini-pro',
    enabled: false,
  }
  
  async initialize(): Promise<void> {
    // Read from settings/env
    const apiKey = localStorage.getItem('mwijay_ai_key') || import.meta.env.VITE_GEMINI_API_KEY
    
    if (apiKey && apiKey !== 'YOUR_KEY_HERE' && apiKey.length > 20) {
      this.config.apiKey = apiKey
      this.config.enabled = true
      console.log('[AI] Service initialized')
    } else {
      console.warn('[AI] No valid API key found. AI features disabled.')
      this.config.enabled = false
    }
  }
  
  isEnabled(): boolean {
    return this.config.enabled && this.config.apiKey !== null
  }
  
  setApiKey(key: string): void {
    if (key && key.length > 20) {
      this.config.apiKey = key
      this.config.enabled = true
      localStorage.setItem('mwijay_ai_key', key)
    }
  }
  
  async generateContent(prompt: string): Promise<string | null> {
    // Lazy initialize if not already done
    if (!this.config.apiKey) {
      const apiKey = localStorage.getItem('mwijay_ai_key') || import.meta.env.VITE_GEMINI_API_KEY
      if (apiKey && apiKey !== 'YOUR_KEY_HERE' && apiKey.length > 20) {
        this.config.apiKey = apiKey
        this.config.enabled = true
      }
    }

    if (!this.isEnabled()) {
      return null
    }
    
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: this.config.model,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[AI] Proxy error:', error);
        if (response.status === 401 || response.status === 403) {
          this.config.enabled = false;
        }
        return null;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || null;
    } catch (error) {
      console.error('[AI] Generation failed:', error);
      return null;
    }
  }
  
  async analyzeLyrics(
    title: string,
    artist: string,
    lyrics: string
  ): Promise<any> {
    if (!this.isEnabled()) {
      return {
        error: 'AI service not configured',
        message: 'Add your Gemini API key in Settings to enable AI lyrics analysis',
      }
    }
    
    const prompt = `Analyze this song. Return ONLY valid JSON, no markdown.

Song: "${title}" by ${artist}
Lyrics: ${lyrics.substring(0, 2000)}

Return JSON:
{
  "theme": "main theme (3-5 words)",
  "mood": "mood (2-3 words)",
  "meaning": "what song means in 2 sentences",
  "emotions": ["emotion1", "emotion2", "emotion3"],
  "key_lines": ["most impactful line 1", "line 2", "line 3"],
  "story": "story in 3 sentences"
}`
    
    const response = await this.generateContent(prompt)
    
    if (!response) {
      return {
        error: 'Failed to analyze',
        message: 'Could not analyze lyrics. Try again.',
      }
    }
    
    try {
      // Clean markdown if present
      let cleaned = response.trim()
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
      
      return JSON.parse(cleaned.trim())
    } catch {
      return {
        error: 'Invalid response',
        message: 'Got response but could not parse it',
        raw: response,
      }
    }
  }
  
  async getRecommendations(
    likedSongs: any[],
    recentHistory: any[]
  ): Promise<string[]> {
    if (!this.isEnabled()) return []
    
    const prompt = `Based on these songs the user likes:
${likedSongs.slice(0, 10).map(s => `- ${s.title} by ${s.artist}`).join('\n')}

Recently played:
${recentHistory.slice(0, 10).map(s => `- ${s.title} by ${s.artist}`).join('\n')}

Suggest 10 similar songs. Return ONLY a JSON array:
["Song1 - Artist1", "Song2 - Artist2", ...]`
    
    const response = await this.generateContent(prompt)
    if (!response) return []
    
    try {
      let cleaned = response.trim()
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
      
      return JSON.parse(cleaned.trim())
    } catch {
      return []
    }
  }

  // ─── ADDED COMPATIBILITY INTERFACES FOR TRANSCRIBER & ZEN MODE ───
  
  async analyzeMedia(mediaInput: any, _options?: any): Promise<any> {
    try {
      const audioUrl = mediaInput?.audio?.audioUrl;
      const audioBase64 = mediaInput?.audio?.base64;
      const mimeType = mediaInput?.audio?.mimeType;

      const response = await fetch('http://localhost:8000/api/audio/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl || null,
          audio_base64: audioBase64 || null,
          mime_type: mimeType || 'audio/mp3'
        })
      });

      if (!response.ok) {
        throw new Error(`Server transcription request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error("AI deep analysis transcription query failed on backend, falling back:", err);
      return {
        lyrics: "AI Transcription Offline. Could not query server transcription service.",
        segments: [
          { timestamp: "00:00", content: "Audio analysis started..." },
          { timestamp: "00:05", content: "AI Transcription engine failed to respond." },
          { timestamp: "00:10", content: "Please verify backend server is active." }
        ]
      };
    }
  }

  async getZenContent(topic: string): Promise<string> {
    const prompt = `Write a short, beautiful, glassmorphic Zen meditation quote/reflection (2-3 sentences) about "${topic}". Respond only with plain text, no markdown.`;
    const response = await this.generateContent(prompt);
    return response || `Take a deep breath and focus on the present moment. Let go of the past and the future. Embrace the ${topic}.`;
  }

  async textToSpeech(_text: string): Promise<string> {
    return "";
  }
}

export const aiService = new AIService()
export default aiService;
