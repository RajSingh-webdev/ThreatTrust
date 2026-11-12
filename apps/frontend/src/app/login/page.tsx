'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ORGS_LIST, USERS } from '@/lib/mock-data';
import { api } from '@/lib/api';

const ORG_TYPE_LABELS: Record<string, string> = {
  bank: 'Bank Node',
  cert: 'CERT / National CSIRT',
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
      const authRes = await api.auth.login(username, password);
      login(selectedOrg, selectedUser, authRes.token);
      router.push('/dashboard');
    } catch {
      const expectedPass = PASSWORDS[selectedUser];
      if (password !== expectedPass) {
        setError('Authentication failed. Check credentials for this node.');
        setLoading(false);
        return;
      }
      login(selectedOrg, selectedUser);
      router.push('/dashboard');
    }
  }

  const org = ORGS_LIST.find(o => o.id === selectedOrg);

  return (
    <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center p-6 antialiased relative overflow-hidden">
      {/* Background architectural grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C6F432]/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#101014] border border-[#1E1E26] shadow-xl">
            <Shield className="w-6 h-6 text-[#C6F432]" />
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-white">
            THREAT<span className="text-[#C6F432]">TRUST</span>
          </h1>
          <p className="text-xs font-mono text-[#8E8E9A]">Decentralized Threat Intelligence Exchange</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0B0B0E] border border-[#1C1C24] rounded-2xl p-7 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">Node Authentication</h2>
            <p className="text-xs font-mono text-[#8E8E9A]">Select consortium participant identity to initialize session.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold block">
                Consortium Participant
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
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all font-mono
                        ${isSelected
                          ? 'border-[#C6F432] bg-[#C6F432]/5 ring-1 ring-[#C6F432]/20'
                          : 'border-[#1E1E26] bg-[#101014] hover:border-[#2C2C36]'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#C6F432]' : 'bg-[#2E2E38]'}`} />
                        <div>
                          <p className="text-xs font-bold text-white">{o.name}</p>
                          <p className="text-[10px] text-[#71717A]">{ORG_TYPE_LABELS[o.orgType] || o.orgType} · MSP: {o.fabricMspId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#C6F432]">{o.reputationScore}</span>
                        <span className="text-[9px] text-[#71717A] block">REP</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold block">
                Analyst Identity
              </label>
              <select
                value={selectedUser}
                onChange={e => { setSelectedUser(e.target.value); setError(''); }}
                className="w-full bg-[#101014] border border-[#1E1E26] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#C6F432] transition-colors"
              >
                {orgUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold block">
                Session Secret
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full bg-[#101014] border border-[#1E1E26] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-[#454550] focus:outline-none focus:border-[#C6F432] transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 bg-[#C6F432] hover:bg-[#b2e026] disabled:opacity-30 disabled:cursor-not-allowed text-[#070708] font-mono font-bold py-3 rounded-xl transition-all text-xs shadow-lg shadow-[#C6F432]/10"
            >
              {loading ? 'Authenticating...' : 'Connect to Ledger'}
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </form>
        </div>

        {/* Prototype Credentials Reference */}
        <div className="bg-[#0B0B0E] border border-[#1C1C24] rounded-xl p-4 space-y-2">
          <p className="text-[10px] text-[#71717A] uppercase tracking-wider font-mono font-bold">Node Quick Credentials</p>
          {org && (
            <div className="space-y-1.5">
              {orgUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">{u.username}</span>
                  <code className="text-[#C6F432] bg-[#121218] px-2 py-0.5 rounded text-[11px] border border-[#1E1E26]">
                    {PASSWORDS[u.id]}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] font-mono text-[#52525B]">
          ThreatTrust Consortium Node · Decentralized Trust Layer
        </p>
      </div>
    </div>
  );
}
