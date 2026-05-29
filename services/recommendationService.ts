import { auth } from './firebase.ts';
import type { Song } from '../types.ts';

export interface RecommendationSection {
  title: string;
  subtitle?: string;
  songs: Song[];
  type: 'for_you' | 'mood' | 'trending' | 'similar';
}

/**
 * AI Recommendation Service using Gemini to suggest songs.
 * Works with local library songs — no backend required.
 */
class RecommendationService {

  /**
   * Build personalized "For You" sections from local library + profile data.
   */
  async getForYou(
    librarySongs: Song[],
    recentlyPlayed: string[],
    topSongs: string[],
    currentHour: number,
    geminiApiKeys: string[]
  ): Promise<RecommendationSection[]> {
    if (librarySongs.length < 3) return [];

    const sections: RecommendationSection[] = [];

    // 1. Recently played context
    const recentSongs = recentlyPlayed
      .map(id => librarySongs.find(s => s.id === id))
      .filter((s): s is Song => !!s)
      .slice(0, 8);

    if (recentSongs.length > 0) {
      const artists = [...new Set(recentSongs.map(s => s.artist))];
      // Songs by same artists not in recent
      const moreBySameArtist = librarySongs
        .filter(s => artists.includes(s.artist) && !recentlyPlayed.includes(s.id))
        .slice(0, 10);

      if (moreBySameArtist.length > 0) {
        sections.push({
          type: 'for_you',
          title: `🎵 More from ${artists[0]}`,
          subtitle: 'Based on what you just played',
          songs: moreBySameArtist,
        });
      }
    }

    // 2. Time-of-day picks
    const timePick = this.getTimeBasedSection(librarySongs, currentHour);
    if (timePick) sections.push(timePick);

    // 3. Hidden gems — least played good songs
    const hiddenGems = librarySongs
      .filter(s => !recentlyPlayed.includes(s.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    if (hiddenGems.length > 0) {
      sections.push({
        type: 'for_you',
        title: '💎 Hidden Gems',
        subtitle: 'Songs you might have missed',
        songs: hiddenGems,
      });
    }

    // 4. AI-powered picks (if API key available)
    if (geminiApiKeys.length > 0 && librarySongs.length >= 10) {
      try {
        const aiPicks = await this.getAIPicks(librarySongs, recentSongs, geminiApiKeys[0]);
        if (aiPicks.length > 0) {
          sections.push({
            type: 'for_you',
            title: '✨ AI Picks For You',
            subtitle: 'Curated by Mwijay AI based on your taste',
            songs: aiPicks,
          });
        }
      } catch {
        // AI picks are optional — fail silently
      }
    }

    // 5. Shuffle of entire library as discovery
    const discovery = [...librarySongs]
      .sort(() => Math.random() - 0.5)
      .slice(0, 12);

    sections.push({
      type: 'for_you',
      title: '🔀 Random Discovery',
      subtitle: 'A little bit of everything',
      songs: discovery,
    });

    return sections;
  }

  private getTimeBasedSection(songs: Song[], hour: number): RecommendationSection | null {
    if (songs.length === 0) return null;

    let emoji = '🎵';
    let label = 'Good Vibes';
    let desc = 'Music for right now';

    if (hour >= 5 && hour < 9) { emoji = '☀️'; label = 'Morning Boost'; desc = 'Start your day right'; }
    else if (hour >= 9 && hour < 12) { emoji = '💪'; label = 'Focus Mode'; desc = 'Stay in the zone'; }
    else if (hour >= 12 && hour < 14) { emoji = '🍽️'; label = 'Lunch Vibes'; desc = 'Chill while you eat'; }
    else if (hour >= 14 && hour < 17) { emoji = '⚡'; label = 'Afternoon Energy'; desc = 'Power through'; }
    else if (hour >= 17 && hour < 20) { emoji = '🌅'; label = 'Evening Chill'; desc = 'Wind down'; }
    else if (hour >= 20 && hour < 23) { emoji = '😌'; label = 'Night Vibes'; desc = 'Relax & unwind'; }
    else { emoji = '🌙'; label = 'Late Night'; desc = 'Just you and the music'; }

    const picks = [...songs].sort(() => Math.random() - 0.5).slice(0, 10);

    return {
      type: 'mood',
      title: `${emoji} ${label}`,
      subtitle: desc,
      songs: picks,
    };
  }

  private async getAIPicks(
    allSongs: Song[],
    recentSongs: Song[],
    apiKey: string
  ): Promise<Song[]> {
    const context = recentSongs.map(s => `${s.title} by ${s.artist}`).join(', ');
    const allTitles = allSongs.map(s => s.title);

    const prompt = `I have these songs in my music library: ${allTitles.slice(0, 50).join(', ')}.
    
Based on recently played: ${context || 'no recent plays'}.

Pick 8 song titles from the library list that I'd most enjoy next. Return ONLY a JSON array of song titles, no explanation:
["Title1", "Title2", ...]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) throw new Error('Gemini API failed');

    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    const cleaned = text.replace(/```json|```/g, '').trim();
    const titles: string[] = JSON.parse(cleaned);

    return titles
      .map(title => allSongs.find(s => s.title.toLowerCase() === title.toLowerCase()))
      .filter((s): s is Song => !!s)
      .slice(0, 8);
  }

  getSimilarTo(song: Song, library: Song[]): Song[] {
    return library
      .filter(s =>
        s.id !== song.id &&
        (s.artist === song.artist ||
          s.moodEmoji === song.moodEmoji)
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 12);
  }
}

export const recommendationService = new RecommendationService();
