'use client';

import { useEffect, useRef } from 'react';

export default function RotatingGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, isHovering: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;
    let rotationX = 0.22;

    const numPoints = 360;
    const points: { x: number; y: number; z: number; isNode?: boolean; label?: string }[] = [];
    const radius = 210;

    for (let i = 0; i < numPoints; i++) {
      const y = 1 - (i / (numPoints - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = 0.1 * i * Math.PI;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const isNode = i === 15 || i === 110 || i === 220 || i === 315;
      let label = undefined;
      if (i === 15) label = 'BankA (Leader)';
      if (i === 110) label = 'BankB (Peer)';
      if (i === 220) label = 'CERTC (CSIRT)';
      if (i === 315) label = 'Orderer (Raft)';

      points.push({
        x: x * radius,
        y: y * radius,
        z: z * radius,
        isNode,
        label,
      });
    }

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current = { x: nx * 0.45, y: ny * 0.35, isHovering: true };
    };

    const handlePointerLeave = () => {
      mouseRef.current.isHovering = false;
    };

    window.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseleave', handlePointerLeave);

    const render = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      rotation += 0.0055;
      const targetTilt = 0.22 + (mouseRef.current.isHovering ? mouseRef.current.y : 0);
      rotationX += (targetTilt - rotationX) * 0.06;

      const cosR = Math.cos(rotation + (mouseRef.current.isHovering ? mouseRef.current.x : 0));
      const sinR = Math.sin(rotation + (mouseRef.current.isHovering ? mouseRef.current.x : 0));

      const cosT = Math.cos(rotationX);
      const sinT = Math.sin(rotationX);

      const projectedPoints = points.map((p) => {
        const rx = p.x * cosR - p.z * sinR;
        const rz = p.x * sinR + p.z * cosR;
        const ry = p.y * cosT - rz * sinT;
        const rrz = p.y * sinT + rz * cosT;

        const perspective = 560 / (560 + rrz);
        const px = centerX + rx * perspective;
        const py = centerY + ry * perspective;
        const alpha = Math.max(0.12, Math.min(1, (rrz + radius) / (2 * radius)));

        return { px, py, rrz, alpha, isNode: p.isNode, label: p.label };
      });

      projectedPoints.sort((a, b) => a.rrz - b.rrz);

      // Draw luminous interconnecting Byzantine consensus lines between nodes
      const activeNodes = projectedPoints.filter((p) => p.isNode);
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const a = activeNodes[i];
          const b = activeNodes[j];
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.strokeStyle = `rgba(198, 244, 50, ${Math.min(a.alpha, b.alpha) * 0.65})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // Draw all points & highlighted glowing nodes
      for (const p of projectedPoints) {
        ctx.beginPath();
        if (p.isNode) {
          // Luminous Outer Glow Ring
          ctx.arc(p.px, p.py, 9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(198, 244, 50, ${p.alpha * 0.28})`;
          ctx.fill();

          // Core Lime Node Dot
          ctx.beginPath();
          ctx.arc(p.px, p.py, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = `#C6F432`;
          ctx.shadowColor = '#C6F432';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          // Label placement with wide canvas margins
          if (p.rrz > -35 && p.label) {
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 5;

            // If node is close to right boundary, flip to left
            if (p.px > width - 130) {
              ctx.textAlign = 'right';
              ctx.fillText(p.label, p.px - 14, p.py + 4);
            } else {
              ctx.textAlign = 'left';
              ctx.fillText(p.label, p.px + 14, p.py + 4);
            }
            ctx.shadowBlur = 0;
          }
        } else {
          ctx.arc(p.px, p.py, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(161, 161, 170, ${p.alpha * 0.45})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  return (
    <div className="relative w-full h-[540px] md:h-[600px] flex items-center justify-center overflow-visible">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[700px] max-h-[700px]"
      />
    </div>
  );
}
