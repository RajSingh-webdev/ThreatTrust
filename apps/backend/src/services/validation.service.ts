import { isIP } from "net";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedSubtype?: string;
}

export class ValidationService {
  /**
   * Validate IPv4 or IPv6 format.
   */
  public static validateIp(value: string): ValidationResult {
    const trimmed = value.trim();
    const version = isIP(trimmed);

    if (version === 4) {
      // Check each octet strictly in 0..255 range
      const octets = trimmed.split(".");
      const allValid = octets.every((o) => {
        const num = parseInt(o, 10);
        return !isNaN(num) && num >= 0 && num <= 255;
      });

      if (!allValid) {
        return { isValid: false, error: "IPv4 octets must be integers between 0 and 255." };
      }
      return { isValid: true, detectedSubtype: "IPv4" };
    }

    if (version === 6) {
      return { isValid: true, detectedSubtype: "IPv6" };
    }

    return {
      isValid: false,
      error: `Invalid IP address format: "${trimmed}". Must be a valid IPv4 or IPv6 address.`,
    };
  }

  /**
   * Validate URL format.
   */
  public static validateUrl(value: string): ValidationResult {
    const trimmed = value.trim();
    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return {
          isValid: false,
          error: `Unsupported URL protocol: "${parsed.protocol}". Only HTTP and HTTPS indicators are supported.`,
        };
      }
      if (!parsed.hostname || parsed.hostname.length < 3) {
        return { isValid: false, error: "URL must contain a valid hostname." };
      }
      return { isValid: true, detectedSubtype: parsed.protocol.replace(":", "") };
    } catch {
      return {
        isValid: false,
        error: `Malformed URL: "${trimmed}". Must be a valid standard URL with scheme (e.g. https://domain.com/path).`,
      };
    }
  }

  /**
   * Validate Domain name format.
   */
  public static validateDomain(value: string): ValidationResult {
    let trimmed = value.trim().toLowerCase();
    if (trimmed.endsWith(".")) {
      trimmed = trimmed.slice(0, -1);
    }

    // Support standard domains and .onion / .i2p threat indicators
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9-]{2,63}$/;

    if (!domainRegex.test(trimmed) || trimmed.length > 253) {
      return {
        isValid: false,
        error: `Invalid domain format: "${value}". Must be a valid FQDN (e.g. c2-server.ru or evil.onion).`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate File Hash (MD5, SHA-1, SHA-256).
   */
  public static validateFileHash(value: string): ValidationResult {
    const trimmed = value.trim().toLowerCase();
    const isHex = /^[0-9a-f]+$/.test(trimmed);

    if (!isHex) {
      return {
        isValid: false,
        error: `Invalid hash format: "${value}". Hash must only contain hexadecimal characters (0-9, a-f).`,
      };
    }

    if (trimmed.length === 32) {
      return { isValid: true, detectedSubtype: "MD5" };
    }
    if (trimmed.length === 40) {
      return { isValid: true, detectedSubtype: "SHA-1" };
    }
    if (trimmed.length === 64) {
      return { isValid: true, detectedSubtype: "SHA-256" };
    }

    return {
      isValid: false,
      error: `Invalid hash length (${trimmed.length} chars). File hashes must be MD5 (32 chars), SHA-1 (40 chars), or SHA-256 (64 chars).`,
    };
  }

  /**
   * Master validator dispatcher.
   */
  public static validate(type: string, value: string): ValidationResult {
    switch (type) {
      case "ip":
        return this.validateIp(value);
      case "url":
        return this.validateUrl(value);
      case "domain":
        return this.validateDomain(value);
      case "file_hash":
        return this.validateFileHash(value);
      default:
        return {
          isValid: false,
          error: `Unknown IoC type: "${type}". Supported types are ip, url, domain, file_hash.`,
        };
    }
  }
}
