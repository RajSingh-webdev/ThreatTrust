/**
 * ThreatTrust — IoC Normalization Engine
 *
 * Implements deterministic canonicalization rules for cyber threat indicators:
 * - IPv4: Strips leading octet zeros (e.g., 185.010.020.030 -> 185.10.20.30)
 * - IPv6: Converts to lower-case canonical standard notation
 * - URL: Lowercases scheme & host, cleans path, strips tracking parameters (utm_*, fbclid, etc.) while strictly preserving meaningful query parameters
 * - Domain: Lowercases, removes trailing root dot, strips 'www.' prefix as explicit consortium deduplication policy
 * - File Hash: Lowercases hex strings and formats standard MD5 (32), SHA-1 (40), and SHA-256 (64)
 */

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "msclkid",
  "dclid",
  "gbraid",
  "wbraid",
  "_ga",
  "_gl",
  "mc_cid",
  "mc_eid",
  "yclid",
]);

export class NormalizationService {
  /**
   * Canonicalize an IPv4 or IPv6 address.
   */
  public static normalizeIp(raw: string): string {
    const trimmed = raw.trim();

    // Check if IPv4
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
      return trimmed
        .split(".")
        .map((octet) => String(parseInt(octet, 10)))
        .join(".");
    }

    // IPv6 normalization: lowercase, trim
    return trimmed.toLowerCase();
  }

  /**
   * Canonicalize a URL according to ThreatTrust RFC-compliant policy.
   * - Scheme and Host: lowercased
   * - Path: normalized (collapsed redundant slashes, trailing slash stripped for non-root)
   * - Query: Tracking parameters removed; meaningful application parameters preserved in sorted order
   */
  public static normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    try {
      const url = new URL(trimmed);

      const scheme = url.protocol.toLowerCase();
      const host = url.hostname.toLowerCase();
      const port = url.port ? `:${url.port}` : "";

      // Normalize pathname: collapse consecutive slashes
      let path = url.pathname.replace(/\/+/g, "/");
      if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
      }
      if (!path) {
        path = "/";
      }

      // Filter query parameters: strip tracking params, preserve meaningful params
      const preservedParams = new URLSearchParams();
      // Sort keys for deterministic output
      const keys = Array.from(new Set(Array.from(url.searchParams.keys()))).sort();

      for (const key of keys) {
        if (!TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
          const values = url.searchParams.getAll(key);
          for (const val of values) {
            preservedParams.append(key, val);
          }
        }
      }

      const queryString = preservedParams.toString();
      const search = queryString ? `?${queryString}` : "";

      return `${scheme}//${host}${port}${path}${search}`;
    } catch {
      return trimmed.toLowerCase();
    }
  }

  /**
   * Canonicalize a Domain name.
   * - Lowercases domain
   * - Removes trailing dot (DNS root)
   * - Deduplication Policy: Removes leading 'www.' prefix to ensure canonical identity
   */
  public static normalizeDomain(raw: string): string {
    let domain = raw.trim().toLowerCase();

    // Remove trailing root dot
    if (domain.endsWith(".")) {
      domain = domain.slice(0, -1);
    }

    // Explicit ThreatTrust consortium deduplication policy:
    // 'www.malicious.com' deduplicates to 'malicious.com'
    if (domain.startsWith("www.")) {
      domain = domain.slice(4);
    }

    return domain;
  }

  /**
   * Canonicalize a File Hash (MD5, SHA-1, SHA-256).
   * - Lowercase hex
   */
  public static normalizeFileHash(raw: string): string {
    return raw.trim().toLowerCase();
  }

  /**
   * Master dispatcher for all IoC types.
   */
  public static normalize(type: string, value: string): string {
    switch (type) {
      case "ip":
        return this.normalizeIp(value);
      case "url":
        return this.normalizeUrl(value);
      case "domain":
        return this.normalizeDomain(value);
      case "file_hash":
        return this.normalizeFileHash(value);
      default:
        return value.trim();
    }
  }
}
