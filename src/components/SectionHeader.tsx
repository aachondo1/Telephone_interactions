import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function SectionHeader({ icon: Icon, title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-bice-navy-tint flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-bice-navy" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 leading-tight truncate">{title}</h2>
          {description && (
            <p className="text-sm text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}