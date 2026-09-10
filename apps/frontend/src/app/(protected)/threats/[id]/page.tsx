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
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/threats"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Threat Feed
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Record ID: {ioc.id}</span>
          {ioc.status === 'pending' && ioc.contributorOrgId !== org?.id && (
            <Link
              href="/endorse"
              className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-md hover:bg-amber-100 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Endorse in Review Panel
            </Link>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ioc.status} size="md" />
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                {IOC_TYPE_LABELS[ioc.iocType]}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase border ${tlpColor(ioc.tlpLevel)}`}>
                TLP:{ioc.tlpLevel}
              </span>
            </div>
            <h1 className="text-xl font-bold font-mono text-slate-900 break-all tracking-tight">
              {ioc.normalizedValue}
            </h1>
            {ioc.rawValue !== ioc.normalizedValue && (
              <p className="text-xs text-slate-500 font-mono">
                Original Submitted Raw Value: <span className="text-slate-700">{ioc.rawValue}</span>
              </p>
            )}
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Consensus Status</span>
            <span className={`text-lg font-bold ${ioc.status === 'verified' ? 'text-emerald-700' : 'text-amber-700'}`}>
              {endorsements.filter((e: any) => e.decision === 'endorse').length} / 2 Endorsements
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
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
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Indicator Context & Attribution
            </h2>
            <div className="bg-slate-50 rounded-md p-3.5 border border-slate-200">
              <p className="text-xs text-slate-800 leading-relaxed">{ioc.description}</p>
            </div>

            {ioc.evidenceReference && (
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs">
                <span className="text-slate-500">Evidence Reference / Sandbox:</span>
                <a
                  href={ioc.evidenceReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-mono flex items-center gap-1 hover:underline"
                >
                  {ioc.evidenceReference} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div>
                <span className="text-slate-400 block">Submitted At</span>
                <span className="text-slate-800 font-medium">{formatDate(ioc.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Ledger Update</span>
                <span className="text-slate-800 font-medium">{formatDate(ioc.updatedAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Submitter Rep at Submission</span>
                <span className="text-blue-700 font-semibold">{ioc.reputationAtSubmit}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Peer Endorsements Timeline */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Peer Endorsement Log ({endorsements.length})
              </h2>
              <span className="text-xs text-slate-400">Threshold: 2 independent peers</span>
            </div>

            {endorsements.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-md border border-slate-200">
                No peer endorsements registered yet. Awaiting consortium review.
              </div>
            ) : (
              <div className="space-y-2.5">
                {endorsements.map((end: any) => {
                  const endOrg = end.organization || ORGANIZATIONS[end.organizationId];
                  const orgName = endOrg?.name || end.organization?.name || end.organizationId;
                  const orgType = endOrg?.orgType || end.organization?.orgType || 'Peer Node';
                  return (
                    <div
                      key={end.id}
                      className={`p-3 rounded-md border ${
                        end.decision === 'endorse'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : end.decision === 'reject'
                          ? 'bg-red-50/50 border-red-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                              end.decision === 'endorse'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : end.decision === 'reject'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {end.decision}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">{orgName}</span>
                          <span className="text-[11px] text-slate-500">({orgType})</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{formatDate(end.createdAt)}</span>
                      </div>

                      {end.reason && (
                        <p className="text-xs text-slate-700 mt-2 italic bg-white p-2 rounded border border-slate-200">
                          &quot;{end.reason}&quot;
                        </p>
                      )}

                      {end.blockchainTxId && (
                        <div className="mt-1.5 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <span>Tx:</span>
                          <span className="text-slate-700">{end.blockchainTxId}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 3: Audit Trail for This IoC */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" /> Ledger Audit Trail
            </h2>
            <div className="divide-y divide-slate-100 text-xs">
              {relatedAudit.map((aud) => (
                <div key={aud.id} className="py-2.5 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 uppercase text-[11px]">{aud.action.replace('_', ' ')}</span>
                      <span className="text-slate-400 text-[11px]">by {aud.actorOrgName}</span>
                    </div>
                    <p className="text-slate-600 text-xs">{aud.result}</p>
                    {aud.blockchainTxId && (
                      <p className="text-slate-400 font-mono text-[10px]">TX: {shortTxId(aud.blockchainTxId)}</p>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px] flex-shrink-0">{formatDate(aud.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Contributor Node & Cryptographic Proof */}
        <div className="space-y-5">
          {/* Submitter Node Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Submitting Organization
            </h3>
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm">{contributor?.name}</span>
                <span className={`font-bold text-xs ${reputationColor(contributor?.reputationScore ?? 50)}`}>
                  {contributor?.reputationScore} rep
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">{contributor?.orgType}</p>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                MSP: {contributor?.fabricMspId}
              </div>
            </div>
          </div>

          {/* Cryptographic Proof & Tamper Verification Card */}
          <div
            className={`rounded-lg p-5 border space-y-3.5 ${
              integrityPassed
                ? 'bg-white border-emerald-500/80'
                : 'bg-red-50/40 border-red-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" /> Cryptographic Integrity
              </h3>
              {integrityPassed ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3" /> PASS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-300">
                  <XCircle className="w-3 h-3" /> FAIL
                </span>
              )}
            </div>

            {/* Banner based on PASS/FAIL */}
            {integrityPassed ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2.5 text-xs text-emerald-900 space-y-0.5">
                <p className="font-semibold text-emerald-800">Record Tamper-Evident</p>
                <p className="text-emerald-700 text-[11px]">
                  Current database state matches the immutable SHA-256 commitment stored on Hyperledger Fabric ledger.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-2.5 text-xs text-red-900 space-y-0.5">
                <p className="font-bold text-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> TAMPERING DETECTED
                </p>
                <p className="text-red-700 text-[11px]">
                  Database recalculation does not match the on-chain root of trust. The off-chain record has been altered post-commitment.
                </p>
              </div>
            )}

            {/* Hashes comparison */}
            <div className="space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 font-sans block">On-Chain Ledger Hash (Anchor)</span>
                <p className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 break-all text-[11px] mt-1 font-mono">
                  {onChainAnchorHash || ioc.integrityHash}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 font-sans block">Current Computed SHA-256</span>
                <p
                  className={`p-2 rounded border break-all text-[11px] mt-1 font-mono ${
                    integrityPassed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800 font-semibold'
                  }`}
                >
                  {calculatedHash || 'Calculating verification hash...'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-sans block">Serialization Formula</span>
                <code className="text-[10px] text-slate-600 block mt-0.5 bg-slate-50 p-1 rounded border border-slate-200">
                  ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix
                </code>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 font-sans block">Fabric Blockchain Status</span>
                {ioc.blockchainTxId ? (
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 break-all text-[10px] mt-1 font-mono">
                    <span className="text-slate-400 block font-sans text-[10px] mb-0.5">On-Chain Tx ID:</span>
                    {ioc.blockchainTxId}
                  </div>
                ) : (
                  <p className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs mt-1 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
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
