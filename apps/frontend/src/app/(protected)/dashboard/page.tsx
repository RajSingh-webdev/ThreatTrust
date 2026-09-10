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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Threat Intelligence Node
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">MSP: {org.fabricMspId}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {org.name} Operations Center
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Logged in as <span className="text-slate-800 font-medium">{user.username}</span> ({user.role}) · Node status: <span className="text-emerald-700 font-semibold">Synchronized</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/submit"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Submit IoC
          </Link>
          <Link
            href="/endorse"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-3.5 py-2 rounded-md border border-slate-300 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
            Review ({pendingForMe.length})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Reputation */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reputation Score</span>
            <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${reputationColor(currentRep)}`}>
              {currentRep}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {repDelta > 0 ? (
              <span className="text-emerald-700 flex items-center font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{repDelta}
              </span>
            ) : repDelta < 0 ? (
              <span className="text-red-700 flex items-center font-medium">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {repDelta}
              </span>
            ) : (
              <span className="text-slate-500 font-medium">±0</span>
            )}
            <span className="text-slate-400">from initial 50</span>
          </div>
        </div>

        {/* Card 2: Total Submissions */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</span>
            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center">
              <Send className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">
              {allSubmissions.length}
            </span>
            <span className="text-xs text-slate-400">indicators</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {myPending.length} pending · {myRejected.length} rejected
          </p>
        </div>

        {/* Card 3: Verified Threats */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Threats</span>
            <div className="w-7 h-7 rounded bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-700">
              {myVerified.length}
            </span>
            <span className="text-xs text-slate-400">peer-validated</span>
          </div>
          <p className="mt-1.5 text-xs text-emerald-700 font-medium">
            +{myVerified.length} rep awarded (+1 each)
          </p>
        </div>

        {/* Card 4: Pending Endorsements Required */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Your Review</span>
            <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-700">
              {pendingForMe.length}
            </span>
            <span className="text-xs text-slate-400">peer IoCs</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Independent review required (2/2)
          </p>
        </div>
      </div>

      {/* Main Content Grid: Left (Recent Submissions) & Right (Quick Actions + Network Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Submissions Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent Organization Submissions</h2>
                <p className="text-xs text-slate-500">Indicators submitted by {org.name}</p>
              </div>
              <Link
                href="/threats"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View threat feed <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No submissions yet from {org.name}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Indicator Value</th>
                      <th className="px-4 py-2.5 text-center">Consensus</th>
                      <th className="px-4 py-2.5 text-right">Age</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSubmissions.map((ioc) => {
                      const endorseCount = (ioc.endorsements || []).filter((e: any) => e.decision === 'endorse').length || getEndorseCount(ioc.id);
                      return (
                        <tr
                          key={ioc.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={ioc.status} size="sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-semibold uppercase text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {ioc.iocType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                            {maskIocValue(ioc.normalizedValue, ioc.iocType)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`font-medium ${endorseCount >= 2 ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {endorseCount}/2
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                            {timeAgo(ioc.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Link
                              href={`/threats/${ioc.id}`}
                              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                            >
                              Details <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Protocol Lifecycle Guide */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              ThreatTrust Protocol Lifecycle
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md">
                <span className="font-semibold text-blue-700 block mb-1">1. Submit & Normalize</span>
                <span className="text-slate-600">Submitter normalizes IoC and checks for on-chain deduplication.</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md">
                <span className="font-semibold text-amber-700 block mb-1">2. Peer Review</span>
                <span className="text-slate-600">2 independent external organizations review evidence & endorse.</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md">
                <span className="font-semibold text-emerald-700 block mb-1">3. Auto-Verification</span>
                <span className="text-slate-600">At 2/2 threshold, threat becomes Verified across all nodes.</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md">
                <span className="font-semibold text-purple-700 block mb-1">4. Reputation Update</span>
                <span className="text-slate-600">Submitter receives +1 rep (or -3 if confirmed false report).</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Operations & Network Status */}
        <div className="space-y-6">
          {/* Quick Operations */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Quick Operations
            </h3>
            <Link
              href="/submit"
              className="flex items-center justify-between p-3 rounded-md border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700">Submit New IoC</p>
                  <p className="text-[11px] text-slate-500">Share indicator with network</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              href="/endorse"
              className="flex items-center justify-between p-3 rounded-md border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center text-amber-600">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-amber-700">Review Pending ({pendingForMe.length})</p>
                  <p className="text-[11px] text-slate-500">Endorse peer threats</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              href="/threats"
              className="flex items-center justify-between p-3 rounded-md border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Radio className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700">Threat Feed</p>
                  <p className="text-[11px] text-slate-500">Browse all {liveIocs ? liveIocs.length : IOCS_LIST.length} indicators</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </Link>
          </div>

          {/* Network Consortium Nodes */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Network Consortium Nodes
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                Fabric: cti-channel
              </span>
            </div>

            <div className="space-y-2.5">
              {(liveOrgs || ORGS_LIST).map((peer) => {
                const isCurrent = peer.id === org.id || peer.name === org.name;
                return (
                  <div
                    key={peer.id}
                    className={`p-3 rounded-md border ${
                      isCurrent
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold text-slate-900">
                          {peer.name} {isCurrent && <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1 py-0.2 rounded border border-blue-200">(You)</span>}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${reputationColor(peer.reputationScore)}`}>
                          {peer.reputationScore}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">rep</span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{ORG_TYPE_LABELS[peer.orgType]}</span>
                      <span className="font-mono text-[10px] text-slate-400">{peer.fabricMspId}</span>
                    </div>
                    {/* Score Bar */}
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          peer.reputationScore >= 50 ? 'bg-emerald-600' : 'bg-amber-500'
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
