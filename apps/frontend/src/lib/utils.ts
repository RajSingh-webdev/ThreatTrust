// ThreatTrust — Normalization & Utility Functions

/** Remove known tracking query parameters from a URL's search string */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'dclid', 'gbraid', 'wbraid',
  '_ga', '_gl', 'mc_cid', 'mc_eid',
]);

export function normalizeIp(raw: string): string {
  const trimmed = raw.trim();
  // Strip leading zeros per octet for IPv4
  if (trimmed.includes('.') && !trimmed.includes(':')) {
    return trimmed
      .split('.')
      .map(octet => String(parseInt(octet, 10)))
      .join('.');
  }
  // IPv6: lowercase and expand (basic)
  return trimmed.toLowerCase();
}

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    // Lowercase scheme and host
    const scheme = url.protocol.toLowerCase();
    const host = url.hostname.toLowerCase();
    const port = url.port ? `:${url.port}` : '';
    // Normalize path: decode safe percent-encoded chars, no double slashes
    let path = url.pathname.replace(/\/+/g, '/');
    // Remove trailing slash only if path is non-root
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    // Filter tracking params, keep meaningful ones
    const params = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        params.set(key, value);
      }
    });
    const search = params.toString() ? `?${params.toString()}` : '';
    return `${scheme}//${host}${port}${path}${search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, '');
}

export function normalizeHash(raw: string): string {
  const h = raw.trim().toLowerCase();
  // Validate common hash lengths: MD5=32, SHA-1=40, SHA-256=64
  if (/^[0-9a-f]+$/.test(h) && [32, 40, 64].includes(h.length)) {
    return h;
  }
  return h;
}

export function normalizeIoc(type: string, value: string): string {
  switch (type) {
    case 'ip':        return normalizeIp(value);
    case 'url':       return normalizeUrl(value);
    case 'domain':    return normalizeDomain(value);
    case 'file_hash': return normalizeHash(value);
    default:          return value.trim();
  }
}

/** Format an ISO timestamp to a human-readable relative time */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Format an ISO timestamp to locale date + time */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Mask an IoC value for display (partial reveal) */
export function maskIocValue(value: string, type: string): string {
  if (type === 'ip') {
    const parts = value.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }
  if (type === 'file_hash') {
    return `${value.slice(0, 8)}...${value.slice(-8)}`;
  }
  if (type === 'url') {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.hostname}/...`;
    } catch { /* ignore */ }
  }
  if (type === 'domain') {
    const parts = value.split('.');
    if (parts.length > 2) {
      return `***.${parts.slice(-2).join('.')}`;
    }
  }
  return value;
}

/** Short-form display for TX IDs */
export function shortTxId(txId: string): string {
  if (!txId) return '—';
  return `${txId.slice(0, 8)}...${txId.slice(-6)}`;
}

/** Reputation colour based on score */
export function reputationColor(score: number): string {
  if (score >= 70) return 'text-emerald-700';
  if (score >= 50) return 'text-blue-700';
  if (score >= 30) return 'text-amber-700';
  return 'text-red-700';
}

/** TLP colour */
export function tlpColor(tlp: string): string {
  switch (tlp) {
    case 'white': return 'text-slate-800 bg-slate-100 border-slate-300';
    case 'green': return 'text-emerald-800 bg-emerald-50 border-emerald-300';
    case 'amber': return 'text-amber-800 bg-amber-50 border-amber-300';
    case 'red':   return 'text-red-800 bg-red-50 border-red-300';
    default:      return 'text-slate-700 bg-slate-100 border-slate-200';
  }
}

/** IoC type labels */
export const IOC_TYPE_LABELS: Record<string, string> = {
  ip: 'IP Address',
  url: 'URL',
  domain: 'Domain',
  file_hash: 'File Hash',
};

/** Status display config */
export const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending:  { label: 'Pending',  classes: 'text-amber-800 bg-amber-50 border-amber-300' },
  verified: { label: 'Verified', classes: 'text-emerald-800 bg-emerald-50 border-emerald-300' },
  rejected: { label: 'Rejected', classes: 'text-red-800 bg-red-50 border-red-300' },
  flagged:  { label: 'Flagged',  classes: 'text-orange-800 bg-orange-50 border-orange-300' },
};
