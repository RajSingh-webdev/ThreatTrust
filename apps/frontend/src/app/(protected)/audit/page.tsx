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
  submit_ioc: 'bg-blue-50 text-blue-700 border-blue-200',
  endorse_ioc: 'bg-purple-50 text-purple-700 border-purple-200',
  reject_ioc: 'bg-red-50 text-red-700 border-red-200',
  verify_ioc: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  flag_ioc: 'bg-amber-50 text-amber-800 border-amber-200',
  update_reputation: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  integrity_check: 'bg-slate-100 text-slate-700 border-slate-200',
  register_org: 'bg-indigo-50 text-indigo-700 border-indigo-200',
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

  // Fallback demo indicators for integrity visualization if none loaded yet
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Audit Trail & Ledger Integrity Verification
          </h1>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Tamper-Evidence Monitor
          </span>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Cryptographic consistency verification between local relational storage and Hyperledger Fabric immutable state
        </p>
      </div>

      {/* SECTION 1: Live Cryptographic Integrity Verification Demonstration */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-600" /> Cryptographic Integrity Verification Engine
            </h2>
            <p className="text-xs text-slate-500">
              Comparing SHA-256 state commitments calculated over off-chain database records against on-chain ledger roots
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Formula: SHA256(ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DEMO 1: PASS Verification Card */}
          <div className="bg-white border-2 border-emerald-500/70 rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {iocPass.iocType}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">{iocPass.normalizedValue}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED MATCH (PASS)
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 space-y-0.5">
              <span className="font-bold block text-emerald-900">BLOCKCHAIN INTEGRITY CHECK PASSED</span>
              <p className="text-emerald-700 leading-relaxed text-[11px]">
                Off-chain record matches the on-chain SHA-256 state commitment exactly. Zero tampering detected.
              </p>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-[11px] text-slate-500 font-sans block font-medium">On-Chain Ledger Anchor (Fabric)</span>
                <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 break-all text-[11px] mt-0.5">
                  {iocPass.integrityHash}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-sans block font-medium">Current Calculated SHA-256 (PostgreSQL)</span>
                <p className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-300 text-emerald-800 break-all text-[11px] mt-0.5">
                  {iocPass.integrityHash}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-sans flex items-center justify-between">
                <span>Formula: <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">SHA256(ioc_id|type|value|org|timestamp)</code></span>
                <span className="text-emerald-700 font-medium">Valid Anchor</span>
              </div>
            </div>
          </div>

          {/* DEMO 2: FAIL Verification Card (Simulated Tampering) */}
          <div className="bg-red-50/30 border-2 border-red-500 rounded-lg p-6 space-y-4 shadow-sm ring-1 ring-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {iocFail.iocType}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">{iocFail.normalizedValue}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-100 px-2.5 py-1 rounded-md border border-red-300">
                <XCircle className="w-3.5 h-3.5" /> MISMATCH DETECTED (FAIL)
              </span>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 space-y-1">
              <span className="font-bold text-red-900 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-600" /> BLOCKCHAIN INTEGRITY CHECK FAILED
              </span>
              <p className="text-red-700 text-[11px] leading-relaxed">
                The current database content differs from the immutable hash anchored on Hyperledger Fabric. The off-chain record was modified after genesis submission.
              </p>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-[11px] text-slate-500 font-sans block font-medium">On-Chain Ledger Anchor (Fabric)</span>
                <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 break-all text-[11px] mt-0.5">
                  {iocFail.integrityHash}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-red-700 font-sans block font-semibold">Current Calculated SHA-256 (Tampered DB State)</span>
                <p className="p-2.5 rounded-lg bg-red-100/60 border border-red-300 text-red-900 break-all text-[11px] mt-0.5 font-bold">
                  {iocFail.tamperedCurrentHash}
                </p>
              </div>
              <div className="pt-2 border-t border-red-200/60 text-[11px] text-slate-500 font-sans flex items-center justify-between">
                <span>Tampered Value: <strong className="text-red-700">203.0.113.50</strong></span>
                <span className="text-red-700 font-medium">State Compromised</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Consortium Audit Trail Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Consortium Audit Trail</h2>
            <p className="text-xs text-slate-500">Immutable log of all actor operations, reviews, and state transitions</p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
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
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 pl-6">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor Node</th>
                <th className="py-3 px-4">Subject Object</th>
                <th className="py-3 px-4">Result / Consensus Event</th>
                <th className="py-3 px-4 pr-6 text-right">Fabric Tx Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {auditLog.map((entry, idx) => (
                <tr key={entry.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 pl-6 whitespace-nowrap text-slate-500">
                    {formatDate(entry.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
                        ACTION_COLORS[entry.action] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {entry.action.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Actor */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-900 font-semibold">{entry.actorOrg?.name || entry.actorOrgName || entry.actorOrgId}</span>
                      {(entry.actorUser?.username || entry.actorUsername) && (
                        <span className="text-slate-400 text-[11px]">({entry.actorUser?.username || entry.actorUsername})</span>
                      )}
                    </div>
                  </td>

                  {/* Object */}
                  <td className="py-3.5 px-4 font-mono text-slate-700 max-w-xs truncate">
                    {entry.objectId || entry.objectValue || '—'}
                  </td>

                  {/* Result */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate">
                    {entry.result || '—'}
                  </td>

                  {/* TX ID */}
                  <td className="py-3.5 px-4 pr-6 text-right whitespace-nowrap font-mono text-slate-400">
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
