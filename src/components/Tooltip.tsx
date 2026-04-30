import { useState } from 'react';
import { Info } from 'lucide-react';

type Props = {
  definition: string;
  formula?: string;
  unit?: string;
  benchmark?: string;
  label?: string;
};

export function Tooltip({ definition, formula, unit, benchmark, label }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block group">
      <button
        className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        title={label || 'Más información'}
      >
        <Info size={16} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-slate-900 text-white rounded-lg shadow-lg p-4 z-50 text-xs leading-relaxed">
          <div className="space-y-2">
            {label && <p className="font-semibold text-sm border-b border-slate-700 pb-2">{label}</p>}

            <div>
              <p className="font-semibold text-slate-300">Definición:</p>
              <p className="text-slate-200">{definition}</p>
            </div>

            {formula && (
              <div>
                <p className="font-semibold text-slate-300">Fórmula:</p>
                <p className="text-slate-200 font-mono bg-slate-800 p-2 rounded">{formula}</p>
              </div>
            )}

            {unit && (
              <div>
                <p className="font-semibold text-slate-300">Unidad:</p>
                <p className="text-slate-200">{unit}</p>
              </div>
            )}

            {benchmark && (
              <div>
                <p className="font-semibold text-slate-300">Benchmark:</p>
                <p className="text-slate-200">{benchmark}</p>
              </div>
            )}
          </div>

          {/* Punta del tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
}
