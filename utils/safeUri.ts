/**
 * safeUri.ts
 *
 * PROBLEM: URIError: URI malformed
 * ─────────────────────────────────
 * This error happens because:
 *
 * 1. Song/video file paths from Android contain characters like:
 *    - % (percent signs in filenames: "100% Bongo.mp3")
 *    - # (hash: "Track #1.mp3")
 *    - & (ampersand: "Juma & Amina.mp3")
 *    - + (plus: "Love+Life.mp3")
 *    - spaces encoded wrong
 *    - Non-ASCII: "Ninapendá.mp3", "Msisitizo — Bongo.mp3"
 *
 * 2. React Router tries to encode/decode these as URL parameters
 *
 * 3. Capacitor.convertFileSrc() on paths with special chars
 *    sometimes returns malformed URLs
 *
 * 4. IndexedDB stores raw paths, but when retrieved and used
 *    in <audio src={}> they need proper encoding
 *
 * SOLUTION: Every place that touches file paths or URL params
 * MUST go through this utility. Never use raw decodeURIComponent().
 *
 * RULE: File paths → always use safeFileSrc() for audio/video src
 *       URL params → always use safeParam() to encode
 *       Retrieving → always use safeDecode() not decodeURIComponent()
 */

import { Capacitor } from '@capacitor/core';

// ─── Core Safe Functions ──────────────────────────────────────────────────────

/**
 * SAFE VERSION of decodeURIComponent.
 * Never throws — returns original string if decode fails.
 *
 * Replace ALL uses of decodeURIComponent() in the app with this.
 *
 * @param value  String to decode
 * @param fallback  What to return if decode fails (default: original value)
 */
export function safeDecode(value: string, fallback?: string): string {
  if (!value) return fallback ?? value ?? '';

  try {
    return decodeURIComponent(value);
  } catch {
    // If decode fails, try fixing common issues first
    try {
      // Replace bare % that aren't followed by valid hex with %25
      const fixed = value.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
      return decodeURIComponent(fixed);
    } catch {
      // Still failing — return original or fallback
      return fallback ?? value;
    }
  }
}

/**
 * SAFE VERSION of encodeURIComponent.
 * Never throws — strips invalid characters if encode fails.
 *
 * @param value  String to encode for URL usage
 */
export function safeEncode(value: string): string {
  if (!value) return '';

  try {
    return encodeURIComponent(value);
  } catch {
    // Strip non-encodable characters and try again
    try {
      // Remove characters outside safe ASCII range
      const cleaned = value.replace(/[^\x20-\x7E]/g, '_');
      return encodeURIComponent(cleaned);
    } catch {
      // Last resort: return alphanumeric only
      return value.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
    }
  }
}

/**
 * Convert a local file path to a URL safe for use in
 * HTML audio/video src attributes inside Capacitor WebView.
 *
 * This is THE correct way to play local files.
 * Do NOT use raw file paths as src — they will fail.
 *
 * Handles:
 * - Android file:// paths
 * - content:// URIs (from media store)
 * - Already-converted https://localhost paths
 * - Paths with spaces, %, #, &, non-ASCII characters
 *
 * @param path  Raw file path from scanner or database
 * @returns     Playable URL for the WebView
 */
export function safeFileSrc(path: string): string {
  if (!path) return '';

  // Already a web URL (https, http, blob) — use as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Already a blob URL — use as-is
  if (path.startsWith('blob:')) {
    return path;
  }

  // Already a data URL — use as-is
  if (path.startsWith('data:')) {
    return path;
  }

  try {
    // Running natively in Capacitor APK
    if (Capacitor.isNativePlatform()) {
      // Capacitor.convertFileSrc handles the conversion but
      // sometimes chokes on special characters in the path
      // We need to handle the path carefully

      let normalizedPath = path;

      // content:// URIs — convert directly, no modification needed
      if (path.startsWith('content://')) {
        return Capacitor.convertFileSrc(path);
      }

      // Ensure file:// prefix for local paths
      if (!path.startsWith('file://') && path.startsWith('/')) {
        normalizedPath = `file://${path}`;
      }

      // The path segment (after file://) needs encoding
      // but the file:// scheme prefix must stay unencoded
      if (normalizedPath.startsWith('file://')) {
        const pathPart = normalizedPath.substring(7); // Remove 'file://'

        // Encode only the path segments, not the slashes
        const encodedPath = pathPart
          .split('/')
          .map(segment => {
            // Skip empty segments (from leading /)
            if (!segment) return segment;

            // Check if already encoded (has %XX sequences)
            const hasEncoding = /%[0-9A-Fa-f]{2}/.test(segment);
            if (hasEncoding) {
              // Decode first to avoid double encoding
              const decoded = safeDecode(segment, segment);
              return encodeSingleSegment(decoded);
            }

            return encodeSingleSegment(segment);
          })
          .join('/');

        const cleanFileUrl = `file://${encodedPath}`;
        return Capacitor.convertFileSrc(cleanFileUrl);
      }

      return Capacitor.convertFileSrc(normalizedPath);
    } else {
      // Running in browser dev mode — return path as-is
      return path;
    }
  } catch (error) {
    console.warn('[safeUri] Failed to convert path:', path, error);
    // Last resort: try to use path directly
    return path;
  }
}

