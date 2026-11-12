'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Send, CheckSquare, ArrowRight,
  Shield, Activity, Lock, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getOrgStats, ORGS_LIST, getEndorseCount } from '@/lib/mock-data';
import { timeAgo, maskIocValue } from '@/lib/utils';
import { api } from '@/lib/api';
import RotatingGlobe from '@/components/rotating-globe';

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
        // Fallback
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [org]);

  if (!org || !user) return null;

  const currentRep = liveReputation !== null ? liveReputation : org.reputationScore;
  const stats = getOrgStats(org.id);
  const repDelta = currentRep - 50;

  const allSubmissions = liveIocs
    ? liveIocs.filter((i) => (i.contributorOrgId || i.contributorOrg?.id) === org.id || i.contributorOrg?.name === org.name)
    : stats.submitted;
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

  const recentSubmissions = allSubmissions.slice(0, 8);
  const networkPeers = liveOrgs || ORGS_LIST;

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      {/* ─── 1. ETHENA HERO STAGE ─── */}
      <section className="relative px-6 md:px-12 pt-0 pb-12 max-w-[1500px] mx-auto">
        {/* Luminous Glow behind the Globe */}
        <div className="absolute top-1/4 right-4 w-[650px] h-[650px] bg-[#C6F432]/5 blur-[150px] pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10 pt-2">
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-6 pt-0">
            <div className="space-y-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[#C6F432] font-bold">
                CONSORTIUM OPERATIONAL CORE
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                Digital Immunity for the Banking Economy
              </h1>
              <p className="text-[#8E8E9A] text-base md:text-lg leading-relaxed max-w-xl font-normal">
                Multi-party threat verification for enterprise banking SOCs. Propose indicators from <strong className="text-white">{org.name}</strong>, achieve 2/2 Byzantine consensus, and verify state integrity with zero trust assumptions.
              </p>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 bg-[#C6F432] hover:bg-[#b2e026] text-[#070708] text-xs font-bold font-mono px-7 py-4 rounded-full transition-all shadow-xl shadow-[#C6F432]/15"
              >
                <Send className="w-3.5 h-3.5 fill-current" />
                Submit New Indicator
              </Link>

              <Link
                href="/endorse"
                className="inline-flex items-center gap-2 bg-[#121216] hover:bg-[#1C1C24] text-white text-xs font-bold font-mono px-7 py-4 rounded-full border border-[#22222C] hover:border-[#383846] transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#C6F432]" />
                Review Peer Queue ({pendingForMe.length})
              </Link>
            </div>
          </div>

          {/* Right 3D Rotating Sphere (Expanded to 6 columns) */}
          <div className="lg:col-span-6 flex justify-center items-center relative overflow-visible">
            <RotatingGlobe />
          </div>
        </div>
      </section>

      {/* ─── 2. ETHENA HORIZONTAL METRICS TICKER ROW ─── */}
      <section className="border-y border-[#141418] bg-[#0A0A0D]">
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1">
            <div className="text-3xl md:text-5xl font-mono font-extrabold text-[#C6F432] tracking-tight">
              {currentRep} <span className="text-xs text-[#52525B] font-normal">/ 100</span>
            </div>
            <p className="text-xs uppercase tracking-wider font-mono text-[#71717A] font-bold">Node Trust Score</p>
            <span className="text-[11px] font-mono text-[#52525B]">
              {repDelta >= 0 ? `+${repDelta}` : repDelta} delta from baseline
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-3xl md:text-5xl font-mono font-extrabold text-white tracking-tight">
              {allSubmissions.length}
            </div>
            <p className="text-xs uppercase tracking-wider font-mono text-[#71717A] font-bold">Indicators Proposed</p>
            <span className="text-[11px] font-mono text-[#52525B]">
              {allSubmissions.filter((i) => i.status === 'pending').length} pending review
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-3xl md:text-5xl font-mono font-extrabold text-white tracking-tight">
              {allSubmissions.filter((i) => i.status === 'verified').length}
            </div>
            <p className="text-xs uppercase tracking-wider font-mono text-[#71717A] font-bold">Consensus Verified</p>
            <span className="text-[11px] font-mono text-[#C6F432]">
              2/2 Byzantine quorum
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-3xl md:text-5xl font-mono font-extrabold text-[#C6F432] tracking-tight">
              100%
            </div>
            <p className="text-xs uppercase tracking-wider font-mono text-[#71717A] font-bold">Liveness Quorum</p>
            <span className="text-[11px] font-mono text-[#52525B]">
              3/3 Fabric peers online
            </span>
          </div>
        </div>
      </section>

      {/* ─── 3. ONBOARDING & ARCHITECTURE (ETHENA THREE-COLUMN SECTION) ─── */}
      <section className="px-6 md:px-16 py-20 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 px-3.5 py-1 rounded-full border border-[#C6F432]/25 font-bold">
            PROTOCOL ARCHITECTURE
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Institutional Threat Protocols
          </h2>
          <p className="text-xs font-mono text-[#8E8E9A] max-w-xl mx-auto">
            Channel: cti-channel · Chaincode: threattrust_cc · Zero Trust Security Model
          </p>
        </div>

        {/* 3 Large Ethena Columns with Wireframe Grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="relative rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] p-8 space-y-6 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-[0.035] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-[#14141A] text-[#A1A1AA] border border-[#22222C] font-bold">
                IMMUTABILITY
              </span>
              <h3 className="text-xl font-mono font-bold text-white">SHA-256 State Anchoring</h3>
              <p className="text-xs text-[#8E8E9A] leading-relaxed">
                Deterministic state hash commitment computed over canonical indicator telemetry. Any tampering with relational database records is immediately detected by the on-chain root of trust.
              </p>
              <div className="pt-4 border-t border-[#1C1C24]">
                <Link
                  href="/audit"
                  className="inline-flex items-center gap-2 text-xs font-mono text-[#C6F432] hover:underline"
                >
                  Verify Cryptographic Audit <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="relative rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] p-8 space-y-6 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-[0.035] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-[#14141A] text-[#A1A1AA] border border-[#22222C] font-bold">
                ANTI-SYBIL LOCK
              </span>
              <h3 className="text-xl font-mono font-bold text-white">Multi-Peer Consensus</h3>
              <p className="text-xs text-[#8E8E9A] leading-relaxed">
                Organizations are cryptographically prevented from self-endorsing. Two distinct, non-submitting banking institutions must validate threat telemetry before it transitions to verified status.
              </p>
              <div className="pt-4 border-t border-[#1C1C24]">
                <Link
                  href="/endorse"
                  className="inline-flex items-center gap-2 text-xs font-mono text-[#C6F432] hover:underline"
                >
                  Inspect Endorsement Queue <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="relative rounded-2xl bg-[#0B0B0E] border border-[#1C1C24] p-8 space-y-6 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-[0.035] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-[#14141A] text-[#A1A1AA] border border-[#22222C] font-bold">
                DYNAMIC INVARIANT
              </span>
              <h3 className="text-xl font-mono font-bold text-white">Quality Invariant Scoring</h3>
              <p className="text-xs text-[#8E8E9A] leading-relaxed">
                Smart contract automated rewards: submitters receive +1 rep for verified threats and take a -3 penalty for false positives. Nodes below 30 reputation are automatically frozen.
              </p>
              <div className="pt-4 border-t border-[#1C1C24]">
                <Link
                  href="/reputation"
                  className="inline-flex items-center gap-2 text-xs font-mono text-[#C6F432] hover:underline"
                >
                  View Reputation Standings <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. CONSORTIUM DATA LEDGER & PARTICIPANTS TABLE ─── */}
      <section className="px-6 md:px-16 py-16 max-w-7xl mx-auto space-y-8 border-t border-[#141418]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-mono tracking-tight text-white">
              Recent Consortium Submissions
            </h2>
            <p className="text-xs font-mono text-[#8E8E9A] mt-1">
              Anchored to Hyperledger Fabric cti-channel with 2/2 consensus quorum.
            </p>
          </div>
          <Link
            href="/threats"
            className="text-xs font-mono text-[#C6F432] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            Explore All Indicators <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#1C1C24] overflow-hidden bg-[#0B0B0E]">
          {recentSubmissions.length === 0 ? (
            <div className="text-center py-16 text-[#52525B] font-mono text-xs">
              No threat indicators submitted yet from {org.name}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#101014] text-[#71717A] uppercase tracking-wider text-[10px] border-b border-[#181820]">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Indicator Value</th>
                    <th className="px-6 py-4 text-center">Consensus Quorum</th>
                    <th className="px-6 py-4 text-right">Age</th>
                    <th className="px-6 py-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#15151B]">
                  {recentSubmissions.map((ioc) => {
                    const endorseCount =
                      (ioc.endorsements || []).filter((e: any) => e.decision === 'endorse').length ||
                      getEndorseCount(ioc.id);
                    return (
                      <tr key={ioc.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 px-2.5 py-0.5 rounded-full">
                            VERIFIED
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold uppercase text-[10px] px-2.5 py-0.5 rounded bg-[#14141A] text-[#A1A1AA] border border-[#22222C]">
                            {ioc.iocType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white whitespace-nowrap font-medium">
                          {maskIocValue(ioc.normalizedValue, ioc.iocType)}
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap text-[#C6F432] font-bold">
                          {endorseCount}/2
                        </td>
                        <td className="px-6 py-4 text-right text-[#71717A] whitespace-nowrap">
                          {timeAgo(ioc.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Link
                            href={`/threats/${ioc.id}`}
                            className="text-[#C6F432] hover:text-white transition-colors"
                          >
                            Details →
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
      </section>

      {/* ─── 5. CONSORTIUM PARTICIPANTS ─── */}
      <section className="px-6 md:px-16 py-12 max-w-7xl mx-auto space-y-6 border-t border-[#141418]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
            Consortium Participants
          </h2>
          <span className="text-xs font-mono text-[#C6F432]">
            3 Active Peers in Consensus
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {networkPeers.map((peer) => {
            const isCurrent = peer.id === org.id || peer.name === org.name;
            return (
              <div
                key={peer.id}
                className={`p-5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-[#101014] border-[#C6F432]/40 shadow-lg shadow-[#C6F432]/5'
                    : 'bg-[#0B0B0E] border-[#1C1C24]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-[#C6F432]' : 'bg-[#3A3A45]'}`} />
                    <span className="font-bold text-white text-sm">{peer.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] bg-[#C6F432] text-black font-extrabold px-1.5 py-0.2 rounded-full">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[#C6F432] text-sm">{peer.reputationScore} REP</span>
                </div>
                <div className="mt-2 text-[10px] text-[#71717A] flex items-center justify-between">
                  <span>{ORG_TYPE_LABELS[peer.orgType] ?? peer.orgType}</span>
                  <span>{peer.fabricMspId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
