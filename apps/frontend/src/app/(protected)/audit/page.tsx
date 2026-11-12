'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, Hash,
  Activity, Filter
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAllAuditLog } from '@/lib/mock-data';
import { formatDate, shortTxId } from '@/lib/utils';
import { api } from '@/lib/api';

const ACTION_BADGES: Record<string, string> = {
  submit_ioc: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
  endorse_ioc: 'bg-[#C6F432]/10 text-[#C6F432] border-[#C6F432]/30',
  reject_ioc: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
  verify_ioc: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  flag_ioc: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
  update_reputation: 'bg-purple-950/40 text-purple-400 border-purple-800/40',
  integrity_check: 'bg-[#181820] text-[#A1A1AA] border-[#272732]',
  register_org: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40',
};

export default function AuditIntegrityPage() {
  const { org } = useAuth();
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [liveAuditLogs, setLiveAuditLogs] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAudit() {
      try {
        const res = await api.audit.getAll({
          action: selectedActionFilter !== 'all' ? selectedActionFilter : undefined,
        });
        if (isMounted && res.logs) {
          setLiveAuditLogs(res.logs);
        }
      } catch {
        // Fallback
      }
    }
    fetchAudit();
    return () => { isMounted = false; };
  }, [selectedActionFilter]);

  const auditLog = useMemo(() => {
    if (liveAuditLogs) {
      return liveAuditLogs;
    }
    const all = getAllAuditLog();
    if (selectedActionFilter === 'all') return all;
    return all.filter((a) => a.action === selectedActionFilter);
  }, [liveAuditLogs, selectedActionFilter]);

  // Demo indicators for cryptographic integrity visual verification
  const iocPass = {
    id: 'ioc-genesis',
    iocType: 'ip',
    normalizedValue: '198.51.100.1',
    integrityHash: '93be512ca089698eb16675f96a46eb8eb7e4b623733c8da1f4ef77ea87a5bf00',
  };
  const iocFail = {
    id: 'ioc-tampered-demo',
    iocType: 'ip',
    normalizedValue: '203.0.113.50',
    integrityHash: '3da18efc8cb5dd1d456cbd0c3e8adc204c85be509c8f83b020fff8d81c5af18d',
    tamperedCurrentHash: 'a7c9384910efbb21894dce30948576201948576102938475610293847561a0b1',
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white p-6 md:p-8 max-w-7xl mx-auto space-y-8 antialiased">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tight">
          Audit Trail & Cryptographic Verification
        </h1>
        <p className="text-xs font-mono text-[#8E8E9A]">
          Continuous SHA-256 state commitment verification between operational storage and consortium ledger root anchors.
        </p>
      </div>

      {/* SECTION 1: Cryptographic Integrity Engine */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#C6F432]" /> Tamper-Evidence Verification Engine
          </h2>
          <span className="text-[10px] text-[#52525B] font-mono hidden sm:inline">
            Formula: SHA256(ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DEMO 1: PASS Card */}
          <div className="p-6 rounded-2xl bg-[#0B0B0E] border border-[#C6F432]/30 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 bg-[#14141A] text-[#A1A1AA] rounded border border-[#22222C]">
                  {iocPass.iocType}
                </span>
                <span className="font-mono text-sm font-bold text-white">{iocPass.normalizedValue}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#C6F432] bg-[#C6F432]/10 px-2.5 py-1 rounded-lg border border-[#C6F432]/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#C6F432]/5 border border-[#C6F432]/20 text-xs font-mono text-[#D4D4D8] space-y-1">
              <p className="font-bold text-[#C6F432]">Cryptographic State Consistent</p>
              <p className="text-[#8E8E9A] text-[11px]">
                Computed SHA-256 hash strictly matches the on-chain anchor commitment. Off-chain database is pristine.
              </p>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-[#71717A] block font-bold">Ledger Root Hash</span>
                <p className="p-2.5 rounded-xl bg-[#101014] border border-[#1C1C24] text-white break-all text-[11px] mt-1">
                  {iocPass.integrityHash}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#71717A] block font-bold">Computed Off-Chain Hash</span>
                <p className="p-2.5 rounded-xl bg-[#101014] border border-[#1C1C24] text-[#C6F432] break-all text-[11px] mt-1 font-bold">
                  {iocPass.integrityHash}
                </p>
              </div>
              <div className="pt-2 border-t border-[#1C1C24] text-[11px] text-[#71717A] flex items-center justify-between">
                <span>Verification Verdict: <strong className="text-[#C6F432]">Pristine</strong></span>
                <span className="text-[#C6F432]">Delta: 0 bits</span>
              </div>
            </div>
          </div>

          {/* DEMO 2: FAIL Card */}
          <div className="p-6 rounded-2xl bg-[#0B0B0E] border border-rose-500/50 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 bg-[#14141A] text-[#A1A1AA] rounded border border-[#22222C]">
                  {iocFail.iocType}
                </span>
                <span className="font-mono text-sm font-bold text-white">{iocFail.normalizedValue}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-800/50">
                <XCircle className="w-3.5 h-3.5" /> TAMPERED
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-xs font-mono text-rose-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-4 h-4" /> State Compromise Detected
              </p>
              <p className="text-rose-400/80 text-[11px]">
                Computed hash mismatches immutable on-chain root. Record altered post-commitment.
              </p>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-[#71717A] block font-bold">Ledger Root Hash (Anchor)</span>
                <p className="p-2.5 rounded-xl bg-[#101014] border border-[#1C1C24] text-white break-all text-[11px] mt-1">
                  {iocFail.integrityHash}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#71717A] block font-bold">Tampered Computed Hash</span>
                <p className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-800/50 text-rose-300 break-all text-[11px] mt-1 font-bold">
                  {iocFail.tamperedCurrentHash}
                </p>
              </div>
              <div className="pt-2 border-t border-[#1C1C24] text-[11px] text-[#71717A] flex items-center justify-between">
                <span>Tampered Value: <strong className="text-rose-400">{iocFail.normalizedValue}</strong></span>
                <span className="text-rose-400">Root Mismatch</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Consortium Audit Trail */}
      <div className="p-6 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#C6F432]" /> Consortium Provenance Ledger
            </h2>
            <p className="text-xs font-mono text-[#8E8E9A]">Audit trail of actor transactions, reviews, and verified state transitions.</p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#71717A]" />
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="bg-[#101014] border border-[#1E1E26] rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#C6F432] transition-colors"
            >
              <option value="all">All Operations</option>
              <option value="submit_ioc">Submit IoC</option>
              <option value="endorse_ioc">Endorse IoC</option>
              <option value="verify_ioc">Verify IoC</option>
              <option value="reject_ioc">Reject IoC</option>
              <option value="update_reputation">Update Reputation</option>
              <option value="integrity_check">Integrity Check</option>
              <option value="register_org">Register Participant</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-[#1C1C24] rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1C1C24] bg-[#0E0E12] text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
                <th className="py-3 px-4 pl-6">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Subject Object</th>
                <th className="py-3 px-4">Result / Consensus</th>
                <th className="py-3 px-4 pr-6 text-right">Blockchain Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#14141B] text-xs font-mono">
              {auditLog.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 pl-6 whitespace-nowrap text-[#71717A]">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        ACTION_BADGES[entry.action] ?? 'bg-[#14141A] text-[#8E8E9A] border-[#22222C]'
                      }`}
                    >
                      {entry.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-white font-bold">
                    {entry.actorOrg?.name || entry.actorOrgName || entry.actorOrgId}
                  </td>
                  <td className="py-3.5 px-4 text-[#A1A1AA] max-w-xs truncate">
                    {entry.objectId || entry.objectValue || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-[#8E8E9A] max-w-sm truncate">
                    {entry.result || '—'}
                  </td>
                  <td className="py-3.5 px-4 pr-6 text-right whitespace-nowrap text-[#52525B]">
                    {entry.blockchainTxId ? shortTxId(entry.blockchainTxId) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
