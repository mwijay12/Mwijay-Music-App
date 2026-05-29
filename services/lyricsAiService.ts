export interface LyricsAnalysis {
  theme: string;
  mood: string;
  meaning: string;
  key_lines: string[];
  emotions: string[];
  story: string;
  metaphors?: string[];
}

class LyricsAiService {
  private getApiUrl(): string {
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async analyzeLyrics(
    songTitle: string,
    artist: string,
    lyricsText: string
  ): Promise<LyricsAnalysis | null> {
    if (!lyricsText || lyricsText.length < 20) {
      throw new Error('Lyrics too short to analyze');
    }
    
    try {
      const response = await fetch(`${this.getApiUrl()}/api/lyrics/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: songTitle,
          artist: artist,
          lyrics: lyricsText.slice(0, 3000),  // Limit for API
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.analysis;
      
    } catch (error) {
      console.error('[LyricsAI] Analysis error:', error);
      return null;
    }
  }
  
  async explainLine(
    line: string,
    songContext: string,
    artist: string
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.getApiUrl()}/api/lyrics/explain-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line,
          context: songContext,
          artist,
        }),
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.explanation;
      
    } catch {
      return null;
    }
  }
}

export const lyricsAi = new LyricsAiService();
