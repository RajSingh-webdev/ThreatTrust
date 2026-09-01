'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ORGS_LIST, USERS } from '@/lib/mock-data';

import { api } from '@/lib/api';

const ORG_TYPE_LABELS: Record<string, string> = {
  bank: 'Bank',
  cert: 'CERT / CSIRT',
  enterprise_soc: 'Enterprise SOC',
};

const PASSWORDS: Record<string, string> = {
  'user-banka-admin':    'banka_admin_pass',
  'user-banka-analyst':  'banka_analyst_pass',
  'user-bankb-analyst':  'bankb_analyst_pass',
  'user-bankb-reviewer': 'bankb_reviewer_pass',
  'user-certc-analyst':  'certc_analyst_pass',
  'user-certc-reviewer': 'certc_reviewer_pass',
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedOrg, setSelectedOrg] = useState('org-banka');
  const [selectedUser, setSelectedUser] = useState('user-banka-admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveOrgs, setLiveOrgs] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.orgs.getAll().then((res) => {
      if (isMounted && res.organizations) {
        setLiveOrgs(res.organizations);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const displayOrgs = liveOrgs || ORGS_LIST;
  const orgUsers = Object.values(USERS).filter(u => u.organizationId === selectedOrg);

  function handleOrgChange(orgId: string) {
    setSelectedOrg(orgId);
    const firstUser = Object.values(USERS).find(u => u.organizationId === orgId);
    if (firstUser) setSelectedUser(firstUser.id);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const currentUserObj = USERS[selectedUser];
    const username = currentUserObj?.username || selectedUser;

    try {
      // Attempt authentication against backend API
      const authRes = await api.auth.login(username, password);
      login(selectedOrg, selectedUser, authRes.token);
      router.push('/dashboard');
    } catch {
      // Fallback to prototype password validation
      const expectedPass = PASSWORDS[selectedUser];
      if (password !== expectedPass) {
        setError('Incorrect password. Check the credentials shown below.');
        setLoading(false);
        return;
      }
      login(selectedOrg, selectedUser);
      router.push('/dashboard');
    }
  }

  const org = ORGS_LIST.find(o => o.id === selectedOrg);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            <span className="text-blue-400">Threat</span>Trust
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Decentralized Cyber Threat Intelligence</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Sign in to ThreatTrust</h2>
          <p className="text-gray-500 text-sm mb-6">Select your organization and authenticate</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organization Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Organization
              </label>
              <div className="grid gap-2">
                {displayOrgs.map(o => {
                  const canonicalId = o.id.startsWith('org-') ? o.id : `org-${o.name.toLowerCase()}`;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleOrgChange(canonicalId)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all
                        ${selectedOrg === canonicalId
                          ? 'border-blue-500 bg-blue-600/10 ring-1 ring-blue-500/50'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${selectedOrg === canonicalId ? 'bg-blue-400' : 'bg-gray-600'}`} />
                        <div>
                          <p className="text-sm font-medium text-white">{o.name}</p>
                          <p className="text-xs text-gray-500">{ORG_TYPE_LABELS[o.orgType]} · MSP: {o.fabricMspId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${o.reputationScore >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {o.reputationScore}
                        </p>
                        <p className="text-[10px] text-gray-600">rep</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                User Account
              </label>
              <select
                value={selectedUser}
                onChange={e => { setSelectedUser(e.target.value); setError(''); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {orgUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Prototype Credentials */}
        <div className="mt-4 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium mb-2">Prototype Credentials</p>
          {org && (
            <div className="space-y-1">
              {orgUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{u.username}</span>
                  <code className="text-xs text-gray-500 font-mono">{PASSWORDS[u.id]}</code>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          ThreatTrust Consortium · Hyperledger Fabric 2.5
        </p>
      </div>
    </div>
  );
}
