'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send, AlertCircle, CheckCircle2, Info, ArrowRight,
  ShieldAlert, RefreshCw, Copy, Check, Lock
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { IOCS_LIST } from '@/lib/mock-data';
import { normalizeIoc, IOC_TYPE_LABELS, tlpColor } from '@/lib/utils';
import type { IocType, TlpLevel } from '@/lib/types';
import StatusBadge from '@/components/status-badge';
import { api } from '@/lib/api';

export default function SubmitIocPage() {
  const { org, user } = useAuth();

  const [iocType, setIocType] = useState<IocType>('ip');
  const [rawValue, setRawValue] = useState('');
  const [tlpLevel, setTlpLevel] = useState<TlpLevel>('amber');
  const [description, setDescription] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIoc, setSubmittedIoc] = useState<{
    id: string;
    normalizedValue: string;
    iocType: IocType;
    tlpLevel: TlpLevel;
    description: string;
    txId: string;
    integrityHash: string;
  } | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [liveIocs, setLiveIocs] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.iocs.getAll().then((res) => {
      if (isMounted && res.iocs) setLiveIocs(res.iocs);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  if (!org || !user) return null;

  // Reputation restriction check (< 30)
  const isRestricted = org.reputationScore < 30;

  // Real-time live normalization
  const normalizedValue = rawValue.trim() ? normalizeIoc(iocType, rawValue) : '';

  // Real-time Duplicate Detection check against live DB / mock fallback
  const allIocs = liveIocs || IOCS_LIST;
  const duplicateMatch = normalizedValue
    ? allIocs.find((i: any) => i.iocType === iocType && i.normalizedValue.toLowerCase() === normalizedValue.toLowerCase())
    : null;

  const placeholders: Record<IocType, string> = {
    ip: 'e.g., 185.220.101.45 or 192.168.001.001',
    url: 'e.g., HTTP://PHISHING-BANK.NET/login?utm_source=email&session=123',
    domain: 'e.g., C2-SERVER.RU. or www.malicious-domain.com.',
    file_hash: 'e.g., a3c4e5f6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
  };

  const helperHints: Record<IocType, string> = {
    ip: 'Normalized: removes leading zeros per octet, standardizes IPv4/IPv6 notation.',
    url: 'Normalized: lowercases scheme and host, preserves meaningful query params while stripping tracking telemetry (utm_*, fbclid).',
    domain: 'Normalized: lowercases domain name, strips trailing root dots.',
    file_hash: 'Normalized: converts hex strings to standard lowercase format.',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawValue.trim() || !description.trim() || isRestricted) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await api.iocs.submit({
        iocType,
        value: rawValue,
        tlpLevel,
        description,
        evidenceReference,
      });

      const iocData = res.ioc;
      setSubmittedIoc({
        id: iocData.id,
        normalizedValue: iocData.normalizedValue || normalizedValue,
        iocType: iocData.iocType || iocType,
        tlpLevel: iocData.tlpLevel || tlpLevel,
        description: iocData.description || description,
        txId: iocData.blockchainTxId || '',
        integrityHash: iocData.integrityHash || '',
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit indicator to ledger.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setRawValue('');
    setDescription('');
    setEvidenceReference('');
    setSubmitError(null);
    setSubmittedIoc(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Submit Cyber Threat Indicator</h1>
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2 py-0.5 rounded">
            Stage 1: Proposal
          </span>
        </div>
        <p className="text-slate-500 text-xs mt-1">
          Publish a sanitized IoC to the ThreatTrust decentralized ledger for peer review and consensus verification
        </p>
      </div>

      {/* Reputation Restriction Warning if score < 30 */}
      {isRestricted && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-800 text-xs">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Submission Privileges Restricted</h3>
            <p className="mt-1 text-red-800">
              Your organization reputation score is <strong>{org.reputationScore}</strong> (below the minimum threshold of 30).
              Submission of new indicators is temporarily suspended to preserve network trust integrity.
            </p>
          </div>
        </div>
      )}

      {/* Success State Screen after submission */}
      {submittedIoc ? (
        <div className="bg-white border border-emerald-500/80 rounded-lg p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 text-emerald-700">
            <div className="w-9 h-9 rounded-md bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Indicator Submitted Successfully</h2>
              <p className="text-xs text-slate-500">Status set to Pending · Awaiting 2 independent peer endorsements</p>
            </div>
          </div>

          {/* Submission Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 block font-sans">Type & TLP</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                    {submittedIoc.iocType}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${tlpColor(submittedIoc.tlpLevel)}`}>
                    TLP:{submittedIoc.tlpLevel}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-sans">Consensus State</span>
                <div className="flex items-center gap-2 mt-1 font-sans">
                  <StatusBadge status="pending" size="sm" />
                  <span className="text-xs text-amber-700 font-medium">0/2 Endorsements</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block font-sans">Stored Normalized Value</span>
              <p className="text-emerald-800 font-medium break-all mt-1 bg-white p-2 rounded border border-slate-200">
                {submittedIoc.normalizedValue}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block font-sans">Deterministic Integrity Hash (SHA-256)</span>
              <p className="text-slate-800 text-xs break-all mt-1 bg-white p-2 rounded border border-slate-200">
                {submittedIoc.integrityHash}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block font-sans">Fabric Blockchain Status</span>
              {submittedIoc.txId ? (
                <div className="text-slate-800 text-xs break-all mt-1 bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block font-sans text-[10px] mb-0.5">On-Chain Tx ID:</span>
                  {submittedIoc.txId}
                </div>
              ) : (
                <p className="text-amber-800 text-xs mt-1 bg-amber-50 p-2 rounded border border-amber-200 font-sans flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Fabric Network Offline (Stored locally in application database)
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            >
              Submit Another Indicator
            </button>
            <Link
              href="/threats"
              className="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              Go to Threat Feed <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Submission Form */
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-xs">
          {/* Step 1: IoC Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              1. Select Indicator Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['ip', 'url', 'domain', 'file_hash'] as IocType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setIocType(t)}
                  className={`p-3 rounded-md border text-left font-medium transition-colors ${
                    iocType === t
                      ? 'bg-blue-50/70 border-blue-600 text-blue-900 ring-1 ring-blue-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-xs font-semibold capitalize">{IOC_TYPE_LABELS[t]}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block uppercase">Type: {t}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">{helperHints[iocType]}</p>
          </div>

          {/* Step 2: Raw Indicator Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Indicator Raw Value <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isRestricted}
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              placeholder={placeholders[iocType]}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Live Normalization Preview Box */}
            {rawValue.trim() && (
              <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-semibold text-blue-700">
                    <RefreshCw className="w-3.5 h-3.5" /> Deterministic Canonical Value
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Deduplication Key: (type + value)</span>
                </div>
                <p className="font-mono text-xs text-emerald-800 font-medium break-all bg-white px-2.5 py-1.5 rounded border border-slate-200">
                  {normalizedValue}
                </p>

                {/* Duplicate Detection Alert */}
                {duplicateMatch && (
                  <div className="bg-amber-50 border border-amber-300 rounded p-2.5 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-900 block">Existing Indicator Detected in Ledger</span>
                      This indicator is already registered (<span className="font-mono">{duplicateMatch.id}</span>) with status <strong>{duplicateMatch.status}</strong>.
                      Submitting will register an observation/endorsement rather than a duplicate entry.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 3: TLP Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              3. Traffic Light Protocol (TLP) Sharing Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['white', 'green', 'amber', 'red'] as TlpLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setTlpLevel(level)}
                  className={`p-2.5 rounded-md border text-center transition-colors ${
                    tlpLevel === level
                      ? `ring-2 ${tlpColor(level)} border-current font-bold`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs uppercase font-bold block">TLP:{level}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {level === 'white' && 'Public Disclosure'}
                    {level === 'green' && 'Community'}
                    {level === 'amber' && 'Consortium Only'}
                    {level === 'red' && 'Strictly Confidential'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              4. Threat Context & Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              disabled={isRestricted}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide observed malware family, adversary tactics, affected ports/protocols, campaign context..."
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Step 5: Evidence Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              5. Evidence Reference / Sandbox Link <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              disabled={isRestricted}
              value={evidenceReference}
              onChange={(e) => setEvidenceReference(e.target.value)}
              placeholder="e.g., https://virustotal.com/gui/file/... or internal ticket ref"
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-semibold text-red-900 block">Submission Rejected</span>
                {submitError}
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Submitting as <span className="text-slate-800 font-medium">{org.name}</span> · Current Rep: <span className="text-blue-700 font-bold">{org.reputationScore}</span>
            </div>
            <button
              type="submit"
              disabled={isRestricted || isSubmitting || !rawValue.trim() || !description.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-2.5 rounded-md shadow-xs transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Proposal...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Submit to Ledger
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
