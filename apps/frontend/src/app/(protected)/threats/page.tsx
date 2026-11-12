'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Filter, ArrowRight, Shield, Radio, CheckCircle2 } from 'lucide-react';
import { IOCS_LIST, getEndorseCount } from '@/lib/mock-data';
import { timeAgo, maskIocValue, IOC_TYPE_LABELS } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { IocStatus, IocType } from '@/lib/types';

export default function ThreatFeedPage() {
  const { org } = useAuth();

  const [liveIocs, setLiveIocs] = useState<any[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [liveOrgs, setLiveOrgs] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveFeed() {
      try {
        const res = await api.iocs.getAll({
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          iocType: selectedType !== 'all' ? selectedType : undefined,
          contributorOrgId: selectedOrg !== 'all' ? selectedOrg : undefined,
          search: searchTerm || undefined,
        });
        if (isMounted && res.iocs) {
          setLiveIocs(res.iocs);
        }
      } catch {
        // Fallback
      }
    }
    fetchLiveFeed();
    return () => { isMounted = false; };
  }, [searchTerm, selectedStatus, selectedType, selectedOrg]);

  useEffect(() => {
    let isMounted = true;
    api.orgs.getAll().then((res) => {
      if (isMounted && res.organizations) {
        setLiveOrgs(res.organizations);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const allIocs = liveIocs || IOCS_LIST;

  return (
    <div className="min-h-screen bg-[#070708] text-white p-6 max-w-7xl mx-auto space-y-8 antialiased selection:bg-[#C6F432] selection:text-[#070708]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C22] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 px-3 py-1 rounded-full border border-[#C6F432]/25">
            CONSORTIUM THREAT REPOSITORY
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2.5">
            Decentralized Threat Feed
          </h1>
          <p className="text-xs text-[#8E8E9A] mt-1 font-normal">
            Real-time feed of multi-party corroborated indicators anchored on the Hyperledger Fabric ledger.
          </p>
        </div>

        <Link
          href="/submit"
          className="inline-flex items-center gap-2 bg-[#C6F432] hover:bg-[#b2e026] text-[#070708] text-xs font-bold px-6 py-3 rounded-full transition-transform hover:scale-[1.02]"
        >
          Submit Indicator
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-[#0B0B0E] border border-[#1C1C22]">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search indicator value, CIDR, hash, or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121216] border border-[#1E1E26] text-xs font-mono text-white placeholder-[#52525E] focus:border-[#C6F432] focus:outline-none"
          />
        </div>

        <div className="md:col-span-7 flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#121216] border border-[#1E1E26] text-xs font-mono text-[#A1A1AA] focus:border-[#C6F432] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="pending">Pending Only</option>
            <option value="rejected">Rejected Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#121216] border border-[#1E1E26] text-xs font-mono text-[#A1A1AA] focus:border-[#C6F432] focus:outline-none"
          >
            <option value="all">All Indicator Types</option>
            <option value="ip">IP Address</option>
            <option value="domain">Domain</option>
            <option value="url">URL</option>
            <option value="file_hash">File Hash</option>
          </select>
        </div>
      </div>

      {/* Threat Feed Table */}
      <div className="rounded-3xl bg-[#0B0B0E] border border-[#1C1C22] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#101014] text-[#71717A] uppercase tracking-wider text-[10px] border-b border-[#181820]">
              <tr>
                <th className="px-7 py-4">Status</th>
                <th className="px-7 py-4">Type</th>
                <th className="px-7 py-4">Indicator Value</th>
                <th className="px-7 py-4">Submitter</th>
                <th className="px-7 py-4 text-center">Consensus</th>
                <th className="px-7 py-4 text-right">Age</th>
                <th className="px-7 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#15151B]">
              {allIocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-7 py-14 text-center text-[#5A5A65]">
                    No threat indicators found matching current filters.
                  </td>
                </tr>
              ) : (
                allIocs.map((ioc) => {
                  const endorseCount =
                    (ioc.endorsements || []).filter((e: any) => e.decision === 'endorse').length ||
                    getEndorseCount(ioc.id);
                  const isVerified = ioc.status === 'verified';

                  return (
                    <tr
                      key={ioc.id}
                      className="hover:bg-[#121217] transition-colors group"
                    >
                      <td className="px-7 py-4.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                            isVerified
                              ? 'bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30'
                              : ioc.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          }`}
                        >
                          {ioc.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-7 py-4.5 whitespace-nowrap">
                        <span className="font-bold uppercase text-[10px] px-2.5 py-0.5 rounded bg-[#16161B] text-[#A1A1AA] border border-[#24242C]">
                          {ioc.iocType}
                        </span>
                      </td>
                      <td className="px-7 py-4.5 text-white font-mono whitespace-nowrap font-medium">
                        {maskIocValue(ioc.normalizedValue, ioc.iocType)}
                      </td>
                      <td className="px-7 py-4.5 text-[#8E8E9A] whitespace-nowrap">
                        {ioc.contributorOrg?.name || 'BankA'}
                      </td>
                      <td className="px-7 py-4.5 text-center whitespace-nowrap">
                        <span className={isVerified ? 'text-[#C6F432] font-bold' : 'text-[#8E8E9A]'}>
                          {endorseCount}/2
                        </span>
                      </td>
                      <td className="px-7 py-4.5 text-right text-[#71717A] whitespace-nowrap">
                        {timeAgo(ioc.createdAt)}
                      </td>
                      <td className="px-7 py-4.5 text-right whitespace-nowrap">
                        <Link
                          href={`/threats/${ioc.id}`}
                          className="text-[#C6F432] hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          Details <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
