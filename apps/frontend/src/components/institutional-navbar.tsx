'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ChevronDown, LogOut, Check,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ORGS_LIST, USERS } from '@/lib/mock-data';
import { api } from '@/lib/api';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Console' },
  { href: '/threats', label: 'Intelligence' },
  { href: '/submit', label: 'Propose' },
  { href: '/endorse', label: 'Endorsement' },
  { href: '/reputation', label: 'Reputation' },
  { href: '/audit', label: 'Ledger Audit' },
];

export default function InstitutionalNavbar() {
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

  if (!org || !user) return null;

  const currentOrgsList = liveOrgs || ORGS_LIST;
  const currentOrgInList = currentOrgsList.find((o) => o.id === org.id || o.name === org.name);
  const displayScore = currentOrgInList?.reputationScore ?? org.reputationScore;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  async function handleSwitch(orgId: string, userId: string) {
    await switchOrg(orgId, userId);
    setSwitchOpen(false);
  }

  // Get matching organization identifier
  const orgNameLower = (org.name || '').toLowerCase();
  const orgKey = org.id.startsWith('org-') ? org.id : `org-${orgNameLower}`;

  // Users belonging to this active organization
  const orgUsers = Object.values(USERS).filter(
    (u) => u.organizationId === org.id || u.organizationId === orgKey || (orgNameLower && u.organizationId.includes(orgNameLower))
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-3.5 bg-[#070708]/90 backdrop-blur-md border-b border-[#141418]">
      {/* Brand Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-[#101014] border border-[#22222A] group-hover:border-[#C6F432] flex items-center justify-center transition-colors">
          <Shield className="w-4 h-4 text-[#C6F432]" />
        </div>
        <span className="font-mono font-bold tracking-tight text-white text-base">
          THREAT<span className="text-[#C6F432]">TRUST</span>
        </span>
      </Link>

      {/* Center Floating Pill Menu */}
      <nav className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0D0D10] border border-[#1A1A22] text-xs font-mono shadow-xl">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[#070708] font-bold shadow-sm'
                  : 'text-[#8E8E9A] hover:text-white'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right Peer Identity Pill & Switcher */}
      <div className="relative">
        <div className="flex items-center gap-2.5">
          {/* Node & Role Trigger Button */}
          <button
            onClick={() => setSwitchOpen(!switchOpen)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0D0D10] border border-[#1C1C24] hover:border-[#2E2E3A] text-xs font-mono transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-[#C6F432]" />
            <span className="text-white font-bold">{org.name}</span>
            <span className="text-[#3A3A45]">/</span>
            <span className="text-[#C6F432] capitalize font-medium">{user.role || 'Member'}</span>
            <span className="text-[#3A3A45]">|</span>
            <span className="text-white font-bold">{displayScore} REP</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" />
          </button>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-full bg-[#0D0D10] border border-[#1C1C24] text-[#71717A] hover:text-rose-400 hover:border-rose-900 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal/Dropdown to Switch Peer Node & Role */}
        <AnimatePresence>
          {switchOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              className="absolute right-0 top-12 w-96 rounded-2xl bg-[#0D0D10] border border-[#1C1C24] p-4 shadow-2xl z-50 font-mono space-y-4"
            >
              {/* SECTION A: SWITCH ROLE WITHIN CURRENT NODE */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-[#71717A] font-bold flex items-center justify-between">
                  <span>Switch Role in {org.name}</span>
                  <span className="text-[#C6F432]">ACTIVE NODE</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {orgUsers.map((u) => {
                    const isCurrentUser = u.id === user.id || u.username === user.username;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSwitch(org.id, u.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isCurrentUser
                            ? 'border-[#C6F432] bg-[#C6F432]/10 text-white font-bold'
                            : 'border-[#1C1C24] bg-[#121216] hover:border-[#2C2C36] text-[#A1A1AA]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs capitalize">{u.role}</span>
                          {isCurrentUser && <Check className="w-3.5 h-3.5 text-[#C6F432]" />}
                        </div>
                        <span className="text-[10px] text-[#52525B] block mt-0.5">{u.username}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION B: SWITCH PEER NODE */}
              <div className="pt-3 border-t border-[#1C1C24] space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-[#71717A] font-bold flex items-center justify-between">
                  <span>Switch Peer Institution</span>
                  <span>Trust Score</span>
                </div>

                <div className="space-y-1.5">
                  {currentOrgsList.map((o) => {
                    const isCurrent = o.id === org.id || o.name === org.name;
                    const defaultUser = Object.values(USERS).find(
                      (u) => u.organizationId === o.id || u.organizationId.includes(o.name.toLowerCase())
                    ) || Object.values(USERS)[0];
                    return (
                      <button
                        key={o.id}
                        onClick={() => handleSwitch(o.id, defaultUser.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isCurrent
                            ? 'border-[#C6F432] bg-[#C6F432]/5 text-white'
                            : 'border-[#181820] bg-[#101014] hover:bg-white/[0.03] text-[#A1A1AA]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-[#C6F432]' : 'bg-[#3A3A45]'}`} />
                            <span className="text-xs font-bold text-white">{o.name}</span>
                          </div>
                          <span className="text-[10px] text-[#52525B]">{o.fabricMspId}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-[#C6F432]">{o.reputationScore}</span>
                          <span className="text-[9px] text-[#52525B] block">REP</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
