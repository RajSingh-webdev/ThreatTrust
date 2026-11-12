'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, RotateCcw, Lock, Check 
} from 'lucide-react';

interface Props {
  orgName: string;
}

export default function InteractiveConsensusOrchestrator({ orgName }: Props) {
  const [activeStage, setActiveStage] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleStartSimulation = () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStage(1);

    setTimeout(() => {
      setActiveStage(2);
    }, 1400);

    setTimeout(() => {
      setActiveStage(3);
    }, 2800);

    setTimeout(() => {
      setActiveStage(4);
      setIsRunning(false);
    }, 4200);
  };

  const handleReset = () => {
    setActiveStage(0);
    setIsRunning(false);
  };

  return (
    <div className="rounded-2xl bg-[#0B0B0E] border border-[#1C1C22] p-7 md:p-8 space-y-6 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Consensus Verification Pipeline
          </h2>
          <p className="text-xs text-[#8E8E9A] mt-1">
            Simulate how indicators are validated across consortium members before ledger commitment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartSimulation}
            disabled={isRunning}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-mono transition-colors ${
              isRunning
                ? 'bg-[#181820] text-[#71717A] cursor-not-allowed'
                : 'bg-[#C6F432] text-[#070708] hover:bg-[#b5e229]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'Validating...' : 'Run Consensus Demo'}
          </motion.button>

          <button
            onClick={handleReset}
            disabled={isRunning || activeStage === 0}
            className="p-2.5 rounded-full bg-[#131318] hover:bg-[#1E1E26] text-[#8E8E9A] hover:text-white border border-[#262630] transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative z-10">
        {/* Step 1 */}
        <motion.div
          animate={{
            borderColor: activeStage >= 1 ? '#C6F432' : '#1C1C22',
            backgroundColor: activeStage >= 1 ? '#121216' : '#0E0E12',
          }}
          transition={{ duration: 0.25 }}
          className="rounded-xl p-4 border"
        >
          <div className="flex items-center justify-between text-[10px] font-mono mb-2">
            <span className="text-[#71717A]">STEP 1</span>
            {activeStage >= 1 && (
              <span className="text-[#C6F432] font-semibold bg-[#C6F432]/10 px-1.5 py-0.2 rounded">
                PROPOSED
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-white">{orgName} (Submitter)</p>
          <p className="text-[11px] text-[#8E8E9A] mt-0.5 font-mono">198.51.100.42 (IP)</p>
          <div className="mt-3 pt-2.5 border-t border-[#1C1C24] flex items-center justify-between text-[10px] text-[#71717A] font-mono">
            <span>Anti-Sybil Lock</span>
            <Lock className={`w-3 h-3 ${activeStage >= 1 ? 'text-[#C6F432]' : 'text-[#5A5A65]'}`} />
          </div>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          animate={{
            borderColor: activeStage >= 2 ? '#C6F432' : '#1C1C22',
            backgroundColor: activeStage >= 2 ? '#121216' : '#0E0E12',
          }}
          transition={{ duration: 0.25 }}
          className="rounded-xl p-4 border"
        >
          <div className="flex items-center justify-between text-[10px] font-mono mb-2">
            <span className="text-[#71717A]">STEP 2</span>
            {activeStage >= 2 && (
              <span className="text-[#C6F432] font-semibold bg-[#C6F432]/10 px-1.5 py-0.2 rounded flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> 1/2 VOTE
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-white">BankB Reviewer</p>
          <p className="text-[11px] text-[#8E8E9A] mt-0.5 font-mono">Telemetry Match</p>
          <div className="mt-3 pt-2.5 border-t border-[#1C1C24] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#71717A]">Review</span>
            <span className={activeStage >= 2 ? 'text-[#C6F432] font-semibold' : 'text-[#5A5A65]'}>
              {activeStage >= 2 ? 'Endorsed' : 'Pending'}
            </span>
          </div>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          animate={{
            borderColor: activeStage >= 3 ? '#C6F432' : '#1C1C22',
            backgroundColor: activeStage >= 3 ? '#121216' : '#0E0E12',
          }}
          transition={{ duration: 0.25 }}
          className="rounded-xl p-4 border"
        >
          <div className="flex items-center justify-between text-[10px] font-mono mb-2">
            <span className="text-[#71717A]">STEP 3</span>
            {activeStage >= 3 && (
              <span className="text-[#C6F432] font-semibold bg-[#C6F432]/10 px-1.5 py-0.2 rounded flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> 2/2 VOTE
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-white">CERTC Reviewer</p>
          <p className="text-[11px] text-[#8E8E9A] mt-0.5 font-mono">Correlated</p>
          <div className="mt-3 pt-2.5 border-t border-[#1C1C24] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#71717A]">Consensus</span>
            <span className={activeStage >= 3 ? 'text-[#C6F432] font-semibold' : 'text-[#5A5A65]'}>
              {activeStage >= 3 ? 'Reached' : 'Pending'}
            </span>
          </div>
        </motion.div>

        {/* Step 4 */}
        <motion.div
          animate={{
            borderColor: activeStage >= 4 ? '#C6F432' : '#1C1C22',
            backgroundColor: activeStage >= 4 ? '#141419' : '#0E0E12',
            boxShadow: activeStage >= 4 ? '0 0 25px rgba(198, 244, 50, 0.12)' : 'none',
          }}
          transition={{ duration: 0.25 }}
          className="rounded-xl p-4 border"
        >
          <div className="flex items-center justify-between text-[10px] font-mono mb-2">
            <span className="text-[#71717A]">STEP 4</span>
            {activeStage >= 4 && (
              <span className="text-[#070708] font-bold bg-[#C6F432] px-1.5 py-0.2 rounded">
                COMMITTED
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-white">Ledger Record</p>
          <p className="text-[11px] text-[#C6F432] mt-0.5 font-mono font-semibold">
            {activeStage >= 4 ? 'Status: Verified' : 'Awaiting 2/2'}
          </p>
          <div className="mt-3 pt-2.5 border-t border-[#1C1C24] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#71717A]">Reputation</span>
            <span className={activeStage >= 4 ? 'text-[#C6F432] font-bold' : 'text-[#5A5A65]'}>
              {activeStage >= 4 ? '+1 Rep' : '0'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
