import { getFromStore, saveToStore } from '../components/db.ts';

export interface Quote {
  text: string;
  author: string;
  source: 'api' | 'local';
}

export const MUSIC_QUOTES = [
  { text: "Music gives a soul to the universe, wings to the mind, flight to the imagination, and life to everything.", author: "Plato" },
  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },
  { text: "Music is the strongest form of magic.", author: "Marilyn Manson" },
  { text: "One good thing about music, when it hits you, you feel no pain.", author: "Bob Marley" },
  { text: "Music can change the world because it can change people.", author: "Bono" },
  { text: "Where words fail, music speaks.", author: "Hans Christian Andersen" },
  { text: "Music is the wine that fills the cup of silence.", author: "Robert Fripp" },
  { text: "Life is one grand, sweet song, so start the music.", author: "Ronald Reagan" },
  { text: "Music is the universal language of mankind.", author: "Henry Wadsworth Longfellow" },
  { text: "After silence, that which comes nearest to expressing the inexpressible is music.", author: "Aldous Huxley" },
  { text: "Music was my refuge.", author: "Maya Angelou" },
  { text: "To stop the flow of music would be like the stopping of time itself.", author: "Aaron Copland" },
  { text: "Music is the art which is most nigh to tears and memory.", author: "Oscar Wilde" },
  { text: "Music is the shorthand of emotion.", author: "Leo Tolstoy" },
  { text: "Without music, life would be a blank to me.", author: "Jane Austen" },
  { text: "Music is what feelings sound like.", author: "Unknown" },
  { text: "Music touches us emotionally, where words alone can't.", author: "Johnny Depp" },
  { text: "A painter paints pictures on canvas. But musicians paint their pictures on silence.", author: "Leopold Stokowski" },
  { text: "Music is the mediator between the spiritual and the sensual life.", author: "Ludwig van Beethoven" },
  { text: "I see my life in terms of music.", author: "Albert Einstein" },
];

// In-memory tracker to prevent immediate duplicate random quotes
let lastRandomQuoteText = '';

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

class QuotesService {
  /**
   * Fetches or retrieves the same cached quote of the day.
   */
  public async getDailyQuote(): Promise<Quote> {
    const today = getTodayDateString();
    
    try {
      // 1. Check IndexedDB cache
      const cached = await getFromStore('quote_cache', today);
      if (cached) {
        return {
          text: cached.text,
          author: cached.author,
          source: cached.source,
        };
      }
    } catch (e) {
      console.warn("Failed to retrieve daily quote from cache:", e);
    }

    // 2. Fetch fresh quote from FastAPI proxy
    try {
      const response = await fetch('http://localhost:8000/proxy/quote', { signal: AbortSignal.timeout(4000) });
      if (response.ok) {
        const data = await response.json();
        const quote: Quote = {
          text: data.quoteText || '',
          author: data.quoteAuthor ? data.quoteAuthor.trim() : 'Unknown',
          source: 'api',
        };
        
        if (quote.text) {
          await saveToStore('quote_cache', { id: today, ...quote });
          return quote;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch daily quote from API, using offline fallback:", e);
    }

    // 3. Fallback to random offline local quote
    const randomIndex = Math.floor(Math.random() * MUSIC_QUOTES.length);
    const localQuote = MUSIC_QUOTES[randomIndex];
    const fallbackQuote: Quote = {
      text: localQuote.text,
      author: localQuote.author,
      source: 'local',
    };

    try {
      await saveToStore('quote_cache', { id: today, ...fallbackQuote });
    } catch (e) {
      console.warn("Failed to save daily fallback quote to cache:", e);
    }

    return fallbackQuote;
  }

  /**
   * Always fetches a brand new quote ignoring cache.
   */
  public async getRandomQuote(): Promise<Quote> {
    try {
      const response = await fetch('http://localhost:8000/proxy/quote', { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json();
        const quote: Quote = {
          text: data.quoteText || '',
          author: data.quoteAuthor ? data.quoteAuthor.trim() : 'Unknown',
          source: 'api',
        };

        if (quote.text && quote.text !== lastRandomQuoteText) {
          lastRandomQuoteText = quote.text;
          return quote;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch random quote from API, using offline fallback:", e);
    }

    // Filter out the last shown quote if possible
    const availableQuotes = MUSIC_QUOTES.filter(q => q.text !== lastRandomQuoteText);
    const pool = availableQuotes.length > 0 ? availableQuotes : MUSIC_QUOTES;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];

    const result: Quote = {
      text: chosen.text,
      author: chosen.author,
      source: 'local',
    };
    lastRandomQuoteText = result.text;
    return result;
  }

  /**
   * Synchronously rotates local quotes for notifications, offline safe.
   */
  public getQuoteForNotification(): Quote {
    const storageKey = 'mwijay_last_notif_quote_index';
    let lastIndex = -1;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        lastIndex = parseInt(stored, 10);
      }
    } catch (e) {}

    const nextIndex = (lastIndex + 1) % MUSIC_QUOTES.length;
    
    try {
      localStorage.setItem(storageKey, String(nextIndex));
    } catch (e) {}

    const quote = MUSIC_QUOTES[nextIndex];
    return {
      text: quote.text,
      author: quote.author,
      source: 'local',
    };
  }
}

export const quotesService = new QuotesService();
export default quotesService;
