'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield, LayoutDashboard, Radio, Send, CheckSquare,
  TrendingUp, ClipboardList, LogOut, ChevronDown, Building2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ORGS_LIST, USERS } from '@/lib/mock-data';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/threats',   label: 'Threat Feed',      icon: Radio },
  { href: '/submit',    label: 'Submit IoC',        icon: Send },
  { href: '/endorse',   label: 'Endorse Queue',     icon: CheckSquare },
  { href: '/reputation',label: 'Reputation',        icon: TrendingUp },
  { href: '/audit',     label: 'Audit & Ledger',    icon: ClipboardList },
];

const ORG_TYPE_LABELS: Record<string, string> = {
  bank: 'Bank',
  cert: 'CERT / CSIRT',
  enterprise_soc: 'Enterprise SOC',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { org, user, logout, switchOrg } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [liveOrgs, setLiveOrgs] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.orgs.getAll().then((res) => {
      if (isMounted && res.organizations && res.organizations.length > 0) {
        setLiveOrgs(res.organizations);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [org]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  async function handleSwitchAccount(orgId: string, userId: string) {
    await switchOrg(orgId, userId);
    setSwitchOpen(false);
  }

  if (!org || !user) return null;

  const currentOrgsList = liveOrgs || ORGS_LIST;
  const currentOrgInList = currentOrgsList.find((o) => o.id === org.id || o.name === org.name);
  const displayScore = currentOrgInList?.reputationScore ?? org.reputationScore;

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-[#0A0A0D] border-r border-[#1C1C22] flex flex-col z-40 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#18181E]">
        <div className="w-8 h-8 bg-[#C6F432] rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-[#C6F432]/10">
          <Shield className="w-4 h-4 text-[#070708]" />
        </div>
        <div>
          <span className="text-white font-bold text-base tracking-tight leading-none">ThreatTrust</span>
          <p className="text-[#71717A] text-[10px] mt-0.5 uppercase tracking-wider font-mono">Consortium CTI</p>
        </div>
      </div>

      {/* Active Organization Card */}
      <div className="px-4 py-4 border-b border-[#18181E] bg-[#0E0E12]/50">
        <div className="bg-[#121217] border border-[#1E1E26] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#71717A] tracking-wider">Active Peer</span>
            <span className="text-xs font-mono font-bold text-[#C6F432]">
              {displayScore} <span className="text-[10px] font-normal text-[#71717A]">rep</span>
            </span>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">{org.name}</p>
            <p className="text-[#8E8E9A] text-xs">{ORG_TYPE_LABELS[org.orgType] ?? org.orgType}</p>
          </div>
          <div className="pt-2 border-t border-[#1C1C24] flex items-center justify-between text-xs font-mono">
            <span className="text-white font-medium">{user.username}</span>
            <span className="text-[10px] uppercase font-bold text-[#C6F432] bg-[#C6F432]/10 px-2 py-0.5 rounded border border-[#C6F432]/20">
              {user.role}
            </span>
          </div>
        </div>

        {/* Switch Account Button */}
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setSwitchOpen(!switchOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-[#A1A1AA] hover:text-white hover:bg-[#15151B] rounded-lg border border-[#1E1E26] bg-[#101014] transition-colors"
          >
            <span>Switch Peer Node</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${switchOpen ? 'rotate-180' : ''}`} />
          </button>

          {switchOpen && (
            <div className="mt-2 bg-[#121216] border border-[#24242E] rounded-xl overflow-hidden divide-y divide-[#1A1A22] max-h-56 overflow-y-auto shadow-2xl">
              {currentOrgsList.map((o) => {
                const canonicalOrgKey = o.id.startsWith('org-') ? o.id : `org-${o.name.toLowerCase()}`;
                const orgUsers = Object.values(USERS).filter((u) => u.organizationId === canonicalOrgKey);
                const isCurrentOrg = o.id === org.id || o.name === org.name;

                return (
                  <div key={o.id} className="p-2.5 space-y-1.5 bg-[#121216]">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-white">{o.name}</span>
                      <span className="text-[11px] font-mono font-bold text-[#C6F432]">
                        {o.reputationScore} rep
                      </span>
                    </div>
                    <div className="space-y-1">
                      {orgUsers.map((u) => {
                        const isCurrent = isCurrentOrg && user.username === u.username;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSwitchAccount(canonicalOrgKey, u.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                              isCurrent
                                ? 'bg-[#C6F432] text-[#070708] font-bold'
                                : 'text-[#8E8E9A] hover:text-white hover:bg-[#181820]'
                            }`}
                          >
                            <span>{u.username}</span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded opacity-75">
                              {u.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] text-[#71717A] uppercase tracking-wider font-mono">Consortium Console</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-[#15151C] text-white font-bold border border-[#242430]'
                      : 'text-[#8E8E9A] hover:text-white hover:bg-[#111115]'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#C6F432]' : 'text-[#5A5A65]'}`} />
                  <span>{label}</span>
                  {active && (
                    <span className="ml-auto w-1 h-3 rounded-full bg-[#C6F432]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="px-4 py-4 border-t border-[#18181E] bg-[#0A0A0D] space-y-2">
        <div className="px-3.5 py-2.5 rounded-xl bg-[#0F0F13] border border-[#1A1A22] text-xs">
          <p className="font-mono text-[11px] font-bold text-white">cti-channel</p>
          <p className="text-[10px] font-mono text-[#71717A] mt-0.5">Raft Quorum Active</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-[#8E8E9A] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
