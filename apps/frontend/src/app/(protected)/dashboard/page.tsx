'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Shield, Send, CheckSquare,
  Radio, ArrowRight, Clock, AlertTriangle, CheckCircle2,
  Building2, Users, Activity, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getOrgStats, ORGANIZATIONS, ORGS_LIST, IOCS_LIST, getEndorseCount } from '@/lib/mock-data';
import { timeAgo, reputationColor, IOC_TYPE_LABELS, maskIocValue } from '@/lib/utils';
import StatusBadge from '@/components/status-badge';
import { api } from '@/lib/api';

const ORG_TYPE_LABELS: Record<string, string> = {
  bank: 'Commercial Bank',
  cert: 'National CERT / CSIRT',
  enterprise_soc: 'Enterprise SOC',
};

export default function DashboardPage() {
  const { org, user } = useAuth();
  const [liveReputation, setLiveReputation] = useState<number | null>(null);
  const [liveIocs, setLiveIocs] = useState<any[] | null>(null);
  const [liveOrgs, setLiveOrgs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org) return;
    let isMounted = true;

    async function loadData() {
      try {
        const [repRes, iocRes, orgsRes] = await Promise.all([
          api.orgs.getReputation(org!.id).catch(() => null),
          api.iocs.getAll().catch(() => null),
          api.orgs.getAll().catch(() => null),
        ]);

        if (isMounted) {
          if (repRes) setLiveReputation(repRes.reputationScore);
          if (iocRes && iocRes.iocs) setLiveIocs(iocRes.iocs);
          if (orgsRes && orgsRes.organizations) setLiveOrgs(orgsRes.organizations);
        }
      } catch {
        // Fallback to local store
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [org]);

  if (!org || !user) return null;

  const currentRep = liveReputation !== null ? liveReputation : org.reputationScore;
  const stats = getOrgStats(org.id);
  const repDelta = currentRep - 50;

  // Real submissions from this org if available
  const allSubmissions = liveIocs
    ? liveIocs.filter((i) => (i.contributorOrgId || i.contributorOrg?.id) === org.id || i.contributorOrg?.name === org.name)
    : stats.submitted;
  const myPending = allSubmissions.filter((i) => i.status === 'pending');
  const myVerified = allSubmissions.filter((i) => i.status === 'verified');
  const myRejected = allSubmissions.filter((i) => i.status === 'rejected');
  const pendingForMe = liveIocs
    ? liveIocs.filter((i) => {
        if (i.status !== 'pending') return false;
        const contribId = i.contributorOrgId || i.contributorOrg?.id;
        const contribName = i.contributorOrg?.name;
        if (contribId === org.id || contribName === org.name) return false;
        const hasReviewed = (i.endorsements || []).some(
          (e: any) => e.organizationId === org.id || e.organization?.name === org.name
        );
        return !hasReviewed;
      })
    : stats.pendingEndorse;
  const recentSubmissions = allSubmissions.slice(0, 5);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Threat Intelligence Node
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-gray-400 font-mono">MSP: {org.fabricMspId}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {org.name} Operations Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Logged in as <span className="text-gray-200 font-medium">{user.username}</span> ({user.role}) · Node status: <span className="text-emerald-400 font-medium">Synchronized</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-colors"
          >
            <Send className="w-4 h-4" />
            Submit IoC
          </Link>
          <Link
            href="/endorse"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-700 transition-colors"
          >
            <CheckSquare className="w-4 h-4 text-amber-400" />
            Review ({pendingForMe.length})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Reputation */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Reputation Score</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${reputationColor(currentRep)}`}>
              {currentRep}
            </span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {repDelta > 0 ? (
              <span className="text-emerald-400 flex items-center font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{repDelta}
              </span>
            ) : repDelta < 0 ? (
              <span className="text-red-400 flex items-center font-medium">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {repDelta}
              </span>
            ) : (
              <span className="text-gray-400 font-medium">±0</span>
            )}
            <span className="text-gray-500">from initial 50</span>
          </div>
        </div>

        {/* Card 2: Total Submissions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {allSubmissions.length}
            </span>
            <span className="text-xs text-gray-500">indicators</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {myPending.length} pending · {myRejected.length} rejected
          </p>
        </div>

        {/* Card 3: Verified Threats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Verified Threats</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">
              {myVerified.length}
            </span>
            <span className="text-xs text-gray-500">peer-validated</span>
          </div>
          <p className="mt-2 text-xs text-emerald-400/80 font-medium">
            +{myVerified.length} rep awarded (+1 each)
          </p>
        </div>

        {/* Card 4: Pending Endorsements Required */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Awaiting Your Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-400">
              {pendingForMe.length}
            </span>
            <span className="text-xs text-gray-500">peer IoCs</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Independent review required (2/2 threshold)
          </p>
        </div>
      </div>

      {/* Main Content Grid: Left (Recent Activity) & Right (Quick Actions + Network Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Submissions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">Recent Organization Submissions</h2>
                <p className="text-xs text-gray-500">Indicators submitted by {org.name}</p>
              </div>
              <Link
                href="/threats"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                View all feed <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No submissions yet from {org.name}.
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {recentSubmissions.map((ioc) => {
                  const endorseCount = (ioc.endorsements || []).filter((e: any) => e.decision === 'endorse').length || getEndorseCount(ioc.id);
                  return (
                    <Link
                      key={ioc.id}
                      href={`/threats/${ioc.id}`}
                      className="py-3.5 flex items-center justify-between hover:bg-gray-800/40 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={ioc.status} size="sm" />
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 uppercase">
                          {ioc.iocType}
                        </span>
                        <span className="text-sm font-mono text-gray-200 truncate group-hover:text-blue-400 transition-colors">
                          {maskIocValue(ioc.normalizedValue, ioc.iocType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 text-xs text-gray-400">
                        <span className="hidden sm:inline">
                          {endorseCount}/2 endorsements
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3" />
                          {timeAgo(ioc.createdAt)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Core Workflow Guide */}
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              ThreatTrust Trust Protocol Lifecycle
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-gray-800/50 border border-gray-800 p-3 rounded-lg">
                <span className="font-bold text-blue-400 block mb-1">1. Submit & Normalize</span>
                <span className="text-gray-400">Submitter normalizes IoC and checks for on-chain deduplication.</span>
              </div>
              <div className="bg-gray-800/50 border border-gray-800 p-3 rounded-lg">
                <span className="font-bold text-amber-400 block mb-1">2. Peer Review</span>
                <span className="text-gray-400">2 independent external organizations review evidence & endorse.</span>
              </div>
              <div className="bg-gray-800/50 border border-gray-800 p-3 rounded-lg">
                <span className="font-bold text-emerald-400 block mb-1">3. Auto-Verification</span>
                <span className="text-gray-400">At 2/2 threshold, threat becomes Verified across all nodes.</span>
              </div>
              <div className="bg-gray-800/50 border border-gray-800 p-3 rounded-lg">
                <span className="font-bold text-purple-400 block mb-1">4. Reputation Update</span>
                <span className="text-gray-400">Submitter receives +1 rep (or -3 if confirmed false report).</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Network Peer Overview */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Quick Operations
            </h3>
            <Link
              href="/submit"
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-blue-300">Submit New IoC</p>
                  <p className="text-xs text-gray-400">Share indicator with network</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </Link>

            <Link
              href="/endorse"
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-amber-500/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-amber-300">Review Pending ({pendingForMe.length})</p>
                  <p className="text-xs text-gray-400">Endorse peer threats</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </Link>

            <Link
              href="/threats"
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-755 border border-gray-700 hover:border-emerald-500/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-emerald-300">Threat Feed</p>
                  <p className="text-xs text-gray-400">Browse all {liveIocs ? liveIocs.length : IOCS_LIST.length} indicators</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </Link>
          </div>

          {/* Network Peer Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Network Consortium Nodes
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                Fabric Channel: cti-channel
              </span>
            </div>

            <div className="space-y-3">
              {(liveOrgs || ORGS_LIST).map((peer) => {
                const isCurrent = peer.id === org.id || peer.name === org.name;
                return (
                  <div
                    key={peer.id}
                    className={`p-3 rounded-lg border ${
                      isCurrent
                        ? 'bg-blue-600/10 border-blue-500/40'
                        : 'bg-gray-800/60 border-gray-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-blue-400' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium text-white">
                          {peer.name} {isCurrent && <span className="text-[10px] text-blue-400 font-semibold">(You)</span>}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${reputationColor(peer.reputationScore)}`}>
                          {peer.reputationScore}
                        </span>
                        <span className="text-[10px] text-gray-500 block">rep</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{ORG_TYPE_LABELS[peer.orgType]}</span>
                      <span className="font-mono text-gray-500">{peer.fabricMspId}</span>
                    </div>
                    {/* Score Bar */}
                    <div className="mt-2 w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          peer.reputationScore >= 50 ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, peer.reputationScore))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
