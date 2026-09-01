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
import { reputationColor } from '@/lib/utils';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/threats',   label: 'Threat Feed',      icon: Radio },
  { href: '/submit',    label: 'Submit IoC',        icon: Send },
  { href: '/endorse',   label: 'Endorse',           icon: CheckSquare },
  { href: '/reputation',label: 'Reputation',        icon: TrendingUp },
  { href: '/audit',     label: 'Audit / Integrity', icon: ClipboardList },
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
    <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-white font-bold text-lg leading-none">ThreatTrust</span>
          <p className="text-gray-500 text-[10px] mt-0.5 uppercase tracking-widest">Decentralized CTI</p>
        </div>
      </div>

      {/* Current Org Badge */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Active Organization</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">{org.name}</p>
              <p className="text-gray-500 text-xs">{ORG_TYPE_LABELS[org.orgType] ?? org.orgType}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-base leading-none ${reputationColor(displayScore)}`}>
                {displayScore}
              </p>
              <p className="text-gray-600 text-[10px] mt-0.5">reputation</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs text-gray-300 font-medium">{user.username}</span>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-blue-400 capitalize font-medium">{user.role}</span>
          </div>
        </div>

        {/* Org & Role Switcher */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setSwitchOpen(!switchOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors"
          >
            <span>Switch org / role</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${switchOpen ? 'rotate-180' : ''}`} />
          </button>
          {switchOpen && (
            <div className="mt-2 bg-gray-950/70 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-850 max-h-52 overflow-y-auto">
              {currentOrgsList.map((o) => {
                const canonicalOrgKey = o.id.startsWith('org-') ? o.id : `org-${o.name.toLowerCase()}`;
                const orgUsers = Object.values(USERS).filter((u) => u.organizationId === canonicalOrgKey);
                const isCurrentOrg = o.id === org.id || o.name === org.name;

                return (
                  <div key={o.id} className="p-2 space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-white">{o.name}</span>
                      <span className={`text-[11px] font-bold ${reputationColor(o.reputationScore)}`}>
                        {o.reputationScore} rep
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {orgUsers.map((u) => {
                        const isCurrent = isCurrentOrg && user.username === u.username;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSwitchAccount(canonicalOrgKey, u.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              isCurrent
                                ? 'bg-blue-600/25 text-blue-300 font-semibold border border-blue-500/40'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            <span>{u.username}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700/60">
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

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] text-gray-600 uppercase tracking-widest">Navigation</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-blue-600/15 text-blue-300 border border-blue-600/25'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-400' : ''}`} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <div className="px-3 py-2 rounded-lg bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-300 font-medium">Hyperledger Fabric 2.5</span>
          </div>
          <p className="text-[10px] text-gray-500">Consortium Channel: cti-channel</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
