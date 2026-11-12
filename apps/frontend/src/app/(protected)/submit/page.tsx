'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Send, AlertCircle, CheckCircle2, ArrowRight,
  ShieldAlert, Copy, Check, Lock, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { normalizeIoc, IOC_TYPE_LABELS } from '@/lib/utils';
import type { IocType, TlpLevel } from '@/lib/types';
import { api } from '@/lib/api';

export default function SubmitIocPage() {
  const router = useRouter();
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

  if (!org || !user) return null;

  const isRestricted = org.reputationScore < 30;
  const normalizedPreview = rawValue.trim() ? normalizeIoc(iocType, rawValue.trim()) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawValue.trim()) return;

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
        normalizedValue: iocData.normalizedValue || normalizedPreview,
        iocType: iocData.iocType || iocType,
        tlpLevel: iocData.tlpLevel || tlpLevel,
        description: iocData.description || description,
        txId: iocData.blockchainTxId || '',
        integrityHash: iocData.integrityHash || '',
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit indicator to consortium ledger.');
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
    <div className="min-h-screen bg-[#070708] text-white p-6 max-w-5xl mx-auto space-y-8 antialiased selection:bg-[#C6F432] selection:text-[#070708]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C22] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 px-3 py-1 rounded-full border border-[#C6F432]/25">
            PROPOSE THREAT INDICATOR
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2.5">
            Submit Indicator to Consortium
          </h1>
          <p className="text-xs text-[#8E8E9A] mt-1 font-normal">
            Broadcast a normalized indicator to peer nodes for multi-party corroboration and consensus voting.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#8E8E9A]">
          <span>Submitter: <strong className="text-white">{org.name}</strong></span>
          <span className="text-[#3A3A45]">/</span>
          <span className="text-[#C6F432] font-bold">{org.reputationScore} REP</span>
        </div>
      </div>

      {/* Restriction Notice */}
      {isRestricted && (
        <div className="rounded-2xl bg-rose-950/20 border border-rose-800/40 p-5 flex items-start gap-3.5 text-xs">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-rose-300">Submission Privileges Temporarily Suspended</h3>
            <p className="text-rose-200/80 leading-relaxed">
              Your organization reputation score is <strong>{org.reputationScore}</strong> (below the threshold of 30).
              Submissions are suspended to protect consortium threat feed purity.
            </p>
          </div>
        </div>
      )}

      {/* Success Confirmation Modal / Banner */}
      {submittedIoc && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-[#0B0B0E] border border-[#C6F432]/40 p-7 space-y-5 shadow-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#C6F432] flex items-center justify-center text-[#070708]">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <h3 className="text-base font-bold text-white">Indicator Anchored to Consortium Pipeline</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#C6F432] bg-[#C6F432]/10 px-3 py-1 rounded-full border border-[#C6F432]/25">
              STATUS: PENDING REVIEW (0/2)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-[#121216] border border-[#1C1C24] space-y-1">
              <span className="text-[10px] text-[#71717A] uppercase">Normalized Canonical Value</span>
              <p className="text-sm font-bold text-white">{submittedIoc.normalizedValue}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#121216] border border-[#1C1C24] space-y-1">
              <span className="text-[10px] text-[#71717A] uppercase">Fabric Transaction ID</span>
              <p className="text-xs text-[#C6F432] truncate">{submittedIoc.txId || 'Anchored'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-full bg-[#181820] hover:bg-[#202028] text-white text-xs font-medium transition-colors"
            >
              Submit Another Indicator
            </button>
            <Link
              href="/endorse"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C6F432] text-[#070708] text-xs font-bold transition-transform hover:scale-[1.02]"
            >
              Go to Endorse Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Main Form */}
      {!submittedIoc && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl bg-[#0B0B0E] border border-[#1C1C22] p-8 space-y-7 shadow-xl">
            
            {/* 1. Indicator Type Selector */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold">
                1. Select Indicator Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { type: 'ip' as IocType, label: 'IP Address', desc: 'IPv4 / IPv6' },
                  { type: 'url' as IocType, label: 'URL', desc: 'Phishing / C2' },
                  { type: 'domain' as IocType, label: 'Domain', desc: 'FQDN / Host' },
                  { type: 'file_hash' as IocType, label: 'File Hash', desc: 'SHA-256 / MD5' },
                ].map(({ type, label, desc }) => {
                  const isSelected = iocType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIocType(type)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#15151C] border-[#C6F432] shadow-md shadow-[#C6F432]/10 ring-1 ring-[#C6F432]/30'
                          : 'bg-[#101014] border-[#1C1C22] hover:border-[#2C2C36] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <p className={`text-xs font-bold ${isSelected ? 'text-[#C6F432]' : 'text-white'}`}>{label}</p>
                      <p className="text-[10px] text-[#71717A] mt-1 font-mono">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Raw Value Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold">
                2. Indicator Raw Value *
              </label>
              <input
                type="text"
                required
                disabled={isRestricted}
                value={rawValue}
                onChange={(e) => setRawValue(e.target.value)}
                placeholder={
                  iocType === 'ip' ? '185.220.101.45' :
                  iocType === 'domain' ? 'c2-malware-server.com' :
                  iocType === 'url' ? 'https://phishing-login.com/secure' :
                  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
                }
                className="w-full px-4 py-3.5 rounded-xl bg-[#101014] border border-[#1E1E26] text-white font-mono text-sm placeholder-[#454550] focus:border-[#C6F432] focus:outline-none focus:ring-1 focus:ring-[#C6F432]/30 transition-colors"
              />

              {normalizedPreview && (
                <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-[#8E8E9A]">
                  <span className="text-[#71717A]">Canonical Preview:</span>
                  <span className="text-[#C6F432] font-semibold">{normalizedPreview}</span>
                </div>
              )}
            </div>

            {/* 3. TLP Level Selector */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold">
                3. Traffic Light Protocol (TLP) Sharing Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { level: 'white' as TlpLevel, label: 'TLP:WHITE', sub: 'Public' },
                  { level: 'green' as TlpLevel, label: 'TLP:GREEN', sub: 'Community' },
                  { level: 'amber' as TlpLevel, label: 'TLP:AMBER', sub: 'Consortium Only' },
                  { level: 'red' as TlpLevel, label: 'TLP:RED', sub: 'Confidential' },
                ].map(({ level, label, sub }) => {
                  const isSelected = tlpLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setTlpLevel(level)}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-[#16161D] border-[#C6F432] text-white font-bold'
                          : 'bg-[#101014] border-[#1C1C22] text-[#8E8E9A] hover:border-[#2C2C36]'
                      }`}
                    >
                      <p className={`text-xs font-mono font-bold ${isSelected ? 'text-[#C6F432]' : 'text-white'}`}>{label}</p>
                      <p className="text-[10px] text-[#71717A] mt-0.5">{sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Threat Context */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold">
                4. Threat Context & Incident Telemetry *
              </label>
              <textarea
                required
                rows={3}
                disabled={isRestricted}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observed in Cobalt Strike beaconing or credential phishing campaign targeting banking API..."
                className="w-full px-4 py-3 rounded-xl bg-[#101014] border border-[#1E1E26] text-white text-xs placeholder-[#454550] focus:border-[#C6F432] focus:outline-none focus:ring-1 focus:ring-[#C6F432]/30 transition-colors"
              />
            </div>

            {/* 5. Evidence Reference */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A1A1AA] font-bold">
                5. Evidence Reference / Sandbox Link (Optional)
              </label>
              <input
                type="text"
                disabled={isRestricted}
                value={evidenceReference}
                onChange={(e) => setEvidenceReference(e.target.value)}
                placeholder="https://virustotal.com/gui/file/... or internal incident ticket #9401"
                className="w-full px-4 py-3 rounded-xl bg-[#101014] border border-[#1E1E26] text-white font-mono text-xs placeholder-[#454550] focus:border-[#C6F432] focus:outline-none focus:ring-1 focus:ring-[#C6F432]/30 transition-colors"
              />
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-between border-t border-[#1C1C24]">
              <span className="text-xs font-mono text-[#71717A]">
                Submitting as: <strong className="text-white">{org.name}</strong>
              </span>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting || isRestricted}
                className={`flex items-center gap-2 px-7 py-3.5 rounded-full text-xs font-bold font-mono transition-all ${
                  isSubmitting || isRestricted
                    ? 'bg-[#181820] text-[#71717A] cursor-not-allowed'
                    : 'bg-[#C6F432] hover:bg-[#b2e026] text-[#070708] shadow-xl shadow-[#C6F432]/15'
                }`}
              >
                <Send className="w-3.5 h-3.5 fill-current" />
                {isSubmitting ? 'Anchoring to Ledger...' : 'Submit to Consortium Ledger'}
              </motion.button>
            </div>

          </div>
        </form>
      )}

    </div>
  );
}
