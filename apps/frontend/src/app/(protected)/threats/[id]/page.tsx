'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Clock, Hash,
  CheckCircle2, XCircle, AlertTriangle, Building2,
  FileText, Activity, CheckSquare, Layers, Copy, Check
} from 'lucide-react';
import { IOCS, getEndorsementsForIoc, ORGANIZATIONS, AUDIT_LOG } from '@/lib/mock-data';
import { timeAgo, formatDate, IOC_TYPE_LABELS, tlpColor } from '@/lib/utils';
import StatusBadge from '@/components/status-badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function ThreatDetailPage() {
  const params = useParams();
  const { org } = useAuth();

  const id = params.id as string;
  const [liveIoc, setLiveIoc] = useState<any | null>(null);
  const [liveIntegrity, setLiveIntegrity] = useState<any | null>(null);
  const [liveAudit, setLiveAudit] = useState<any[] | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchIoc() {
      try {
        const [iocRes, verifyRes, auditRes] = await Promise.all([
          api.iocs.getById(id).catch(() => null),
          api.iocs.verifyIntegrity(id).catch(() => null),
          api.audit.getAll().catch(() => null),
        ]);

        if (isMounted) {
          if (iocRes && iocRes.ioc) setLiveIoc(iocRes.ioc);
          if (verifyRes && verifyRes.verification) setLiveIntegrity(verifyRes.verification);
          if (auditRes && auditRes.logs) setLiveAudit(auditRes.logs.filter((a: any) => a.objectId === id));
        }
      } catch {
        // Fallback to local
      }
    }
    fetchIoc();
    return () => { isMounted = false; };
  }, [id]);

  const ioc = liveIoc || IOCS[id];

  if (!ioc) {
    return (
      <div className="min-h-screen bg-[#070708] p-8 max-w-4xl mx-auto text-center py-24 space-y-4 font-mono">
        <h2 className="text-xl font-bold text-white">Indicator Not Found</h2>
        <p className="text-[#8E8E9A] text-xs">The requested threat indicator &quot;{id}&quot; does not exist on the ledger.</p>
        <Link
          href="/threats"
          className="inline-flex items-center gap-2 text-xs text-[#C6F432] bg-[#101014] border border-[#1E1E26] px-4 py-2 rounded-lg hover:border-[#C6F432] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Threat Feed
        </Link>
      </div>
    );
  }

  const contributor = ioc.contributorOrg || ORGANIZATIONS[ioc.contributorOrgId];
  const endorsements = ioc.endorsements || getEndorsementsForIoc(ioc.id);
  const relatedAudit = liveAudit || AUDIT_LOG.filter((a) => a.objectId === ioc.id);

  const isTampered = liveIntegrity
    ? liveIntegrity.status === 'FAIL' || liveIntegrity.tamperDetected === true || liveIntegrity.match === false
    : !!ioc.tamperedCurrentHash;

  const calculatedHash = liveIntegrity
    ? (liveIntegrity.calculatedIntegrityHash || liveIntegrity.calculatedHash || '')
    : (isTampered ? ioc.tamperedCurrentHash! : (ioc.integrityHash || ''));

  const onChainAnchorHash = liveIntegrity
    ? (liveIntegrity.storedIntegrityHash || liveIntegrity.onChainHash || liveIntegrity.anchoredHash || ioc.integrityHash || '')
    : (ioc.integrityHash || '');

  const integrityPassed = liveIntegrity
    ? (liveIntegrity.status === 'PASS' && liveIntegrity.match === true && !liveIntegrity.tamperDetected && calculatedHash.length > 0 && calculatedHash.toLowerCase() === onChainAnchorHash.toLowerCase())
    : (!isTampered && calculatedHash.length > 0 && calculatedHash.toLowerCase() === onChainAnchorHash.toLowerCase());

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white p-6 md:p-8 max-w-7xl mx-auto space-y-6 antialiased">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/threats"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#8E8E9A] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Intelligence Feed
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#52525B] font-mono">ID: {ioc.id}</span>
          {ioc.status === 'pending' && ioc.contributorOrgId !== org?.id && (
            <Link
              href="/endorse"
              className="inline-flex items-center gap-1.5 bg-[#C6F432]/10 border border-[#C6F432]/40 text-[#C6F432] text-xs font-bold font-mono px-3 py-1.5 rounded-lg hover:bg-[#C6F432] hover:text-black transition-all"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Review & Endorse
            </Link>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-[#0B0B0E] border border-[#1C1C24] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-white/[0.02] to-transparent pointer-events-none" />
        <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-[#14141A] border border-[#22222C] text-[#A1A1AA] font-bold">
                {IOC_TYPE_LABELS[ioc.iocType]}
              </span>
              <span className={`text-[11px] font-mono uppercase px-2.5 py-1 rounded border font-bold ${tlpColor(ioc.tlpLevel)}`}>
                {ioc.tlpLevel.toUpperCase()}
              </span>
              <StatusBadge status={ioc.status} />
              {ioc.blockchainTxId && (
                <span className="text-[11px] font-mono text-[#C6F432] bg-[#C6F432]/10 border border-[#C6F432]/30 px-2 py-0.5 rounded">
                  Ledger Confirmed
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tight break-all">
                {ioc.normalizedValue}
              </h1>
              <button
                onClick={() => handleCopy(ioc.normalizedValue)}
                className="p-1.5 rounded-md bg-[#14141A] border border-[#22222C] text-[#8E8E9A] hover:text-white transition-colors"
                title="Copy Indicator"
              >
                {copiedHash ? <Check className="w-4 h-4 text-[#C6F432]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {ioc.rawValue !== ioc.normalizedValue && (
              <p className="text-xs font-mono text-[#71717A]">
                Raw Input: <span className="text-[#A1A1AA]">{ioc.rawValue}</span>
              </p>
            )}

            <p className="text-sm text-[#D4D4D8] leading-relaxed pt-1">
              {ioc.description}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="px-4 py-2 rounded-xl bg-[#121218] border border-[#1C1C24] text-right">
              <span className="text-[10px] font-mono uppercase text-[#71717A] block">Consortium Confidence</span>
              <span className="text-2xl font-mono font-bold text-[#C6F432]">
                {ioc.confidenceScore}<span className="text-sm text-[#71717A] font-normal">/100</span>
              </span>
            </div>
            <span className="text-xs font-mono text-[#71717A] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {timeAgo(ioc.createdAt)}
            </span>
          </div>
        </div>

        {ioc.evidenceReference && (
          <div className="mt-5 pt-4 border-t border-[#1C1C24] flex items-center gap-2 text-xs font-mono text-[#A1A1AA]">
            <FileText className="w-4 h-4 text-[#8E8E9A]" />
            <span>Evidence / Sandbox Reference:</span>
            <span className="text-white bg-[#14141A] px-2.5 py-1 rounded border border-[#22222C]">
              {ioc.evidenceReference}
            </span>
          </div>
        )}
      </div>

      {/* Grid: Details & Provenance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Lifecycle, Endorsements, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Peer Consensus Status */}
          <div className="bg-[#0B0B0E] border border-[#1C1C24] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C6F432]" /> Peer Endorsement Matrix
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#101014] border border-[#1C1C24]">
                <span className="text-[10px] font-mono uppercase text-[#71717A] block">Current Stage</span>
                <span className="text-sm font-mono font-bold text-white capitalize">{ioc.status}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#101014] border border-[#1C1C24]">
                <span className="text-[10px] font-mono uppercase text-[#71717A] block">Endorsements</span>
                <span className="text-sm font-mono font-bold text-[#C6F432]">
                  {endorsements.filter((e: any) => e.verdict === 'endorse').length} Signed
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#101014] border border-[#1C1C24]">
                <span className="text-[10px] font-mono uppercase text-[#71717A] block">Disputes</span>
                <span className="text-sm font-mono font-bold text-rose-400">
                  {endorsements.filter((e: any) => e.verdict === 'reject').length} Rejected
                </span>
              </div>
            </div>

            {/* Endorsements List */}
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-mono text-[#8E8E9A] block">Peer Endorsement Records</span>
              {endorsements.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#101014] border border-[#1C1C24] text-center text-xs font-mono text-[#52525B]">
                  No peer endorsements submitted yet. Indicator is awaiting verification.
                </div>
              ) : (
                endorsements.map((e: any) => {
                  const endorser = ORGANIZATIONS[e.endorserOrgId] || { name: e.endorserOrgId, orgType: 'Peer' };
                  const isEndorse = e.verdict === 'endorse';
                  return (
                    <div
                      key={e.id}
                      className="p-3.5 rounded-xl bg-[#101014] border border-[#1C1C24] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {isEndorse ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-mono font-bold text-white block">{endorser.name}</span>
                          <span className="text-[10px] font-mono text-[#71717A]">{formatDate(e.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          isEndorse
                            ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                            : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                        }`}>
                          {e.verdict}
                        </span>
                        {e.blockchainTxId && (
                          <span className="text-[9px] font-mono text-[#52525B] block mt-1">
                            Tx: {e.blockchainTxId.substring(0, 10)}...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-[#0B0B0E] border border-[#1C1C24] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#C6F432]" /> Consortium Provenance & Audit Log
            </h3>
            <div className="space-y-2">
              {relatedAudit.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#101014] border border-[#1C1C24] text-center text-xs font-mono text-[#52525B]">
                  No audit log entries recorded for this indicator.
                </div>
              ) : (
                relatedAudit.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl bg-[#101014] border border-[#1C1C24] flex items-center justify-between text-xs font-mono">
                    <div className="space-y-0.5">
                      <span className="text-white font-bold block">{log.action.replace('_', ' ').toUpperCase()}</span>
                      <span className="text-[10px] text-[#71717A]">{log.actorOrgId || log.userId} · {formatDate(log.createdAt)}</span>
                    </div>
                    {log.txId && (
                      <span className="text-[10px] text-[#52525B]">
                        Tx: {log.txId.substring(0, 12)}...
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Originator & Cryptographic Verification */}
        <div className="space-y-6">
          {/* Originator Node */}
          <div className="bg-[#0B0B0E] border border-[#1C1C24] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C6F432]" /> Submitting Participant
            </h3>
            <div className="p-4 rounded-xl bg-[#101014] border border-[#1C1C24] space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{contributor?.name || 'Unknown Node'}</span>
                <span className="text-xs text-[#C6F432] font-bold">{contributor?.reputationScore || 50} Rep</span>
              </div>
              <p className="text-xs text-[#71717A] capitalize">{contributor?.orgType}</p>
              <div className="pt-2 border-t border-[#1C1C24] text-[10px] text-[#52525B]">
                MSP: <span className="text-[#A1A1AA]">{contributor?.fabricMspId || 'BankAMSP'}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof & Tamper Verification Card */}
          <div className={`p-6 rounded-2xl border shadow-xl space-y-4 transition-all ${
            integrityPassed
              ? 'bg-[#0B0B0E] border-[#C6F432]/30 shadow-[#C6F432]/5'
              : 'bg-[#0B0B0E] border-rose-500/50 shadow-rose-950/20'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#C6F432]" /> Cryptographic Integrity
              </h3>
              {integrityPassed ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#C6F432] bg-[#C6F432]/10 px-2.5 py-1 rounded-lg border border-[#C6F432]/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-800/50">
                  <XCircle className="w-3.5 h-3.5" /> TAMPERED
                </span>
              )}
            </div>

            {integrityPassed ? (
              <div className="p-3.5 rounded-xl bg-[#C6F432]/5 border border-[#C6F432]/20 text-xs font-mono text-[#D4D4D8] space-y-1">
                <p className="font-bold text-[#C6F432]">Record Tamper-Evident</p>
                <p className="text-[#8E8E9A] text-[11px]">
                  Database recalculation strictly matches the immutable SHA-256 state commitment anchored to the consortium ledger.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-xs font-mono text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-400">
                  <AlertTriangle className="w-4 h-4" /> Tampering Detected
                </p>
                <p className="text-rose-400/80 text-[11px]">
                  Database recalculation does not match the on-chain root of trust. The off-chain record has been altered post-commitment.
                </p>
              </div>
            )}

            {/* Hash Display */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-[#71717A] block font-bold">Ledger Root Anchor (SHA-256)</span>
                <p className="p-2.5 rounded-xl bg-[#101014] border border-[#1C1C24] text-white break-all text-[11px] mt-1 select-all">
                  {onChainAnchorHash || ioc.integrityHash}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase text-[#71717A] block font-bold">Live Computed Hash</span>
                <p className={`p-2.5 rounded-xl border break-all text-[11px] mt-1 select-all ${
                  integrityPassed
                    ? 'bg-[#101014] border-[#1C1C24] text-[#C6F432]'
                    : 'bg-rose-950/20 border-rose-800/50 text-rose-300 font-bold'
                }`}>
                  {calculatedHash || 'Computing verification hash...'}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1C1C24]">
                <span className="text-[10px] text-[#52525B] uppercase block">Serialization Formula</span>
                <code className="text-[10px] text-[#8E8E9A] block mt-1 bg-[#101014] p-2 rounded-lg border border-[#1C1C24]">
                  ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix
                </code>
              </div>

              {ioc.blockchainTxId && (
                <div className="pt-2 border-t border-[#1C1C24]">
                  <span className="text-[10px] text-[#52525B] uppercase block">Blockchain Tx ID</span>
                  <p className="p-2.5 rounded-xl bg-[#101014] border border-[#1C1C24] text-white break-all text-[10px] mt-1">
                    {ioc.blockchainTxId}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