/**
 * Encode a single URL path segment safely.
 * Encodes special characters but preserves valid URL characters.
 *
 * @param segment  Single path component (between slashes)
 */
function encodeSingleSegment(segment: string): string {
  try {
    // encodeURIComponent encodes everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( )
    // We want to also preserve some chars that are safe in paths
    return encodeURIComponent(segment)
      .replace(/%20/g, '%20') // Keep spaces encoded (not +)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  } catch {
    // If encoding fails, strip problematic characters
    return segment.replace(/[%#&?]/g, '_');
  }
}

/**
 * Safely encode a value for use as a URL/route parameter.
 * Use this when navigating to a route with track/song data.
 *
 * @param value  The parameter value (song title, artist name, etc.)
 */
export function safeParam(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return safeEncode(String(value));
}

/**
 * Parse a URL parameter safely.
 * Use this when reading params from useParams() or searchParams.
 *
 * @param value  Raw param value from URL
 * @param defaultValue  What to return if null/undefined/decode fails
 */
export function parseParam(
  value: string | null | undefined,
  defaultValue: string = ''
): string {
  if (!value) return defaultValue;
  return safeDecode(value, defaultValue);
}

/**
 * Build a query string from an object, safely encoding all values.
 *
 * @param params  Object with string values
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    parts.push(`${safeEncode(key)}=${safeEncode(String(value))}`);
  }

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Parse a full query string into an object, safely.
 *
 * @param search  The search string (e.g., from location.search)
 */
export function parseQueryString(search: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!search) return result;

  const clean = search.startsWith('?') ? search.slice(1) : search;
  const pairs = clean.split('&');

  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;

    const key = safeDecode(pair.substring(0, eqIndex));
    const value = safeDecode(pair.substring(eqIndex + 1));

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitize a filename for display.
 * Removes/replaces characters that cause display issues.
 *
 * @param filename  Raw filename from filesystem
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'Unknown';

  return filename
    // Decode any encoded characters first
    .replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '_';
      }
    })
    // Remove extension
    .replace(/\.[a-zA-Z0-9]{2,5}$/, '')
    // Replace underscores/hyphens with spaces for display
    .replace(/[_-]+/g, ' ')
    // Trim whitespace
    .trim()
    // Capitalize first letter
    .replace(/^\w/, c => c.toUpperCase())
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    || 'Unknown';
}

/**
 * Extract a safe display title from a file path.
 *
 * @param path  Full file path
 */
export function pathToTitle(path: string): string {
  if (!path) return 'Unknown';

  try {
    // Get the last segment (filename)
    const segments = path.split('/');
    const filename = segments[segments.length - 1] ?? '';
    return sanitizeFilename(filename);
  } catch {
    return 'Unknown';
  }
}

/**
 * Check if a string is a valid, playable URL.
 *
 * @param url  URL to validate
 */
export function isValidMediaUrl(url: string): boolean {
  if (!url) return false;

  try {
    if (url.startsWith('blob:') || url.startsWith('data:')) return true;
    if (url.startsWith('file://') || url.startsWith('content://')) return true;

    // For http/https, try parsing as URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url); // Throws if invalid
      return true;
    }

    // Localhost Capacitor URLs
    if (url.startsWith('capacitor://') || url.includes('localhost')) return true;

    return false;
  } catch {
    return false;
  }
}
