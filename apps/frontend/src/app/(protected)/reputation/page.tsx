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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Reputation & Trust Ledger
            </h1>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2.5 py-0.5 rounded-full">
              {org.name} Node Score
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Tamper-proof on-chain reputation history based on peer-verified threat contributions
          </p>
        </div>
      </div>

      {/* KPI & Rule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current Score */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Current Score</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-extrabold ${reputationColor(currentScore)}`}>
              {currentScore}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            {currentScore >= 50 ? 'Standing: Good / Trusted' : 'Standing: Monitored'}
          </p>
        </div>

        {/* Starting Benchmark */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Initial Score</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">50</span>
            <span className="text-xs text-slate-400 font-medium">baseline</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Standard genesis allocation</p>
        </div>

        {/* Net Delta */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Net Adjustment</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-extrabold ${repDelta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {repDelta > 0 ? `+${repDelta}` : repDelta}
            </span>
            <span className="text-xs text-slate-400 font-medium">pts</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Across {history.length} recorded ledger events
          </p>
        </div>

        {/* Suspension Threshold */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Safety Threshold</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-700">30</span>
            <span className="text-xs text-slate-400 font-medium">min</span>
          </div>
          <p className="mt-2 text-xs text-red-600 font-medium">
            Submission locked below 30
          </p>
        </div>
      </div>

      {/* Visual Reputation Scale Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900 text-sm">Reputation Spectrum & Health</span>
          <span className="font-mono text-slate-500">
            Score: <strong className={reputationColor(currentScore)}>{currentScore}</strong>
          </span>
        </div>

        {/* Progress Bar with markers */}
        <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
          {/* Restricted zone (0-30) */}
          <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-red-100/80 border-r border-red-300" />
          {/* Active Bar */}
          <div
            className={`h-full rounded-full transition-all ${
              currentScore >= 50 ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span className="text-red-700 font-semibold">0 (Revoked)</span>
          <span className="text-amber-800 font-semibold">30 (Submission Lock Limit)</span>
          <span className="text-slate-600 font-medium">50 (Genesis Baseline)</span>
          <span className="text-emerald-700 font-semibold">100 (Max)</span>
        </div>
      </div>

      {/* Protocol Scoring Logic Rules Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" /> Reputation Protocol Rules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <span className="text-emerald-700 font-bold text-sm block">+1 Reputation Point</span>
            <p className="text-slate-800 font-semibold">Peer-Verified Submission</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Awarded automatically only after 2 independent non-submitting peers corroborate and endorse the IoC.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <span className="text-red-700 font-bold text-sm block">−3 Reputation Points</span>
            <p className="text-slate-800 font-semibold">Confirmed False Positive / Bad Intel</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Deducted when peers verify that a submitted indicator is benign (e.g. public CDN, legitimate DNS).
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <span className="text-amber-800 font-bold text-sm block">&lt; 30 Threshold Lock</span>
            <p className="text-slate-800 font-semibold">Submission Restriction</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Organizations with score &lt; 30 are restricted from submitting new IoCs until consensus review recovers trust.
            </p>
          </div>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cryptographic Reputation Ledger</h2>
            <p className="text-xs text-slate-500">Chronological score mutation events for {org.name}</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{history.length} events recorded</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No score adjustment events recorded for {org.name} yet. Current score remains at genesis baseline 50.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((event) => {
              const isPositive = event.scoreDelta > 0;
              return (
                <div key={event.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {event.eventType === 'valid_submission'
                            ? 'Verified Threat Contribution'
                            : 'False Submission Penalty'}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
                          }`}
                        >
                          {isPositive ? `+${event.scoreDelta}` : event.scoreDelta}
                        </span>
                      </div>

                      {event.relatedIocValue && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span>Associated Indicator:</span>
                          {event.relatedIocId ? (
                            <Link
                              href={`/threats/${event.relatedIocId}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
                            >
                              {event.relatedIocValue}
                            </Link>
                          ) : (
                            <span className="font-mono text-slate-800">{event.relatedIocValue}</span>
                          )}
                        </div>
                      )}

                      {event.blockchainTxId && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          Tx Hash: <span className="text-slate-600">{event.blockchainTxId}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Score Transition */}
                  <div className="sm:text-right flex-shrink-0 pl-12 sm:pl-0">
                    <div className="text-xs font-mono">
                      <span className="text-slate-400">{event.previousScore}</span>
                      <span className="text-slate-300 mx-1.5">→</span>
                      <span className={`font-bold ${reputationColor(event.newScore)}`}>
                        {event.newScore}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
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
