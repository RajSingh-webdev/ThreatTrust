'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Shield, Award,
  AlertTriangle, CheckCircle2, History, ExternalLink,
  Lock, ArrowRight, Activity
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getReputationHistory, ORGANIZATIONS, ORGS_LIST } from '@/lib/mock-data';
import { formatDate, reputationColor, shortTxId } from '@/lib/utils';
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Reputation & Trust Ledger
            </h1>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium px-2.5 py-0.5 rounded-full">
              {org.name} Node Score
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Tamper-proof on-chain reputation history based on peer-verified threat contributions
          </p>
        </div>
      </div>

      {/* KPI & Rule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Current Score */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Current Score</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold ${reputationColor(currentScore)}`}>
              {currentScore}
            </span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {currentScore >= 50 ? 'Standing: Good / Trusted' : 'Standing: Monitored'}
          </p>
        </div>

        {/* Starting Benchmark */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Initial Score</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-gray-300">50</span>
            <span className="text-xs text-gray-500">baseline</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Standard genesis allocation</p>
        </div>

        {/* Net Delta */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Net Adjustment</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold ${repDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {repDelta > 0 ? `+${repDelta}` : repDelta}
            </span>
            <span className="text-xs text-gray-500">pts</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Across {history.length} recorded ledger events
          </p>
        </div>

        {/* Suspension Threshold */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Safety Threshold</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-amber-400">30</span>
            <span className="text-xs text-gray-500">min</span>
          </div>
          <p className="mt-2 text-xs text-red-400 font-medium">
            Submission locked below 30
          </p>
        </div>
      </div>

      {/* Visual Reputation Scale Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-300">Reputation Spectrum & Health</span>
          <span className="font-mono text-gray-400">
            Score: <strong className={reputationColor(currentScore)}>{currentScore}</strong>
          </span>
        </div>

        {/* Progress Bar with markers */}
        <div className="relative w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          {/* Restricted zone (0-30) */}
          <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-red-950/60 border-r border-red-500/50" />
          {/* Active Bar */}
          <div
            className={`h-full rounded-full transition-all ${
              currentScore >= 50 ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
          <span className="text-red-400 font-semibold">0 (Revoked)</span>
          <span className="text-amber-400 font-semibold">30 (Submission Lock Limit)</span>
          <span className="text-gray-400">50 (Genesis Baseline)</span>
          <span className="text-emerald-400 font-semibold">100 (Max)</span>
        </div>
      </div>

      {/* Protocol Scoring Logic Rules Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" /> Reputation Protocol Rules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/60 space-y-1">
            <span className="text-emerald-400 font-bold text-sm block">+1 Reputation Point</span>
            <p className="text-gray-300 font-medium">Peer-Verified Submission</p>
            <p className="text-gray-500 text-[11px]">
              Awarded automatically only after 2 independent non-submitting peers corroborate and endorse the IoC.
            </p>
          </div>

          <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/60 space-y-1">
            <span className="text-red-400 font-bold text-sm block">−3 Reputation Points</span>
            <p className="text-gray-300 font-medium">Confirmed False Positive / Bad Intel</p>
            <p className="text-gray-500 text-[11px]">
              Deducted when peers verify that a submitted indicator is benign (e.g. public CDN, legitimate DNS).
            </p>
          </div>

          <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/60 space-y-1">
            <span className="text-amber-400 font-bold text-sm block">&lt; 30 Threshold Lock</span>
            <p className="text-gray-300 font-medium">Submission Restriction</p>
            <p className="text-gray-500 text-[11px]">
              Organizations with score &lt; 30 are restricted from submitting new IoCs until consensus review recovers trust.
            </p>
          </div>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Cryptographic Reputation Ledger</h2>
            <p className="text-xs text-gray-500">Chronological score mutation events for {org.name}</p>
          </div>
          <span className="text-xs text-gray-400 font-mono">{history.length} events recorded</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            No score adjustment events recorded for {org.name} yet. Current score remains at genesis baseline 50.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {history.map((event) => {
              const isPositive = event.scoreDelta > 0;
              return (
                <div key={event.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {event.eventType === 'valid_submission'
                            ? 'Verified Threat Contribution'
                            : 'False Submission Penalty'}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.2 rounded ${
                            isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {isPositive ? `+${event.scoreDelta}` : event.scoreDelta}
                        </span>
                      </div>

                      {event.relatedIocValue && (
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <span>Associated Indicator:</span>
                          {event.relatedIocId ? (
                            <Link
                              href={`/threats/${event.relatedIocId}`}
                              className="text-blue-400 hover:underline font-mono"
                            >
                              {event.relatedIocValue}
                            </Link>
                          ) : (
                            <span className="font-mono">{event.relatedIocValue}</span>
                          )}
                        </div>
                      )}

                      {event.blockchainTxId && (
                        <p className="text-[11px] text-gray-500 font-mono">
                          Tx Hash: <span className="text-gray-400">{event.blockchainTxId}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Score Transition */}
                  <div className="sm:text-right flex-shrink-0 pl-12 sm:pl-0">
                    <div className="text-xs font-mono">
                      <span className="text-gray-400">{event.previousScore}</span>
                      <span className="text-gray-600 mx-1.5">→</span>
                      <span className={`font-bold ${reputationColor(event.newScore)}`}>
                        {event.newScore}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-0.5 block">
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
