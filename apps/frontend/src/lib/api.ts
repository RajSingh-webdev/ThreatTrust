/**
 * ThreatTrust — Frontend API Client
 *
 * Connects frontend UI components to the Express backend (/api/v1).
 * Supports automatic JWT token attachment and graceful offline fallback.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/v1';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('threattrust_auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.token) {
        return { Authorization: `Bearer ${parsed.token}` };
      }
    }
  } catch {
    // ignore
  }
  return {};
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options?.headers || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      return request<{
        token: string;
        user: { id: string; username: string; role: string; organizationId: string };
        organization: { id: string; name: string; orgType: string; reputationScore: number; fabricMspId: string };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    },
    me: async () => {
      return request<{ user: any; organization: any }>('/auth/me');
    },
  },

  orgs: {
    getAll: async () => {
      return request<{ organizations: any[]; total: number }>('/orgs');
    },
    getById: async (id: string) => {
      return request<{ organization: any }>(`/orgs/${id}`);
    },
    getReputation: async (id: string) => {
      return request<{
        organizationId: string;
        name: string;
        reputationScore: number;
        initialScore: number;
        netDelta: number;
        isRestricted: boolean;
        restrictionThreshold: number;
        status: string;
      }>(`/orgs/${id}/reputation`);
    },
    getReputationEvents: async (id: string) => {
      return request<{ organizationId: string; events: any[]; total: number }>(`/orgs/${id}/reputation/events`);
    },
  },

  iocs: {
    getAll: async (params?: { status?: string; iocType?: string; contributorOrgId?: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params?.iocType && params.iocType !== 'all') searchParams.set('iocType', params.iocType);
      if (params?.contributorOrgId && params.contributorOrgId !== 'all') searchParams.set('contributorOrgId', params.contributorOrgId);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.limit) searchParams.set('limit', String(params.limit));

      const q = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request<{ iocs: any[]; total: number }>(`/iocs${q}`);
    },
    getById: async (id: string) => {
      return request<{ ioc: any }>(`/iocs/${id}`);
    },
    submit: async (data: { iocType: string; value: string; tlpLevel?: string; description?: string; evidenceReference?: string }) => {
      return request<{ status: string; ioc: any; message?: string }>('/iocs/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    endorse: async (id: string, data: { decision: string; reason?: string }) => {
      return request<{ status: string; endorsement: any; ioc: any }>(`/iocs/${id}/endorse`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    verifyIntegrity: async (id: string, overrideHash?: string) => {
      const q = overrideHash ? `?overrideHash=${encodeURIComponent(overrideHash)}` : '';
      return request<{ verification: any }>(`/iocs/${id}/verify-integrity${q}`);
    },
  },

  audit: {
    getAll: async (params?: { action?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.action && params.action !== 'all') searchParams.set('action', params.action);
      if (params?.limit) searchParams.set('limit', String(params.limit));

      const q = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request<{ logs: any[]; total: number }>(`/audit${q}`);
    },
  },
};
