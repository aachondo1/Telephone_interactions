import { useState } from 'react';
import {
  LayoutDashboard, PhoneCall, Layers, Users, Calendar,
  Zap, Shield, Menu, X, ChevronDown, UploadCloud, Activity, TrendingUp,
} from 'lucide-react';
import type { DataQualityReport } from '../lib/kpi';

export type Section = 'inicio' | 'llamadas' | 'colas' | 'salud-colas' | 'ejecutivos' | 'planificacion' | 'gestion-proactiva' | 'intervencion' | 'audit';

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
  { id: 'colas',          label: 'Colas',           icon: Layers,          group: 'analysis' },
  { id: 'salud-colas',    label: 'Salud de Colas',  icon: Activity,        group: 'analysis' },
  { id: 'ejecutivos',     label: 'Ejecutivos',      icon: Users,           group: 'analysis' },
  { id: 'planificacion',  label: 'Planificación',   icon: Calendar,        group: 'analysis' },
  { id: 'gestion-proactiva', label: 'Gestión Proactiva', icon: TrendingUp, group: 'analysis' },
  { id: 'intervencion',   label: 'Intervención',    icon: Zap,             group: 'tools' },
  { id: 'audit',          label: 'Auditoría',       icon: Shield,          group: 'tools' },
];

// BICE Isotipo: 7 horizontal bars
function BiceIsotipo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 24" fill="currentColor">
      <rect y="0" width="28" height="2.5" rx="0.5" />
      <rect y="3.5" width="28" height="2.5" rx="0.5" />
      <rect y="7" width="28" height="2.5" rx="0.5" />
      <rect y="10.5" width="28" height="2.5" rx="0.5" />
      <rect y="14" width="28" height="2.5" rx="0.5" />
      <rect y="17.5" width="28" height="2.5" rx="0.5" />
      <rect y="21" width="28" height="2.5" rx="0.5" />
    </svg>
  );
}

function DataQualityDot({ quality }: { quality: DataQualityReport | null }) {
  if (!quality) return null;

  const hasCritical = quality.criticalIssues.handleTimeCorrupted > 0 || quality.criticalIssues.technicalCutsAsAttended > 0;
  const hasWarning = quality.handleTimeCorrupted > 0 || quality.technicalCuts > 0;

  let colorClass = 'bg-bice-success';
  let label = 'Datos limpios';
  if (hasCritical) {
    colorClass = 'bg-bice-alert';
    label = 'Anomalías detectadas';
  } else if (hasWarning) {
    colorClass = 'bg-bice-warning';
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
      {/* Logo area with BICE isotipo */}
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-7 text-bice-navy flex-shrink-0">
            <BiceIsotipo className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-bice-navy leading-none truncate">BICE Hipotecaria</p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate tracking-wide uppercase">Dashboard de Llamadas</p>
          </div>
        </div>
      </div>

      {/* Upload button */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => { onUploadClick(); setMobileOpen(false); }}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-bice-navy hover:bg-bice-navy-dark text-white px-3 py-2.5 rounded-lg transition-colors shadow-sm"
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
                  ? 'bg-bice-navy text-white shadow-sm'
                  : 'text-slate-500 hover:text-bice-navy hover:bg-bice-navy-tint'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {showBadge && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-bice-cyan text-bice-navy' : 'bg-bice-cyan-tint text-bice-cyan'
                }`}>
                  {agentStatusCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Tools section (collapsible) */}
        <div className="pt-3 mt-3 border-t border-slate-200">
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
                        ? 'bg-bice-navy text-white shadow-sm'
                        : 'text-slate-500 hover:text-bice-navy hover:bg-bice-navy-tint'
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
      <div className="px-5 py-3 border-t border-slate-200">
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
        className="fixed top-3 left-3 z-50 md:hidden w-9 h-9 rounded-lg  bg-white border border-slate-200 shadow-sm flex items-center justify-center"
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
        className={`fixed top-0 left-0 z-40 h-full w-56 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 md:translate-x-0 md:static md:z-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}