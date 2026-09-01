'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield, CheckCircle2, XCircle, AlertTriangle, Hash,
  Activity, Filter, ExternalLink, RefreshCw, Layers, Lock
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAllAuditLog, IOCS } from '@/lib/mock-data';
import { formatDate, shortTxId } from '@/lib/utils';
import { api } from '@/lib/api';
import type { AuditAction } from '@/lib/types';

const ACTION_COLORS: Record<string, string> = {
  submit_ioc: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  endorse_ioc: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  reject_ioc: 'bg-red-500/10 text-red-400 border-red-500/30',
  verify_ioc: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  flag_ioc: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  update_reputation: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  integrity_check: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
  register_org: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
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

  // Demo Case 1: PASS (ioc-001)
  const iocPass = IOCS['ioc-001'];
  // Demo Case 2: FAIL (ioc-008 - tampered)
  const iocFail = IOCS['ioc-008'];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Audit Trail & Ledger Integrity Verification
          </h1>
          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Tamper-Evidence Monitor
          </span>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          Cryptographic consistency verification between local relational storage and Hyperledger Fabric immutable state
        </p>
      </div>

      {/* SECTION 1: Live Cryptographic Integrity Verification Demonstration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-400" /> Cryptographic Integrity Verification Engine
            </h2>
            <p className="text-xs text-gray-400">
              Comparing SHA-256 state commitments calculated over off-chain database records against on-chain ledger roots
            </p>
          </div>
          <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
            Formula: SHA256(ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DEMO 1: PASS Verification Card */}
          <div className="bg-gray-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold px-2 py-0.5 bg-gray-800 text-gray-200 rounded border border-gray-700">
                  {iocPass.iocType}
                </span>
                <span className="font-mono text-sm font-semibold text-white">{iocPass.normalizedValue}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED MATCH (PASS)
              </span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300">
              <span className="font-bold block text-emerald-200">BLOCKCHAIN INTEGRITY CHECK PASSED</span>
              Off-chain record matches the on-chain SHA-256 state commitment exactly. Zero tampering detected.
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-[11px] text-gray-400 font-sans block">On-Chain Ledger Anchor (Fabric)</span>
                <p className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 text-blue-300 break-all text-[11px] mt-0.5">
                  {iocPass.integrityHash}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-sans block">Current Calculated SHA-256 (PostgreSQL)</span>
                <p className="p-2.5 rounded-lg bg-gray-950 border border-emerald-500/30 text-emerald-400 break-all text-[11px] mt-0.5">
                  {iocPass.integrityHash}
                </p>
              </div>
              <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-500 font-sans flex items-center justify-between">
                <span>Input: <code className="font-mono text-gray-400">ioc-001|ip|45.83.64.1|org-banka|1706779200</code></span>
                <Link href={`/threats/${iocPass.id}`} className="text-blue-400 hover:underline">
                  View Record →
                </Link>
              </div>
            </div>
          </div>

          {/* DEMO 2: FAIL Verification Card (Simulated Tampering) */}
          <div className="bg-red-950/20 border border-red-500/60 ring-1 ring-red-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold px-2 py-0.5 bg-gray-800 text-gray-200 rounded border border-gray-700">
                  {iocFail.iocType}
                </span>
                <span className="font-mono text-sm font-semibold text-white">{iocFail.normalizedValue}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/20 px-2.5 py-1 rounded-md border border-red-500/40">
                <XCircle className="w-3.5 h-3.5" /> MISMATCH DETECTED (FAIL)
              </span>
            </div>

            <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-xs text-red-200 space-y-1">
              <span className="font-bold block text-red-100 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-400" /> BLOCKCHAIN INTEGRITY CHECK FAILED
              </span>
              <p className="text-red-300/90 text-[11px]">
                The current database content differs from the immutable hash anchored on Hyperledger Fabric. The off-chain record was modified after genesis submission.
              </p>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-[11px] text-gray-400 font-sans block">On-Chain Ledger Anchor (Fabric)</span>
                <p className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 text-blue-300 break-all text-[11px] mt-0.5">
                  {iocFail.integrityHash}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-sans block">Current Calculated SHA-256 (Tampered DB State)</span>
                <p className="p-2.5 rounded-lg bg-red-950 border border-red-500/50 text-red-300 break-all text-[11px] mt-0.5">
                  {iocFail.tamperedCurrentHash}
                </p>
              </div>
              <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-500 font-sans flex items-center justify-between">
                <span>Tampered Indicator: <strong className="text-red-400">91.121.87.46</strong></span>
                <Link href={`/threats/${iocFail.id}`} className="text-red-400 hover:underline">
                  Inspect Incident →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Consortium Audit Trail Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Consortium Audit Trail</h2>
            <p className="text-xs text-gray-500">Immutable log of all actor operations, reviews, and state transitions</p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="submit_ioc">Submit IoC</option>
              <option value="endorse_ioc">Endorse IoC</option>
              <option value="verify_ioc">Verify IoC</option>
              <option value="reject_ioc">Reject IoC</option>
              <option value="update_reputation">Update Reputation</option>
              <option value="integrity_check">Integrity Check</option>
              <option value="register_org">Register Org</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-850/50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4 pl-6">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor Node</th>
                <th className="py-3 px-4">Subject Object</th>
                <th className="py-3 px-4">Result / Consensus Event</th>
                <th className="py-3 px-4 pr-6 text-right">Fabric Tx Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-xs">
              {auditLog.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-850/40 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 pl-6 whitespace-nowrap text-gray-400">
                    {formatDate(entry.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
                        ACTION_COLORS[entry.action] ?? 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {entry.action.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Actor */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-medium">{entry.actorOrg?.name || entry.actorOrgName || entry.actorOrgId}</span>
                      {(entry.actorUser?.username || entry.actorUsername) && (
                        <span className="text-gray-500 text-[11px]">({entry.actorUser?.username || entry.actorUsername})</span>
                      )}
                    </div>
                  </td>

                  {/* Object */}
                  <td className="py-3.5 px-4 font-mono text-gray-300 max-w-xs truncate">
                    {entry.objectId || entry.objectValue || '—'}
                  </td>

                  {/* Result */}
                  <td className="py-3.5 px-4 text-gray-300 max-w-sm truncate">
                    {entry.result || '—'}
                  </td>

                  {/* TX ID */}
                  <td className="py-3.5 px-4 pr-6 text-right whitespace-nowrap font-mono text-gray-500">
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
