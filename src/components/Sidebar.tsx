import { useState } from 'react';
import {
  LayoutDashboard, PhoneCall, Activity, BarChart3, Users, Calendar,
  Zap, Shield, Menu, X, ChevronDown, UploadCloud,
} from 'lucide-react';
import type { DataQualityReport } from '../lib/kpi';

export type Section = 'inicio' | 'llamadas' | 'health' | 'queues' | 'ejecutivos' | 'planificacion' | 'intervencion' | 'audit';

type Props = {
  activeSection: Section;
  onNavigate: (section: Section) => void;
  agentStatusCount: number;
  dataQuality: DataQualityReport | null;
  onUploadClick: () => void;
};

type NavItemDef = {
  id: Section;
  label: string;
  icon: typeof LayoutDashboard;
  group: 'analysis' | 'tools';
  badge?: number | null;
};

const NAV_ITEMS: NavItemDef[] = [
  { id: 'inicio',         label: 'Inicio',         icon: LayoutDashboard, group: 'analysis' },
  { id: 'llamadas',       label: 'Llamadas',       icon: PhoneCall,       group: 'analysis' },
  { id: 'health',         label: 'Salud de Cola',   icon: Activity,        group: 'analysis' },
  { id: 'queues',         label: 'Comparativa de Colas', icon: BarChart3,   group: 'analysis' },
  { id: 'ejecutivos',     label: 'Ejecutivos',      icon: Users,           group: 'analysis' },
  { id: 'planificacion',  label: 'Planificación',   icon: Calendar,        group: 'analysis' },
  { id: 'intervencion',   label: 'Intervención',    icon: Zap,             group: 'tools' },
  { id: 'audit',          label: 'Auditoría',       icon: Shield,          group: 'tools' },
];

function DataQualityDot({ quality }: { quality: DataQualityReport | null }) {
  if (!quality) return null;

  const hasCritical = quality.criticalIssues.handleTimeCorrupted > 0 || quality.criticalIssues.technicalCutsAsAttended > 0;
  const hasWarning = quality.handleTimeCorrupted > 0 || quality.technicalCuts > 0;

  let colorClass = 'bg-emerald-400';
  let label = 'Datos limpios';
  if (hasCritical) {
    colorClass = 'bg-red-400';
    label = 'Anomalías detectadas';
  } else if (hasWarning) {
    colorClass = 'bg-amber-400';
    label = 'Advertencias';
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className={`w-2 h-2 rounded-full ${colorClass} flex-shrink-0`} />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function Sidebar({ activeSection, onNavigate, agentStatusCount, dataQuality, onUploadClick }: Props) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const analysisItems = NAV_ITEMS.filter(i => i.group === 'analysis');
  const toolItems = NAV_ITEMS.filter(i => i.group === 'tools');

  const handleNavigate = (section: Section) => {
    onNavigate(section);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center flex-shrink-0">
            <PhoneCall size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-none truncate">Dashboard</p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Llamadas</p>
          </div>
        </div>
      </div>

      {/* Upload button */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => { onUploadClick(); setMobileOpen(false); }}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <UploadCloud size={14} />
          Cargar CSV
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Análisis
        </p>
        {analysisItems.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const showBadge = item.id === 'ejecutivos' && agentStatusCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {showBadge && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-emerald-400 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {agentStatusCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Tools section (collapsible) */}
        <div className="pt-3 mt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setToolsOpen(o => !o)}
            className="w-full flex items-center gap-1.5 px-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
          >
            <span>Herramientas</span>
            <ChevronDown size={12} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
          </button>
          {toolsOpen && (
            <div className="space-y-1 mt-1">
              {toolItems.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer: data quality indicator */}
      <div className="px-5 py-3 border-t border-slate-100">
        <DataQualityDot quality={dataQuality} />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(o => !o)}
        className="fixed top-3 left-3 z-50 md:hidden w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center"
      >
        {mobileOpen ? <X size={16} className="text-slate-600" /> : <Menu size={16} className="text-slate-600" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-56 bg-white border-r border-slate-100 flex flex-col transition-transform duration-200 md:translate-x-0 md:static md:z-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
