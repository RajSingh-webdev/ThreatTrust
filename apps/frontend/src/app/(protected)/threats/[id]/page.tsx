'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Clock, Hash, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Building2,
  FileText, Activity, Lock, CheckSquare, Layers
} from 'lucide-react';
import { IOCS, getEndorsementsForIoc, ORGANIZATIONS, AUDIT_LOG } from '@/lib/mock-data';
import { timeAgo, formatDate, IOC_TYPE_LABELS, tlpColor, shortTxId, reputationColor } from '@/lib/utils';
import StatusBadge from '@/components/status-badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function ThreatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { org } = useAuth();

  const id = params.id as string;
  const [liveIoc, setLiveIoc] = useState<any | null>(null);
  const [liveIntegrity, setLiveIntegrity] = useState<any | null>(null);
  const [liveAudit, setLiveAudit] = useState<any[] | null>(null);

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
      <div className="p-8 max-w-4xl mx-auto text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-white">Indicator Not Found</h2>
        <p className="text-gray-400 text-sm">The requested threat indicator &quot;{id}&quot; does not exist on the ledger.</p>
        <Link
          href="/threats"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Threat Feed
        </Link>
      </div>
    );
  }

  const contributor = ioc.contributorOrg || ORGANIZATIONS[ioc.contributorOrgId];
  const endorsements = ioc.endorsements || getEndorsementsForIoc(ioc.id);
  const relatedAudit = liveAudit || AUDIT_LOG.filter((a) => a.objectId === ioc.id);

  // Integrity Check Status Calculation
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/threats"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Threat Feed
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">Record ID: {ioc.id}</span>
          {ioc.status === 'pending' && ioc.contributorOrgId !== org?.id && (
            <Link
              href="/endorse"
              className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Endorse in Review Panel
            </Link>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={ioc.status} size="md" />
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-gray-800 text-gray-200 border border-gray-700 uppercase">
                {IOC_TYPE_LABELS[ioc.iocType]}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded uppercase border ${tlpColor(ioc.tlpLevel)}`}>
                TLP:{ioc.tlpLevel}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-mono text-white break-all tracking-tight">
              {ioc.normalizedValue}
            </h1>
            {ioc.rawValue !== ioc.normalizedValue && (
              <p className="text-xs text-gray-500 font-mono">
                Original Submitted Raw Value: <span className="text-gray-400">{ioc.rawValue}</span>
              </p>
            )}
          </div>

          <div className="text-right sm:border-l sm:border-gray-800 sm:pl-6">
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Consensus Status</span>
            <span className="text-lg font-bold text-emerald-400">
              {endorsements.filter((e: any) => e.decision === 'endorse').length} / 2 Endorsements
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              {ioc.status === 'verified' ? 'Consensus Verified' : 'Consensus In Progress'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Intelligence Details & Endorsement Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Threat Context */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Indicator Context & Attribution
            </h2>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <p className="text-sm text-gray-200 leading-relaxed">{ioc.description}</p>
            </div>

            {ioc.evidenceReference && (
              <div className="flex items-center justify-between bg-gray-800/30 p-3 rounded-lg border border-gray-800 text-xs">
                <span className="text-gray-400">Evidence Reference / Sandbox:</span>
                <a
                  href={ioc.evidenceReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 hover:underline"
                >
                  {ioc.evidenceReference} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div>
                <span className="text-gray-500 block">Submitted At</span>
                <span className="text-gray-200 font-medium">{formatDate(ioc.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Last Ledger Update</span>
                <span className="text-gray-200 font-medium">{formatDate(ioc.updatedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Submitter Rep at Submission</span>
                <span className="text-blue-400 font-semibold">{ioc.reputationAtSubmit}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Peer Endorsements Timeline */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> Peer Endorsement Log ({endorsements.length})
              </h2>
              <span className="text-xs text-gray-500">Threshold: 2 independent peers</span>
            </div>

            {endorsements.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm bg-gray-850/50 rounded-xl border border-gray-800">
                No peer endorsements registered yet. Awaiting consortium review.
              </div>
            ) : (
              <div className="space-y-3">
                {endorsements.map((end: any, idx: number) => {
                  const endOrg = end.organization || ORGANIZATIONS[end.organizationId];
                  const orgName = endOrg?.name || end.organization?.name || end.organizationId;
                  const orgType = endOrg?.orgType || end.organization?.orgType || 'Peer Node';
                  return (
                    <div
                      key={end.id}
                      className={`p-4 rounded-xl border ${
                        end.decision === 'endorse'
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : end.decision === 'reject'
                          ? 'bg-red-500/5 border-red-500/20'
                          : 'bg-amber-500/5 border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${
                              end.decision === 'endorse'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : end.decision === 'reject'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {end.decision}
                          </span>
                          <span className="text-sm font-semibold text-white">{orgName}</span>
                          <span className="text-xs text-gray-500">({orgType})</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(end.createdAt)}</span>
                      </div>

                      {end.reason && (
                        <p className="text-xs text-gray-300 mt-2 italic bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                          &quot;{end.reason}&quot;
                        </p>
                      )}

                      {end.blockchainTxId && (
                        <div className="mt-2 text-[11px] text-gray-500 font-mono flex items-center gap-1">
                          <span>Tx:</span>
                          <span className="text-gray-400">{end.blockchainTxId}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 3: Audit Trail for This IoC */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Ledger Audit Trail
            </h2>
            <div className="divide-y divide-gray-800 text-xs">
              {relatedAudit.map((aud) => (
                <div key={aud.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white uppercase">{aud.action.replace('_', ' ')}</span>
                      <span className="text-gray-500">by {aud.actorOrgName}</span>
                    </div>
                    <p className="text-gray-400">{aud.result}</p>
                    {aud.blockchainTxId && (
                      <p className="text-gray-600 font-mono text-[10px]">TX: {shortTxId(aud.blockchainTxId)}</p>
                    )}
                  </div>
                  <span className="text-gray-500 text-[11px] flex-shrink-0">{formatDate(aud.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Contributor Node & Cryptographic Proof */}
        <div className="space-y-6">
          {/* Submitter Node Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Submitting Organization
            </h3>
            <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-base">{contributor?.name}</span>
                <span className={`font-bold ${reputationColor(contributor?.reputationScore ?? 50)}`}>
                  {contributor?.reputationScore} rep
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 capitalize">{contributor?.orgType}</p>
              <div className="mt-2 pt-2 border-t border-gray-700 text-[11px] text-gray-500 font-mono">
                MSP: {contributor?.fabricMspId}
              </div>
            </div>
          </div>

          {/* Cryptographic Proof & Tamper Verification Card */}
          <div
            className={`rounded-2xl p-5 border space-y-4 shadow-xl ${
              integrityPassed
                ? 'bg-gray-900 border-emerald-500/40'
                : 'bg-red-950/20 border-red-500/60 ring-1 ring-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-400" /> Cryptographic Integrity
              </h3>
              {integrityPassed ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> PASS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/40">
                  <XCircle className="w-3 h-3" /> FAIL
                </span>
              )}
            </div>

            {/* Banner based on PASS/FAIL */}
            {integrityPassed ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
                <p className="font-semibold text-emerald-200">Record Tamper-Evident</p>
                <p className="text-emerald-400/80 text-[11px]">
                  Current database state matches the immutable SHA-256 commitment stored in the Hyperledger Fabric ledger.
                </p>
              </div>
            ) : (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-xs text-red-200 space-y-1">
                <p className="font-bold text-red-100 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> TAMPERING DETECTED
                </p>
                <p className="text-red-300 text-[11px]">
                  Database recalculation does not match the on-chain root of trust. The off-chain record has been altered post-commitment.
                </p>
              </div>
            )}

            {/* Hashes comparison */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[11px] text-gray-400 font-sans block">On-Chain Ledger Hash (Anchor)</span>
                <p className="p-2 rounded bg-gray-950 border border-gray-800 text-blue-300 break-all text-[11px] mt-1 font-mono">
                  {onChainAnchorHash || ioc.integrityHash}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 font-sans block">Current Computed SHA-256</span>
                <p
                  className={`p-2 rounded border break-all text-[11px] mt-1 font-mono ${
                    integrityPassed
                      ? 'bg-gray-950 border-gray-800 text-emerald-400'
                      : 'bg-red-950/60 border-red-800/80 text-red-300'
                  }`}
                >
                  {calculatedHash || 'Calculating verification hash...'}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <span className="text-[10px] text-gray-500 font-sans block">Serialization Formula</span>
                <code className="text-[10px] text-gray-400 block mt-0.5">
                  ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix
                </code>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 font-sans block">Fabric Blockchain Status</span>
                {ioc.blockchainTxId ? (
                  <p className="p-2 rounded bg-gray-950 border border-emerald-500/30 text-emerald-400 break-all text-[10px] mt-1 font-mono">
                    <span className="text-gray-400 block font-sans text-[10px] mb-0.5">On-Chain Tx ID:</span>
                    {ioc.blockchainTxId}
                  </p>
                ) : (
                  <p className="p-2 rounded bg-gray-950 border border-gray-800 text-amber-400/90 text-[11px] mt-1 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Fabric Network Offline (Local Store Mode)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
