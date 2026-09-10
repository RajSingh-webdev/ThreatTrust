'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare, ShieldAlert, CheckCircle2, XCircle,
  Flag, Info, ArrowRight, ExternalLink, Clock, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getPendingForEndorsement, getEndorseCount, ORGANIZATIONS, IOCS_LIST } from '@/lib/mock-data';
import { timeAgo, maskIocValue, IOC_TYPE_LABELS, tlpColor, shortTxId } from '@/lib/utils';
import StatusBadge from '@/components/status-badge';
import type { EndorsementDecision } from '@/lib/types';

import { api } from '@/lib/api';

interface ActionState {
  decision: EndorsementDecision;
  reason: string;
  isConfirmed: boolean;
}

export default function EndorsementPanelPage() {
  const { org, user, refreshAuth } = useAuth();

  const [livePendingIocs, setLivePendingIocs] = useState<any[] | null>(null);
  const [activeActions, setActiveActions] = useState<Record<string, EndorsementDecision | null>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [completedEndorsements, setCompletedEndorsements] = useState<Record<string, ActionState & { txId?: string }>>({});
  const [endorseError, setEndorseError] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadPending() {
      try {
        const res = await api.iocs.getAll({ status: 'pending' });
        if (isMounted && res.iocs) {
          setLivePendingIocs(res.iocs);
        }
      } catch {
        // Fallback to local
      }
    }
    loadPending();
    return () => { isMounted = false; };
  }, []);

  if (!org || !user) return null;

  const allPending = livePendingIocs || IOCS_LIST.filter((i) => i.status === 'pending');

  // Pending IoCs this org is eligible to review (self-submissions and already-endorsed filtered out)
  const pendingIoCs = allPending.filter((i) => {
    const contribId = i.contributorOrgId || i.contributorOrg?.id;
    const contribName = i.contributorOrg?.name;
    if (contribId === org.id || contribName === org.name) return false;
    const hasReviewed = (i.endorsements || []).some((e: any) => e.organizationId === org.id || e.organization?.name === org.name);
    return !hasReviewed;
  });

  // For transparency / rule compliance: find own pending submissions to explicitly show the self-endorsement prohibition banner
  const ownPendingSubmissions = allPending.filter(
    (i) => (i.contributorOrgId || i.contributorOrg?.id) === org.id || i.contributorOrg?.name === org.name
  );

  const handleSelectDecision = (iocId: string, decision: EndorsementDecision) => {
    setActiveActions((prev) => ({
      ...prev,
      [iocId]: prev[iocId] === decision ? null : decision,
    }));
    setEndorseError((prev) => ({ ...prev, [iocId]: '' }));
  };

  const handleConfirmAction = async (iocId: string) => {
    const decision = activeActions[iocId];
    if (!decision) return;

    try {
      const res = await api.iocs.endorse(iocId, {
        decision,
        reason: reasons[iocId] || undefined,
      });

      const txId = res.endorsement?.blockchainTxId || res.ioc?.blockchainTxId || '';

      setCompletedEndorsements((prev) => ({
        ...prev,
        [iocId]: {
          decision,
          reason: reasons[iocId] || '',
          isConfirmed: true,
          txId,
        },
      }));

      // Refresh auth state to sync live score
      refreshAuth().catch(() => {});
    } catch (err: any) {
      setEndorseError((prev) => ({
        ...prev,
        [iocId]: err.message || 'Endorsement failed.',
      }));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Consensus & Endorsement Panel</h1>
            <span className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {pendingIoCs.length} Pending Review
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Validate peer-submitted cyber threat indicators to establish cryptographic decentralized consensus
          </p>
        </div>
      </div>

      {/* Protocol Rule Explanations Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-blue-900">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-blue-900 text-sm">Verification Threshold: 2 Independent Endorsements</p>
            <p className="text-blue-700 leading-relaxed">
              When 2 non-submitting consortium peers endorse an indicator, it transitions to <strong className="font-semibold text-blue-900">Verified</strong> status and awards +1 reputation to the contributor.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-900">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-900 text-sm">Strict Anti-Sybil Self-Endorsement Lock</p>
            <p className="text-amber-800 leading-relaxed">
              {org.name} cannot endorse indicators it submitted. {ownPendingSubmissions.length} of your own pending indicators are currently locked from your review queue.
            </p>
          </div>
        </div>
      </div>

      {/* List of Pending Indicators to Review */}
      {pendingIoCs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Review Queue Clear</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            You have reviewed all pending threat indicators from peer organizations or there are no unverified submissions awaiting review.
          </p>
          <Link
            href="/threats"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-md mt-2 transition-colors"
          >
            Browse Threat Feed <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingIoCs.map((ioc: any) => {
            const contributor = ioc.contributorOrg || ORGANIZATIONS[ioc.contributorOrgId];
            const contributorName = contributor?.name || ioc.contributorOrg?.name || ioc.contributorOrgId;
            const contributorRep = contributor?.reputationScore ?? ioc.reputationAtSubmit ?? 50;
            const liveEndorsements = ioc.endorsements || [];
            const currentEndorseCount = liveEndorsements.length > 0
              ? liveEndorsements.filter((e: any) => e.decision === 'endorse').length
              : getEndorseCount(ioc.id);
            const activeAction = activeActions[ioc.id];
            const completed = completedEndorsements[ioc.id];

            return (
              <div
                key={ioc.id}
                className={`bg-white border rounded-lg p-5 shadow-sm transition-all ${
                  completed
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {completed ? (
                  /* Completed Confirmation State */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-bold text-emerald-800">
                            Decision Recorded: {completed.decision}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">({ioc.id})</span>
                        </div>
                        <p className="text-sm font-mono text-slate-900 font-semibold mt-0.5">{ioc.normalizedValue}</p>
                        {completed.reason && (
                          <p className="text-xs text-slate-600 mt-1 italic">&quot;{completed.reason}&quot;</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {completed.txId ? (
                        <span className="text-xs text-emerald-700 font-mono block">
                          Fabric Tx: {shortTxId(completed.txId)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium block">
                          Fabric: Offline (Local Mode)
                        </span>
                      )}
                      <Link
                        href={`/threats/${ioc.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline mt-1 inline-block"
                      >
                        View in Threat Feed →
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Normal Review Form */
                  <div className="space-y-4">
                    {endorseError[ioc.id] && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5 text-red-800 text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                        <div>
                          <span className="font-semibold text-red-900 block">Endorsement Rejected</span>
                          {endorseError[ioc.id]}
                        </div>
                      </div>
                    )}
                    {/* Top Meta Line */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ioc.status} size="sm" />
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {IOC_TYPE_LABELS[ioc.iocType]}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${tlpColor(ioc.tlpLevel)}`}>
                          TLP:{ioc.tlpLevel}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                          Submitted by <strong className="text-slate-800 font-semibold">{contributorName}</strong> ({contributorRep} rep)
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" /> {timeAgo(ioc.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Indicator Value & Description */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                      <div className="lg:col-span-2 space-y-2">
                        <div className="font-mono text-sm font-semibold text-slate-900 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200 break-all">
                          {ioc.normalizedValue}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                          {ioc.description}
                        </p>
                      </div>

                      {/* Consensus Progress Box */}
                      <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">Consensus Progress</span>
                          <span className="font-bold text-amber-800">{currentEndorseCount} / 2 Endorsements</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all"
                            style={{ width: `${(currentEndorseCount / 2) * 100}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {2 - currentEndorseCount === 1
                            ? '1 more endorsement needed to verify'
                            : '2 endorsements needed to verify'}
                        </p>
                      </div>
                    </div>

                    {/* Action Decision Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-medium mr-1">Cast Review:</span>

                        {/* Endorse */}
                        <button
                          type="button"
                          onClick={() => handleSelectDecision(ioc.id, 'endorse')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeAction === 'endorse'
                              ? 'bg-emerald-700 text-white ring-2 ring-emerald-400 shadow-sm'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Endorse (+1 Cons)
                        </button>

                        {/* Reject */}
                        <button
                          type="button"
                          onClick={() => handleSelectDecision(ioc.id, 'reject')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeAction === 'reject'
                              ? 'bg-red-700 text-white ring-2 ring-red-400 shadow-sm'
                              : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject (False Positive)
                        </button>

                        {/* Flag */}
                        <button
                          type="button"
                          onClick={() => handleSelectDecision(ioc.id, 'flag')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeAction === 'flag'
                              ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-sm'
                              : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          <Flag className="w-3.5 h-3.5" /> Flag for Info
                        </button>
                      </div>

                      <Link
                        href={`/threats/${ioc.id}`}
                        className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium"
                      >
                        Deep Audit View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Expandable Reason Input and Submit */}
                    {activeAction && (
                      <div className="pt-3 border-t border-slate-200 space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                        <label className="block text-xs font-semibold text-slate-700">
                          Corroboration Reason / Telemetry Evidence (Optional):
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={reasons[ioc.id] || ''}
                            onChange={(e) =>
                              setReasons((prev) => ({ ...prev, [ioc.id]: e.target.value }))
                            }
                            placeholder={
                              activeAction === 'endorse'
                                ? 'e.g., Confirmed malicious traffic in firewall logs on port 443.'
                                : activeAction === 'reject'
                                ? 'e.g., Verified this IP belongs to a legitimate CDN.'
                                : 'e.g., Suspicious domain name but currently resolves to standard cloud parking.'
                            }
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmAction(ioc.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm flex-shrink-0"
                          >
                            Submit {activeAction.toUpperCase()} to Consortium
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
