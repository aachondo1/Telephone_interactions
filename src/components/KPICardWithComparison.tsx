import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

type Props = {
  title: string;
  currentValue: string;
  previousValue?: string;
  changePercent?: number;
  /** When true, a decrease is positive (e.g., abandonment, wait time) */
  isLowerBetter?: boolean;
  /** When true, change is shown in neutral grey (e.g., duration) */
  isNeutral?: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: string;
  /** Optional extra class for the card wrapper */
  className?: string;
  /** Render the right side area (e.g., badge) instead of icon */
  rightContent?: React.ReactNode;
};

export function KPICardWithComparison({
  title,
  currentValue,
  previousValue,
  changePercent,
  isLowerBetter = false,
  isNeutral = false,
  subtitle,
  icon,
  accent,
  className = '',
  rightContent,
}: Props) {
  const hasComparison = previousValue !== undefined && changePercent !== undefined;
  const isZeroChange = changePercent !== undefined && Math.abs(changePercent) < 0.05;

  let changeColor = 'text-slate-400';
  let ChangeIcon = Minus;

  if (hasComparison && !isZeroChange && changePercent !== undefined) {
    const isPositive = changePercent > 0;
    const isImprovement = isLowerBetter ? !isPositive : isPositive;

    if (isNeutral) {
      changeColor = 'text-slate-400';
    } else if (isImprovement) {
      changeColor = 'text-emerald-600';
    } else {
      changeColor = 'text-red-500';
    }

    ChangeIcon = isPositive ? ArrowUp : ArrowDown;
  }

  const formattedChange =
    changePercent !== undefined
      ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`
      : null;

  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-3 ${className}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500 leading-tight">{title}</p>
        {icon && accent && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
          >
            {icon}
          </div>
        )}
        {rightContent}
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800 leading-none">{currentValue}</p>
        {hasComparison && (
          <div className="mt-1.5 space-y-0.5">
            <p className="text-sm text-slate-400">
              Período anterior: {previousValue}
            </p>
            {!isZeroChange && formattedChange && (
              <span
                className={`inline-flex items-center gap-0.5 text-sm font-semibold ${changeColor}`}
              >
                <ChangeIcon size={14} />
                {formattedChange}
              </span>
            )}
          </div>
        )}
        {!hasComparison && subtitle && (
          <p className="text-sm text-slate-400 mt-1.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
