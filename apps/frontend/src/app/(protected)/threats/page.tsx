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
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Threat Feed</h1>
            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-2 py-0.5 rounded">
              {filteredIocs.length} of {baseList.length} Indicators
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Global immutable threat intelligence sharing stream across consortium members
          </p>
        </div>
        <Link
          href="/submit"
          className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors shadow-xs"
        >
          Submit Indicator
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by indicator value, IP, domain, hash, description, or ID..."
            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200 text-xs">
              <span className="text-slate-500 px-1.5 font-medium">Status:</span>
              {['all', 'verified', 'pending', 'rejected', 'flagged'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2 py-0.5 rounded capitalize font-medium text-xs transition-colors ${
                    selectedStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* IoC Type Filter */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200 text-xs">
              <span className="text-slate-500 px-1.5 font-medium">Type:</span>
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
                  className={`px-2 py-0.5 rounded font-medium text-xs transition-colors ${
                    selectedType === t.key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
              className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors ml-auto font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Threats Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {filteredIocs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No Indicators Match Filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query, status, type, or organization filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-200"
            >
              <RefreshCw className="w-3 h-3" /> Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 pl-5">Status</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Indicator Value</th>
                  <th className="py-2.5 px-4">Contributor</th>
                  <th className="py-2.5 px-4">TLP</th>
                  <th className="py-2.5 px-4 text-center">Confidence</th>
                  <th className="py-2.5 px-4 text-center">Endorsements</th>
                  <th className="py-2.5 px-4">Observed</th>
                  <th className="py-2.5 px-4 pr-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                        <span className={`w-2 h-2 rounded-full ${filled >= 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <span className={`w-2 h-2 rounded-full ${filled >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      </div>
                    );
                  };

                  return (
                    <tr
                      key={ioc.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => {
                        window.location.href = `/threats/${ioc.id}`;
                      }}
                    >
                      {/* Status */}
                      <td className="py-3 px-4 pl-5 whitespace-nowrap">
                        <StatusBadge status={ioc.status} size="sm" />
                      </td>

                      {/* IoC Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${
                            ioc.iocType === 'ip'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : ioc.iocType === 'url'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : ioc.iocType === 'domain'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}
                        >
                          {ioc.iocType === 'file_hash' ? 'Hash' : ioc.iocType}
                        </span>
                      </td>

                      {/* Indicator Value (Masked) */}
                      <td className="py-3 px-4 font-mono text-slate-900 group-hover:text-blue-600 transition-colors max-w-xs md:max-w-md truncate">
                        {maskIocValue(ioc.normalizedValue, ioc.iocType)}
                      </td>

                      {/* Contributor Org */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-medium">{contributorName}</span>
                          {isMine && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-semibold">You</span>
                          )}
                        </div>
                      </td>

                      {/* TLP Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${tlpColor(ioc.tlpLevel)}`}>
                          TLP:{ioc.tlpLevel}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {renderConfidence()}
                      </td>

                      {/* Endorsement Progress */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <span className={`font-semibold ${validEndorseCount >= 2 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {validEndorseCount}/2
                        </span>
                      </td>

                      {/* Age */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {timeAgo(ioc.createdAt)}
                      </td>

                      {/* Details Link */}
                      <td className="py-3 px-4 pr-5 text-right whitespace-nowrap">
                        <Link
                          href={`/threats/${ioc.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
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
