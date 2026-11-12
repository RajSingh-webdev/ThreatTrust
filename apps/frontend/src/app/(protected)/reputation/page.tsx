'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Shield, Award,
  AlertTriangle, CheckCircle2, Lock
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getReputationHistory } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { api } from '@/lib/api';

export default function ReputationHistoryPage() {
  const { org, user } = useAuth();
  const [liveRepScore, setLiveRepScore] = useState<number | null>(null);
  const [liveEvents, setLiveEvents] = useState<any[] | null>(null);

  useEffect(() => {
    if (!org) return;
    let isMounted = true;
    async function fetchRepData() {
      try {
        const [repRes, eventsRes] = await Promise.all([
          api.orgs.getReputation(org!.id).catch(() => null),
          api.orgs.getReputationEvents(org!.id).catch(() => null),
        ]);
        if (isMounted) {
          if (repRes) setLiveRepScore(repRes.reputationScore);
          if (eventsRes && eventsRes.events) setLiveEvents(eventsRes.events);
        }
      } catch {
        // Fallback
      }
    }
    fetchRepData();
    return () => { isMounted = false; };
  }, [org]);

  if (!org || !user) return null;

  const currentScore = liveRepScore !== null ? liveRepScore : org.reputationScore;
  const history = liveEvents || getReputationHistory(org.id);
  const repDelta = currentScore - 50;

  return (
    <div className="min-h-screen bg-[#070708] text-white p-6 md:p-8 max-w-7xl mx-auto space-y-8 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tight">
            Reputation & Trust Ledger
          </h1>
          <p className="text-xs font-mono text-[#8E8E9A] mt-1">
            Dynamic cryptographic scoring calculated via peer validation consensus on Hyperledger Fabric.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#121218] border border-[#1E1E26] text-[#A1A1AA]">
            Node: <strong className="text-white">{org.name}</strong>
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Score */}
        <div className="p-5 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] shadow-xl space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold block">
            Current Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-[#C6F432]">
              {currentScore}
            </span>
            <span className="text-xs font-mono text-[#52525B]">/ 100</span>
          </div>
          <p className="text-xs font-mono text-[#8E8E9A]">
            {currentScore >= 50 ? 'Status: Active Contributor' : 'Status: Restricted'}
          </p>
        </div>

        {/* Initial Benchmark */}
        <div className="p-5 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] shadow-xl space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold block">
            Genesis Baseline
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-white">50</span>
            <span className="text-xs font-mono text-[#52525B]">pts</span>
          </div>
          <p className="text-xs font-mono text-[#71717A]">Initial peer allocation</p>
        </div>

        {/* Net Delta */}
        <div className="p-5 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] shadow-xl space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold block">
            Consensus Net Delta
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-mono font-bold ${repDelta >= 0 ? 'text-[#C6F432]' : 'text-rose-400'}`}>
              {repDelta > 0 ? `+${repDelta}` : repDelta}
            </span>
            <span className="text-xs font-mono text-[#52525B]">pts</span>
          </div>
          <p className="text-xs font-mono text-[#71717A]">{history.length} recorded events</p>
        </div>

        {/* Quarantine Threshold */}
        <div className="p-5 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] shadow-xl space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold block">
            Quarantine Threshold
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-amber-400">30</span>
            <span className="text-xs font-mono text-[#52525B]">min</span>
          </div>
          <p className="text-xs font-mono text-amber-400/80">Lockout below 30</p>
        </div>
      </div>

      {/* Rules Protocol Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-5 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] space-y-2">
          <div className="flex items-center gap-2 text-[#C6F432]">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider text-[11px]">+1 Consensus Endorsement</span>
          </div>
          <p className="text-[#8E8E9A] text-[11px] leading-relaxed">
            Awarded when 2+ independent consortium peers validate and verify an indicator submission.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] space-y-2">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider text-[11px]">-3 False Submission</span>
          </div>
          <p className="text-[#8E8E9A] text-[11px] leading-relaxed">
            Deducted if peer review proves false positives, malicious payload tampering, or Sybil spam.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Lock className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider text-[11px]">Quarantine Boundary (&lt; 30)</span>
          </div>
          <p className="text-[#8E8E9A] text-[11px] leading-relaxed">
            Participants with score &lt; 30 are automatically prevented from broadcasting new IoCs to the ledger.
          </p>
        </div>
      </div>

      {/* Timeline of Ledger Events */}
      <div className="p-6 rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              Reputation Mutation Events
            </h2>
            <p className="text-xs font-mono text-[#8E8E9A]">On-chain audit events affecting {org.name}&apos;s trust score.</p>
          </div>
          <span className="text-xs font-mono text-[#52525B]">{history.length} Total</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-[#52525B] font-mono text-xs">
            No score mutation events recorded yet. Score is stable at baseline 50.
          </div>
        ) : (
          <div className="divide-y divide-[#14141B]">
            {history.map((event) => {
              const isPositive = event.scoreDelta > 0;
              return (
                <div key={event.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                        isPositive
                          ? 'bg-emerald-950/40 text-[#C6F432] border-[#C6F432]/30'
                          : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-white">
                          {event.eventType === 'valid_submission'
                            ? 'Verified Indicator Contribution'
                            : 'Consensus Rejection Penalty'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isPositive
                              ? 'bg-[#C6F432]/10 text-[#C6F432] border-[#C6F432]/30'
                              : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                          }`}
                        >
                          {isPositive ? `+${event.scoreDelta}` : event.scoreDelta}
                        </span>
                      </div>

                      {event.relatedIocValue && (
                        <div className="text-xs text-[#8E8E9A] flex items-center gap-2">
                          <span>Target:</span>
                          {event.relatedIocId ? (
                            <Link
                              href={`/threats/${event.relatedIocId}`}
                              className="text-white hover:text-[#C6F432] underline"
                            >
                              {event.relatedIocValue}
                            </Link>
                          ) : (
                            <span className="text-white">{event.relatedIocValue}</span>
                          )}
                        </div>
                      )}

                      {event.blockchainTxId && (
                        <span className="text-[10px] text-[#52525B] block">
                          Tx: {event.blockchainTxId.substring(0, 16)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right pl-13 sm:pl-0 flex-shrink-0">
                    <div className="text-xs">
                      <span className="text-[#52525B]">{event.previousScore}</span>
                      <span className="text-[#71717A] mx-2">→</span>
                      <span className={`font-bold ${isPositive ? 'text-[#C6F432]' : 'text-rose-400'}`}>
                        {event.newScore}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#52525B] mt-1 block">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
