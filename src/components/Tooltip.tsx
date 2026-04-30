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
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 bg-white text-bice-gray rounded-xl shadow-xl p-4 z-50 text-xs leading-relaxed pointer-events-auto border border-slate-100">
          <div className="space-y-2">
            {label && <p className="font-semibold text-sm border-b border-slate-200 pb-2 text-bice-blue">{label}</p>}

            <div>
              <p className="font-semibold text-bice-blue">Definición:</p>
              <p className="text-bice-gray">{definition}</p>
            </div>

            {formula && (
              <div>
                <p className="font-semibold text-bice-blue">Fórmula:</p>
                <p className="text-bice-gray font-mono bg-slate-50 p-2 rounded text-xs">{formula}</p>
              </div>
            )}

            {unit && (
              <div>
                <p className="font-semibold text-bice-blue">Unidad:</p>
                <p className="text-bice-gray">{unit}</p>
              </div>
            )}

            {benchmark && (
              <div>
                <p className="font-semibold text-bice-blue">Benchmark:</p>
                <p className="text-bice-gray">{benchmark}</p>
              </div>
            )}
          </div>

          {/* Punta del tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-white border border-slate-100 border-t-0 border-r-0 rotate-45"></div>
        </div>
      )}
    </div>
  );
}
