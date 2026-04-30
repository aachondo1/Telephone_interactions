import { AlertCircle, PhoneOff, LogOut } from 'lucide-react';
import type { TechnicalLeaksData } from '../lib/kpi';
import { Tooltip } from './Tooltip';

type Props = {
  data: TechnicalLeaksData;
};

export function TechnicalLeaksPanel({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Fugas Técnicas</h3>
        <p className="text-sm text-slate-400 mt-1">
          Llamadas que no se cuentan en el SL% porque nunca tuvieron oportunidad de ser atendidas
        </p>
      </div>

      {data.totalTechnicalLeaks === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">Sin fugas técnicas detectadas</p>
            <p className="text-sm text-emerald-700 mt-1">
              Todas las llamadas entrantes están siendo procesadas correctamente por el sistema.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Short Abandons */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <PhoneOff size={16} className="text-amber-600" />
                  </div>
                  <p className="font-semibold text-amber-900">Cuelgues Instantáneos</p>
                  <Tooltip
                    definition="Llamadas en las que el cliente cuelga en menos de 5 segundos, antes de que el sistema procese la llamada"
                    formula="COUNT(queue_time_seconds &lt; 5 AND !attended AND flow_exit ≠ false)"
                    unit="Cantidad absoluta"
                    benchmark="Menor es mejor. Indica problemas de señal o marcado por error"
                  />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600 mb-2">{data.shortAbandons}</p>
              <p className="text-xs text-amber-700">
                Clientes que cuelgan en &lt; 5 segundos (antes de procesamiento)
              </p>
            </div>

            {/* IVR Drops */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <LogOut size={16} className="text-blue-600" />
                  </div>
                  <p className="font-semibold text-blue-900">Salidas IVR</p>
                  <Tooltip
                    definition="Llamadas que no llegaron a la cola porque se desconectaron en el menú IVR o transferencia automática"
                    formula="COUNT(flow_exit = false)"
                    unit="Cantidad absoluta"
                    benchmark="Menor es mejor. Indica problemas del sistema de menú"
                  />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-2">{data.ivrDrops}</p>
              <p className="text-xs text-blue-700">
                Llamadas que no llegaron a la cola (menú o transferencia fallida)
              </p>
            </div>

            {/* Total */}
            <div className="bg-slate-100 rounded-xl p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <AlertCircle size={16} className="text-slate-600" />
                  </div>
                  <p className="font-semibold text-slate-800">Total Fugas</p>
                  <Tooltip
                    definition="Suma de cuelgues instantáneos (short abandons) + salidas IVR (iVR drops)"
                    formula="Short Abandons + IVR Drops"
                    unit="Cantidad absoluta"
                    benchmark="NO se cuentan en SL% ni Abandonment Rate. Son problemas técnicos, no de capacidad"
                  />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-700 mb-2">{data.totalTechnicalLeaks}</p>
              <p className="text-xs text-slate-600">
                {data.percentOfInbound}% de las llamadas entrantes
              </p>
            </div>
          </div>

          {/* Context info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
            <p className="font-semibold mb-1">¿Por qué estas llamadas no afectan el SL%?</p>
            <p className="text-blue-700">
              Los <strong>cuelgues instantáneos</strong> ocurren antes de que el sistema procese la llamada (mala señal, marcado por error).
              Las <strong>salidas IVR</strong> no llegan a una cola real. Ambas son problemas de sistema/experiencia, no de capacidad del equipo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
