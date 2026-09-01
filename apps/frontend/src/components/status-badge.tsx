import { STATUS_CONFIG } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, classes: 'text-gray-400 bg-gray-400/10 border-gray-400/30' };
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span className={`inline-flex items-center rounded-md border font-medium ${sizeClass} ${config.classes}`}>
      {config.label}
    </span>
  );
}
