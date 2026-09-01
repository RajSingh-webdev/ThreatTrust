'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronRight, Shield, RefreshCw, X, Radio, ArrowUpDown } from 'lucide-react';
import { IOCS_LIST, ORGANIZATIONS, getEndorseCount } from '@/lib/mock-data';
import { timeAgo, maskIocValue, IOC_TYPE_LABELS, tlpColor, STATUS_CONFIG } from '@/lib/utils';
import StatusBadge from '@/components/status-badge';
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
        // Fallback to local data
      }
    }
    fetchLiveFeed();
    return () => { isMounted = false; };
  }, [searchTerm, selectedStatus, selectedType, selectedOrg]);

  const [liveOrgs, setLiveOrgs] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.orgs.getAll().then((res) => {
      if (isMounted && res.organizations) {
        setLiveOrgs(res.organizations);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const baseList = liveIocs || IOCS_LIST;

  // Filtered IoCs list
  const filteredIocs = useMemo(() => {
    return baseList.filter((ioc: any) => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase().trim();
        const matchesValue = (ioc.normalizedValue || "").toLowerCase().includes(query) || (ioc.rawValue || "").toLowerCase().includes(query);
        const matchesDesc = (ioc.description || "").toLowerCase().includes(query);
        const matchesId = (ioc.id || "").toLowerCase().includes(query);
        const matchesContributor = (ioc.contributorOrg?.name || "").toLowerCase().includes(query);
        if (!matchesValue && !matchesDesc && !matchesId && !matchesContributor) return false;
      }

      // Status
      if (selectedStatus !== 'all' && ioc.status !== selectedStatus) {
        return false;
      }

      // Type
      if (selectedType !== 'all' && ioc.iocType !== selectedType) {
        return false;
      }

      // Org
      if (selectedOrg !== 'all') {
        const orgId = ioc.contributorOrgId || ioc.contributorOrg?.id;
        const orgName = (ioc.contributorOrg?.name || "").toLowerCase();
        const matchesOrgId = orgId === selectedOrg;
        const matchesOrgName = selectedOrg.toLowerCase().includes(orgName) || orgName.includes(selectedOrg.toLowerCase().replace('org-', ''));
        if (!matchesOrgId && !matchesOrgName) return false;
      }

      return true;
    });
  }, [baseList, searchTerm, selectedStatus, selectedType, selectedOrg]);

  // Unique org options from live data or mock list
  const contributorOrgs = liveOrgs || Object.values(ORGANIZATIONS);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedType('all');
    setSelectedOrg('all');
  };

  const hasActiveFilters = searchTerm !== '' || selectedStatus !== 'all' || selectedType !== 'all' || selectedOrg !== 'all';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Threat Feed</h1>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {filteredIocs.length} of {baseList.length} Indicators
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Global immutable threat intelligence sharing stream across consortium members
          </p>
        </div>
        <Link
          href="/submit"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-colors"
        >
          Submit Indicator
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by indicator value, IP, domain, hash, description, or ID..."
            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-gray-800/60">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-gray-800/60 p-1 rounded-lg border border-gray-700/60 text-xs">
              <span className="text-gray-500 px-2 font-medium">Status:</span>
              {['all', 'verified', 'pending', 'rejected', 'flagged'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* IoC Type Filter */}
            <div className="flex items-center gap-1.5 bg-gray-800/60 p-1 rounded-lg border border-gray-700/60 text-xs">
              <span className="text-gray-500 px-2 font-medium">Type:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'ip', label: 'IP' },
                { key: 'url', label: 'URL' },
                { key: 'domain', label: 'Domain' },
                { key: 'file_hash', label: 'Hash' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedType(t.key)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectedType === t.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contributor Org Filter */}
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Organizations</option>
              {contributorOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.orgType})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors ml-auto"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Threats Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredIocs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-300">No Indicators Match Filter</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query, status, type, or organization filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
            >
              <RefreshCw className="w-3 h-3" /> Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-850/50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-6">Status</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Indicator Value</th>
                  <th className="py-3.5 px-4">Contributor</th>
                  <th className="py-3.5 px-4">TLP</th>
                  <th className="py-3.5 px-4 text-center">Confidence</th>
                  <th className="py-3.5 px-4 text-center">Endorsements</th>
                  <th className="py-3.5 px-4">Observed</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredIocs.map((ioc: any) => {
                  const contributorName = ioc.contributorOrg?.name || ORGANIZATIONS[ioc.contributorOrgId]?.name || ioc.contributorOrgId;
                  const isMine = (ioc.contributorOrgId || ioc.contributorOrg?.id) === org?.id || ioc.contributorOrg?.name === org?.name;
                  const liveEndorsements = ioc.endorsements || [];
                  const validEndorseCount = liveEndorsements.length > 0
                    ? liveEndorsements.filter((e: any) => e.decision === 'endorse').length
                    : getEndorseCount(ioc.id);

                  // Confidence dots representation
                  const renderConfidence = () => {
                    const filled = Math.min(2, ioc.confidenceScore || validEndorseCount);
                    return (
                      <div className="flex items-center justify-center gap-1" title={`${ioc.confidenceScore || validEndorseCount}/2 peer corroboration`}>
                        <span className={`w-2 h-2 rounded-full ${filled >= 1 ? 'bg-emerald-400' : 'bg-gray-700'}`} />
                        <span className={`w-2 h-2 rounded-full ${filled >= 2 ? 'bg-emerald-400' : 'bg-gray-700'}`} />
                      </div>
                    );
                  };

                  return (
                    <tr
                      key={ioc.id}
                      className="hover:bg-gray-850/60 transition-colors group cursor-pointer"
                      onClick={() => {
                        window.location.href = `/threats/${ioc.id}`;
                      }}
                    >
                      {/* Status */}
                      <td className="py-4 px-4 pl-6 whitespace-nowrap">
                        <StatusBadge status={ioc.status} size="sm" />
                      </td>

                      {/* IoC Type Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase ${
                            ioc.iocType === 'ip'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : ioc.iocType === 'url'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : ioc.iocType === 'domain'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          }`}
                        >
                          {ioc.iocType === 'file_hash' ? 'Hash' : ioc.iocType}
                        </span>
                      </td>

                      {/* Indicator Value (Masked) */}
                      <td className="py-4 px-4 font-mono text-gray-200 group-hover:text-blue-400 transition-colors max-w-xs md:max-w-md truncate">
                        {maskIocValue(ioc.normalizedValue, ioc.iocType)}
                      </td>

                      {/* Contributor Org */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-medium">{contributorName}</span>
                          {isMine && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded">You</span>
                          )}
                        </div>
                      </td>

                      {/* TLP Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${tlpColor(ioc.tlpLevel)}`}>
                          TLP:{ioc.tlpLevel}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        {renderConfidence()}
                      </td>

                      {/* Endorsement Progress */}
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        <span className={`font-medium ${validEndorseCount >= 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {validEndorseCount}/2
                        </span>
                      </td>

                      {/* Age */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500">
                        {timeAgo(ioc.createdAt)}
                      </td>

                      {/* Details Link */}
                      <td className="py-4 px-4 pr-6 text-right whitespace-nowrap">
                        <Link
                          href={`/threats/${ioc.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 font-medium group-hover:translate-x-0.5 transition-all"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
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
    </div>
  );
}
