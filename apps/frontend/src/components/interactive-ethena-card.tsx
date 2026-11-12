'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface CardProps {
  category: string;
  pillValue?: string;
  title: string;
  description: string;
  statsTitle: string;
  statsValue: string;
  statsSub: string;
  linkText: string;
  linkHref: string;
  accent?: boolean;
}

export default function InteractiveEthenaCard({
  category,
  pillValue,
  title,
  description,
  statsTitle,
  statsValue,
  statsSub,
  linkText,
  linkHref,
  accent = false,
}: CardProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-3xl bg-[#0B0B0E] border border-[#1C1C22] p-8 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-default shadow-xl"
      style={{
        boxShadow: isHovered
          ? accent
            ? '0 15px 40px -10px rgba(198, 244, 50, 0.12)'
            : '0 15px 40px -10px rgba(255, 255, 255, 0.05)'
          : 'none',
      }}
    >
      {/* 1. Wireframe Grid */}
      <div
        className="absolute inset-0 opacity-[0.045] pointer-events-none group-hover:opacity-[0.09] transition-opacity duration-300"
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* 2. Cursor Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${
            accent ? 'rgba(198, 244, 50, 0.09)' : 'rgba(255, 255, 255, 0.06)'
          }, transparent 60%)`,
        }}
      />

      {/* 3. Border Glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, ${
            accent ? 'rgba(198, 244, 50, 0.5)' : 'rgba(255, 255, 255, 0.25)'
          }, transparent 70%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />

      {/* Card Content Top */}
      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] bg-[#141418] px-3.5 py-1 rounded-full border border-[#24242C]">
            {category}
          </span>
          {pillValue && (
            <span
              className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full ${
                accent
                  ? 'bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30'
                  : 'bg-white/10 text-white border border-white/20'
              }`}
            >
              {pillValue}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-white transition-colors">
            {title}
          </h3>
          <p className="text-xs text-[#8E8E9A] leading-relaxed mt-3 font-normal">
            {description}
          </p>
        </div>
      </div>

      {/* Card Content Bottom: Ethena KPI Stat & Link */}
      <div className="relative z-10 pt-6 mt-8 border-t border-[#181820] space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#71717A]">{statsTitle}</p>
            <p className={`text-2xl font-extrabold font-mono tracking-tight mt-0.5 ${accent ? 'text-[#C6F432]' : 'text-white'}`}>
              {statsValue}
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#A1A1AA]">{statsSub}</span>
        </div>

        <Link
          href={linkHref}
          className="flex items-center justify-between pt-2 text-xs font-medium text-[#A1A1AA] group-hover:text-white transition-colors"
        >
          <span className="group-hover:text-[#C6F432] transition-colors">{linkText}</span>
          <ArrowRight className="w-4 h-4 text-[#71717A] group-hover:text-[#C6F432] group-hover:translate-x-1 transition-all duration-200" />
        </Link>
      </div>
    </motion.div>
  );
}
