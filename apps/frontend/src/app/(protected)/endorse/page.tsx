'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckSquare, ShieldAlert, CheckCircle2, XCircle,
  Flag, Info, ArrowRight, ExternalLink, Clock, RefreshCw, AlertCircle, Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { IOCS_LIST, getEndorseCount } from '@/lib/mock-data';
import { timeAgo, maskIocValue, IOC_TYPE_LABELS, tlpColor } from '@/lib/utils';
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
        // Fallback
      }
    }
    loadPending();
    return () => { isMounted = false; };
  }, []);

  if (!org || !user) return null;

  const allPending = livePendingIocs || IOCS_LIST.filter((i) => i.status === 'pending');

  const pendingIoCs = allPending.filter((i) => {
    const contribId = i.contributorOrgId || i.contributorOrg?.id;
    const contribName = i.contributorOrg?.name;
    if (contribId === org.id || contribName === org.name) return false;
    const hasReviewed = (i.endorsements || []).some(
      (e: any) => e.organizationId === org.id || e.organization?.name === org.name
    );
    return !hasReviewed;
  });

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

      refreshAuth().catch(() => {});
    } catch (err: any) {
      setEndorseError((prev) => ({
        ...prev,
        [iocId]: err.message || 'Endorsement failed.',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white p-6 max-w-7xl mx-auto space-y-8 antialiased selection:bg-[#C6F432] selection:text-[#070708]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C22] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 px-3 py-1 rounded-full border border-[#C6F432]/25">
            PEER CONSENSUS VERIFICATION
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2.5">
            Peer Endorsement Queue
          </h1>
          <p className="text-xs text-[#8E8E9A] mt-1 font-normal">
            Corroborate incoming indicators observed across consortium members to achieve the 2/2 verification quorum.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#8E8E9A]">
          <span>Reviewer: <strong className="text-white">{org.name}</strong></span>
          <span className="text-[#3A3A45]">/</span>
          <span className="text-[#C6F432] font-bold">{pendingIoCs.length} Pending</span>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#0B0B0E] border border-[#1C1C22] p-5 space-y-1 text-xs">
          <p className="font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C6F432]" />
            Consensus Rule: 2 Independent Peer Endorsements
          </p>
          <p className="text-[#8E8E9A] text-[11px] leading-relaxed">
            When 2 non-submitting consortium peers endorse an indicator, it transitions to Verified status on the distributed ledger.
          </p>
        </div>

        <div className="rounded-2xl bg-[#0B0B0E] border border-[#1C1C22] p-5 space-y-1 text-xs">
          <p className="font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C6F432]" />
            Anti-Sybil Self-Endorsement Lock
          </p>
          <p className="text-[#8E8E9A] text-[11px] leading-relaxed">
            Organizations cannot review or endorse their own submissions. {ownPendingSubmissions.length} of your own submissions are locked from this queue.
          </p>
        </div>
      </div>

      {/* Empty Queue State */}
      {pendingIoCs.length === 0 ? (
        <div className="rounded-3xl bg-[#0B0B0E] border border-[#1C1C22] p-16 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[#141418] border border-[#24242C] flex items-center justify-center mx-auto text-[#C6F432]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Review Queue Up to Date</h3>
          <p className="text-xs text-[#8E8E9A] max-w-md mx-auto">
            All peer threat indicators have been evaluated. Incoming submissions from other banks will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingIoCs.map((ioc: any) => {
            const completed = completedEndorsements[ioc.id];
            const activeDecision = activeActions[ioc.id];
            const err = endorseError[ioc.id];
            const endorseCount = (ioc.endorsements || []).filter((e: any) => e.decision === 'endorse').length;

            return (
              <motion.div
                key={ioc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-[#0B0B0E] border border-[#1C1C22] p-7 md:p-8 space-y-6 shadow-xl relative overflow-hidden"
              >
                {/* Top Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#181820]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold uppercase text-[10px] px-2.5 py-0.5 rounded-full bg-[#16161B] text-[#A1A1AA] border border-[#24242C] font-mono">
                      {ioc.iocType}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      PENDING REVIEW
                    </span>
                    <span className="text-[11px] text-[#71717A] font-mono">
                      Submitted by: <strong className="text-white">{ioc.contributorOrg?.name || 'Peer Node'}</strong>
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[#71717A]">
                    {timeAgo(ioc.createdAt)}
                  </span>
                </div>

                {/* Threat Value & Context */}
                <div className="space-y-2">
                  <p className="text-xl font-bold font-mono text-white tracking-wide">
                    {maskIocValue(ioc.normalizedValue, ioc.iocType)}
                  </p>
                  <p className="text-xs text-[#8E8E9A] leading-relaxed font-normal">
                    {ioc.description || 'No description provided.'}
                  </p>
                </div>

                {/* Error Banner */}
                {err && (
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs font-mono">
                    {err}
                  </div>
                )}

                {/* Completed State */}
                {completed ? (
                  <div className="p-4 rounded-2xl bg-[#121217] border border-[#C6F432]/30 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-[#C6F432] font-bold">
                      <Check className="w-4 h-4" />
                      <span>Endorsement successfully submitted to consortium ledger</span>
                    </div>
                    <span className="text-[#71717A]">Consensus Vote Recorded</span>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Decision Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectDecision(ioc.id, 'endorse')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-bold transition-all ${
                          activeDecision === 'endorse'
                            ? 'bg-[#C6F432] text-[#070708] shadow-md shadow-[#C6F432]/20'
                            : 'bg-[#141418] text-white border border-[#24242C] hover:border-[#383844]'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Endorse (+1 Consensus)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectDecision(ioc.id, 'reject')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-bold transition-all ${
                          activeDecision === 'reject'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            : 'bg-[#141418] text-[#8E8E9A] border border-[#24242C] hover:border-[#383844]'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject (False Positive)
                      </button>
                    </div>

                    {/* Reason input when action is selected */}
                    {activeDecision && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3 pt-2"
                      >
                        <input
                          type="text"
                          value={reasons[ioc.id] || ''}
                          onChange={(e) => setReasons({ ...reasons, [ioc.id]: e.target.value })}
                          placeholder="Telemetry corroboration note (e.g. Observed matching port 443 outbound scan in firewall)..."
                          className="w-full px-4 py-3 rounded-xl bg-[#101014] border border-[#1E1E26] text-white text-xs placeholder-[#454550] focus:border-[#C6F432] focus:outline-none"
                        />

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleConfirmAction(ioc.id)}
                            className="px-6 py-2.5 rounded-full bg-[#C6F432] hover:bg-[#b2df28] text-[#070708] text-xs font-bold font-mono transition-transform hover:scale-[1.02]"
                          >
                            Commit Vote to Ledger
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
