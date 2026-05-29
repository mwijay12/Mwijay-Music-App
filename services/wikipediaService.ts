import { getFromStore, saveToStore } from '../components/db.ts';

export interface WikiSummary {
  title: string;
  description: string;    // Short one-liner
  bio: string;            // Full extract text
  shortBio: string;       // First 200 chars of extract
  image?: string;         // Thumbnail URL
  wikiUrl: string;        // Link to full Wikipedia page
  found: boolean;
}

const WIKI_API_BASE = 'https://en.wikipedia.org/api/rest_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

const sanitizeWikiTitle = (title: string): string => {
  return encodeURIComponent(title.trim().replace(/\s+/g, '_'));
};

const extractFirstSentence = (text: string): string => {
  if (!text) return '';
  // Split at sentence boundaries (period, exclamation, question mark followed by space or end)
  const matches = text.match(/[^.!?]+[.!?]+(\s|$)/);
  return matches ? matches[0].trim() : text.slice(0, 100) + '...';
};

class WikipediaService {
  /**
   * Helper to perform Wikipedia Rest API fetch and parse into WikiSummary
   */
  private async fetchSummary(title: string): Promise<WikiSummary | null> {
    try {
      const sanitized = sanitizeWikiTitle(title);
      const url = `${WIKI_API_BASE}/page/summary/${sanitized}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      if (!data.extract) return null;

      const extract = data.extract;
      return {
        title: data.displaytitle || data.title || title,
        description: data.description || 'Musician',
        bio: extract,
        shortBio: extract.length > 200 ? extract.slice(0, 200).trim() + '...' : extract,
        image: data.thumbnail?.source || undefined,
        wikiUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${sanitized}`,
        found: true,
      };
    } catch (e) {
      console.warn(`Wikipedia fetch failed for title: ${title}`, e);
      return null;
    }
  }

  /**
   * Performs Wikipedia page search to find potential matches
   */
  private async searchPages(query: string): Promise<string[]> {
    try {
      const url = `${WIKI_API_BASE}/page/search?q=${encodeURIComponent(query)}&limit=5`;
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (response.ok) {
        const data = await response.json();
        if (data.pages && Array.isArray(data.pages)) {
          return data.pages.map((p: any) => p.title || p.key).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn(`Wikipedia search failed for query: ${query}`, e);
    }
    return [];
  }

  /**
   * Fetches the bio of an artist with multiple fallbacks and caching.
   */
  public async getArtistBio(artistName: string): Promise<WikiSummary> {
    if (!artistName || artistName.toLowerCase() === 'unknown artist') {
      return { title: 'Unknown Artist', description: '', bio: '', shortBio: '', wikiUrl: '', found: false };
    }

    const cacheKey = `wiki_${artistName.trim().toLowerCase()}`;

    // 1. Try to read from IndexedDB cache
    try {
      const cached = await getFromStore('wiki_cache', cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.summary;
      }
    } catch (e) {
      console.warn("Wiki cache retrieval failed:", e);
    }

    let summary: WikiSummary | null = null;

    // 2. Try direct: ArtistName_(musician)
    summary = await this.fetchSummary(`${artistName} (musician)`);

    // 3. If failed, try direct: ArtistName
    if (!summary) {
      summary = await this.fetchSummary(artistName);
    }

    // 4. If failed, try Wikipedia Search
    if (!summary) {
      const searchMatches = await this.searchPages(artistName);
      if (searchMatches.length > 0) {
        // Try direct summary on first search result
        summary = await this.fetchSummary(searchMatches[0]);
      }
    }

    const finalSummary: WikiSummary = summary || {
      title: artistName,
      description: 'Artist Info Not Found',
      bio: `We couldn't find a Wikipedia page for ${artistName}. Make sure the artist name is spelled correctly.`,
      shortBio: `We couldn't find a Wikipedia page for ${artistName}.`,
      wikiUrl: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(artistName)}`,
      found: false
    };

    // 5. Cache result (even if not found, to avoid hammer-querying API)
    try {
      await saveToStore('wiki_cache', {
        id: cacheKey,
        summary: finalSummary,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn("Wiki cache save failed:", e);
    }

    return finalSummary;
  }

  /**
   * Fetches music history/genre topic pages.
   */
  public async getMusicHistory(topic: string): Promise<WikiSummary> {
    const cacheKey = `wiki_${topic.trim().toLowerCase()}`;

    try {
      const cached = await getFromStore('wiki_cache', cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.summary;
      }
    } catch (e) {}

    let summary: WikiSummary | null = null;

    // Try direct topic summary
    summary = await this.fetchSummary(topic);

    if (!summary) {
      // Fallback search
      const searchMatches = await this.searchPages(topic);
      if (searchMatches.length > 0) {
        summary = await this.fetchSummary(searchMatches[0]);
      }
    }

    const finalSummary: WikiSummary = summary || {
      title: topic,
      description: 'Topic Not Found',
      bio: `Information about ${topic} is currently unavailable offline.`,
      shortBio: `Information about ${topic} is unavailable offline.`,
      wikiUrl: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
      found: false
    };

    try {
      await saveToStore('wiki_cache', {
        id: cacheKey,
        summary: finalSummary,
        timestamp: Date.now()
      });
    } catch (e) {}

    return finalSummary;
  }

  /**
   * Returns only the first sentence of an artist's biography.
   */
  public async getShortFact(artistName: string): Promise<string> {
    const bio = await this.getArtistBio(artistName);
    if (!bio.found || !bio.bio) {
      return `${artistName} is a talented music recording artist.`;
    }
    return extractFirstSentence(bio.bio);
  }
}

export const wikipediaService = new WikipediaService();
export default wikipediaService;
