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
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
        <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-slate-900 font-bold text-base leading-none">ThreatTrust</span>
          <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Decentralized CTI</p>
        </div>
      </div>

      {/* Current Org Badge */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Active Org</span>
            </div>
            <span className={`text-xs font-bold ${reputationColor(displayScore)}`}>
              {displayScore} <span className="text-[10px] font-normal text-slate-500">rep</span>
            </span>
          </div>
          <div>
            <p className="text-slate-900 font-semibold text-sm">{org.name}</p>
            <p className="text-slate-500 text-xs">{ORG_TYPE_LABELS[org.orgType] ?? org.orgType}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">{user.username}</span>
            <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              {user.role}
            </span>
          </div>
        </div>

        {/* Org & Role Switcher */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setSwitchOpen(!switchOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 bg-white transition-colors"
          >
            <span>Switch org / role</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${switchOpen ? 'rotate-180' : ''}`} />
          </button>
          {switchOpen && (
            <div className="mt-2 bg-white border border-slate-200 rounded-md overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto shadow-sm">
              {currentOrgsList.map((o) => {
                const canonicalOrgKey = o.id.startsWith('org-') ? o.id : `org-${o.name.toLowerCase()}`;
                const orgUsers = Object.values(USERS).filter((u) => u.organizationId === canonicalOrgKey);
                const isCurrentOrg = o.id === org.id || o.name === org.name;

                return (
                  <div key={o.id} className="p-2 space-y-1 bg-white">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-slate-900">{o.name}</span>
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
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                              isCurrent
                                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{u.username}</span>
                            <span className="text-[10px] uppercase font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
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
        <p className="px-3 mb-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Navigation</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${active
                      ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-200 bg-slate-50/60 space-y-1">
        <div className="px-3 py-2 rounded-md bg-white border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs text-slate-700 font-medium">Hyperledger Fabric 2.5</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Consortium Channel: cti-channel</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
