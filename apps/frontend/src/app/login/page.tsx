'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ORGS_LIST, USERS } from '@/lib/mock-data';
import { reputationColor } from '@/lib/utils';
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3 shadow-xs">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            <span className="text-blue-600">Threat</span>Trust
          </h1>
          <p className="text-slate-500 mt-1 text-xs">Decentralized Cyber Threat Intelligence</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-7 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Sign In</h2>
          <p className="text-slate-500 text-xs mb-5">Select your organization and authenticate</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Organization
              </label>
              <div className="grid gap-2">
                {displayOrgs.map(o => {
                  const canonicalId = o.id.startsWith('org-') ? o.id : `org-${o.name.toLowerCase()}`;
                  const isSelected = selectedOrg === canonicalId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleOrgChange(canonicalId)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors
                        ${isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{o.name}</p>
                          <p className="text-xs text-slate-500">{ORG_TYPE_LABELS[o.orgType]} · MSP: {o.fabricMspId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${reputationColor(o.reputationScore)}`}>
                          {o.reputationScore}
                        </p>
                        <p className="text-[10px] text-slate-400">rep</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                User Account
              </label>
              <select
                value={selectedUser}
                onChange={e => { setSelectedUser(e.target.value); setError(''); }}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
              </input>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-700 text-xs bg-red-50 border border-red-200 rounded-md p-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-md transition-colors text-sm shadow-xs"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Prototype Credentials */}
        <div className="mt-4 bg-white border border-slate-200 rounded-lg p-3.5">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Prototype Credentials</p>
          {org && (
            <div className="space-y-1">
              {orgUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{u.username}</span>
                  <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-200">
                    {PASSWORDS[u.id]}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          ThreatTrust Consortium · Hyperledger Fabric 2.5
        </p>
      </div>
    </div>
  );
}
