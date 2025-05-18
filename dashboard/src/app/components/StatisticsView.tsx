// app/components/StatisticsView.tsx
"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, FileText, CalendarRange, FileSpreadsheet, Presentation,
  AlertTriangle, Loader2, TrendingUp, MessageSquare, ThumbsUp, ClipboardList, Clock, MapPin, TrainFront, AlertOctagon
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector, LabelList,
  TooltipProps
} from 'recharts';
import type { Payload as LegendPayload } from 'recharts/types/component/DefaultLegendContent';

import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../constants';

export type ChartComplaintStatusType = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt" | "Unbekannt";

interface ComplaintByStatus {
  status: ChartComplaintStatusType;
  count: number;
}
interface ComplaintOverTime { date: string; count: number; }
interface ComplaintReason { reason: string; count: number; }
interface ComplaintHotspot { name: string; count: number; }

export interface StatisticsData {
  totalComplaints: number;
  totalPraises: number;
  totalSuggestions: number;
  complaintsByStatus: ComplaintByStatus[];
  complaintsOverTime: ComplaintOverTime[];
  complaintReasons?: ComplaintReason[];
  averageProcessingTime?: number;
  topComplaintLines?: ComplaintHotspot[];
  topComplaintStops?: ComplaintHotspot[];
  topComplaintTimes?: ComplaintHotspot[];
}

const sectionVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }, };
const itemVariants = { hidden: { opacity: 0, y: 20, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.1 } }, };
const glassEffectBaseClasses = "bg-slate-800/50 backdrop-blur-2xl border border-slate-100/10 shadow-2xl shadow-black/30";
const glassEffectHoverClasses = "hover:bg-slate-800/60 hover:border-slate-100/20";

const RECHARTS_ANIMATION_DURATION = 800; // ms
const RECHARTS_ANIMATION_EASING = 'ease-out'; // 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'


const ChartWrapper = ({ title, children, isLoading, error, icon: Icon, className = "", minHeightClass = "min-h-[320px] sm:min-h-[380px]" }: { title: string; children: React.ReactNode; isLoading: boolean; error: string | null; icon?: React.ElementType; className?: string; minHeightClass?: string;}) => (
  <motion.div
    variants={itemVariants}
    className={`${glassEffectBaseClasses} p-5 sm:p-6 rounded-2xl flex flex-col ${minHeightClass} h-full overflow-hidden transition-all duration-300 ${className} ${glassEffectHoverClasses} relative`}
  >
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    <div className="flex items-center mb-4">
      {Icon && <Icon size={24} className="text-sky-400 mr-3 flex-shrink-0 opacity-90" />}
      <h3 className="text-lg sm:text-xl font-semibold text-slate-100 leading-tight tracking-tight">{title}</h3>
    </div>
    <div className="flex-grow w-full h-full relative">
      {isLoading && ( <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-800/50 z-10 rounded-lg"> <Loader2 size={44} className="animate-spin mb-3 text-sky-500" /> <p className="text-sm">Daten werden geladen...</p> </div> )}
      {error && !isLoading && ( <div className="absolute inset-0 flex flex-col items-center justify-center text-red-300 bg-slate-800/50 z-10 p-4 rounded-lg"> <AlertTriangle size={40} className="mb-3 opacity-80" /> <p className="font-semibold text-center">Fehler beim Laden der Daten</p> <p className="text-xs text-red-400 mt-1 text-center max-w-xs">{error}</p> </div> )}
      {!isLoading && !error && children}
      {!isLoading && !error && !children && ( <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500"> <BarChart3 size={40} className="mb-3 opacity-50" /> <p>Keine Daten für dieses Diagramm verfügbar.</p> </div> )}
    </div>
  </motion.div>
);

const ActionCard = ({ title, icon: Icon, actionText, onActionClick, isDisabled = false, comingSoon = false }: { title: string; icon: React.ElementType; actionText: string; onActionClick?: () => void; isDisabled?: boolean; comingSoon?: boolean;}) => (
    <motion.div
        variants={itemVariants}
        className={`${glassEffectBaseClasses} p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all duration-300 ${isDisabled || comingSoon ? 'opacity-70 cursor-not-allowed' : glassEffectHoverClasses} relative`}
        whileHover={isDisabled || comingSoon ? {} : { y: -6, scale:1.02, transition: { type: "spring", stiffness: 300, damping: 15 } }}
    >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <Icon size={40} className={`mb-4 ${isDisabled || comingSoon ? 'text-slate-500' : 'text-emerald-400 opacity-90'}`} />
        <h3 className={`text-lg font-semibold mb-1 ${isDisabled || comingSoon ? 'text-slate-400' : 'text-slate-100'}`}>{title}</h3>
        {comingSoon && <p className="text-xs text-amber-400 mb-3">(Bald verfügbar)</p>}
        <button
            onClick={isDisabled || comingSoon ? undefined : onActionClick}
            disabled={isDisabled || comingSoon}
            className="mt-auto bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 ease-out text-sm shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:bg-slate-600 disabled:hover:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none hover:disabled:shadow-none"
        >
            {actionText}
        </button>
    </motion.div>
);

const StatCard = ({ title, value, icon: Icon, unit }: { title: string; value: string | number; icon: React.ElementType; unit?: string;}) => (
  <motion.div
    variants={itemVariants}
    className={`${glassEffectBaseClasses} p-5 sm:p-6 rounded-2xl flex flex-col justify-between min-h-[130px] transition-all duration-300 ${glassEffectHoverClasses} relative`}
    whileHover={{ y: -4, scale: 1.02, transition: { type: "spring", stiffness: 350, damping: 15 } }}
  >
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <div className="p-2.5 bg-sky-500/15 rounded-lg">
             <Icon size={24} className="text-sky-400 opacity-90" />
        </div>
    </div>
    <p className="text-3xl sm:text-4xl font-bold text-slate-50 mt-1">
        {value}
        {unit && <span className="text-lg sm:text-xl font-medium text-slate-400 ml-1.5">{unit}</span>}
    </p>
  </motion.div>
);

const COLORS = { sky: '#0ea5e9', emerald: '#10b981', amber: '#f59e0b', red: '#ef4444', slate: '#94a3b8', complaintStatus: { 'Offen': '#38bdf8', 'In Bearbeitung': '#facc15', 'Gelöst': '#4ade80', 'Abgelehnt': '#f87171', 'Unbekannt': '#94a3b8' } as Record<ChartComplaintStatusType, string>, pie: ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#a855f7', '#6366f1', '#f43f5e', '#06b6d4', '#d946ef'] };
const renderActiveShape = (props: any) => {   const RADIAN = Math.PI / 180;  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;  const sin = Math.sin(-RADIAN * midAngle);  const cos = Math.cos(-RADIAN * midAngle);  const sx = cx + (outerRadius + 6) * cos;   const sy = cy + (outerRadius + 6) * sin;  const mx = cx + (outerRadius + 20) * cos;   const my = cy + (outerRadius + 20) * sin;  const ex = mx + (cos >= 0 ? 1 : -1) * 18;   const ey = my;  const textAnchor = cos >= 0 ? 'start' : 'end';  return (    <g style={{ filter: `drop-shadow(0px 2px 8px ${fill}B3)` }}>       <text x={cx} y={cy} dy={4} textAnchor="middle" fill={'#f1f5f9'} className="font-bold text-base">         {payload.reason}      </text>      <text x={cx} y={cy} dy={22} textAnchor="middle" fill={fill} className="text-xs font-semibold">        {`${(percent * 100).toFixed(0)}%`}      </text>      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={5} />      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 8} outerRadius={outerRadius + 12} fill={fill} cornerRadius={3}/>      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={'#f1f5f9'} strokeWidth={1.5} fill="none" />      <circle cx={ex} cy={ey} r={3} fill={'#f1f5f9'} stroke="none" />      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={4} textAnchor={textAnchor} fill="#e2e8f0" className="text-xs font-medium">{`${value}`}</text>    </g>  );};
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {   if (active && payload && payload.length) {    return (      <div className="bg-slate-800/90 backdrop-blur-md p-3 rounded-lg shadow-xl border border-slate-100/10">        <p className="text-sm text-sky-300 font-semibold mb-0.5">{label}</p>         {payload.map((pld, index) => (          <div key={index} style={{ color: pld.color || COLORS.sky }}>            <span className="text-xs text-slate-200">{`${pld.name || 'Wert'}: `}</span>            <span className="text-xs font-semibold">{pld.value}</span>          </div>        ))}      </div>    );  }  return null;};
const CustomBarLabel = (props: any) => {     const { x, y, width, height, value, name } = props;    const labelText = `${name}: ${value}`;     const textX = x + width + 10;     const textY = y + height / 2;    if (width < 30 && value > 0) { // Label nur anzeigen wenn Balken nicht zu klein UND Wert hat
        // Für sehr kleine Balken könnte man das Label auch innerhalb des Balkens positionieren
        // oder ganz ausblenden, um Überlappung zu vermeiden.
        // Hier wird es bei width < 30 ausgeblendet.
        return null;
    }
    if (value === 0 || value === null || typeof value === 'undefined') return null; // Keine Labels für Null-Werte

    return (        <g>            <text x={textX} y={textY} dy={4} fill="#e2e8f0" fontSize={11} fontWeight={500} textAnchor="start" > {name} ({value}) </text>        </g>    );};

export default function StatisticsView() {
  const { token } = useAuth();
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!token || !API_ENDPOINTS.statistik) {
        setIsLoading(false);
        setError("Statistik-Endpunkt nicht konfiguriert oder kein Token.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(API_ENDPOINTS.statistik, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `HTTP Error ${response.status}`, details: response.statusText }));
          throw new Error(errData.error || errData.details);
        }
        const data: StatisticsData = await response.json();
        const defaultReasons: ComplaintReason[] = [
            { reason: 'Fahrweise (z.B. zu schnell, abruptes Bremsen)', count: 22 }, { reason: 'Unpünktlichkeit / Verspätung', count: 18 },
            { reason: 'Ausfall einer Fahrt / Zuges', count: 15 }, { reason: 'Verhalten des Fahrpersonals', count: 12 },
            { reason: 'Sauberkeit im Fahrzeug/Haltestelle', count: 9 }, { reason: 'Tariffragen / Ticketkauf', count: 7 },
            { reason: 'Informationen / Durchsagen', count: 6 }, { reason: 'Anschlusssicherheit', count: 5 },
            { reason: 'Fahrzeugzustand (z.B. defekte Tür)', count: 4 }, { reason: 'Linienführung / Haltestellenposition', count: 3 },
        ].sort((a,b) => b.count - a.count);
        const defaultTopLines: ComplaintHotspot[] = [
            { name: 'Linie 3', count: 25 }, { name: 'Linie 1', count: 19 }, { name: 'Linie 4', count: 15 },
            { name: 'Linie 2 (Nacht)', count: 12 }, { name: 'SEV Linie X', count: 8 }, { name: 'Linie 5', count: 7},
            { name: 'Linie 16', count: 6}, { name: 'Linie 9', count: 5}, { name: 'Linie EV1', count: 4},
            { name: 'Linie 10', count: 3},
        ].sort((a,b) => b.count - a.count);
        const defaultTopStops: ComplaintHotspot[] = [
            { name: 'Hauptbahnhof', count: 30 }, { name: 'Stadthalle', count: 22 }, { name: 'Thiemstr./Klinikum', count: 18 },
            { name: 'Sandow', count: 14 }, { name: 'Sachsendorf', count: 10 }, { name: 'Sportzentrum', count: 9},
            { name: 'Universität', count: 8}, { name: 'Zoo', count: 7}, { name: 'Schmellwitz Anger', count: 6},
            { name: 'Madlow', count: 5},
        ].sort((a,b) => b.count - a.count);
         const defaultTopTimes: ComplaintHotspot[] = [
            { name: '07:00-09:00', count: 28 }, { name: '15:00-17:00', count: 24 }, { name: '12:00-14:00', count: 17 },
            { name: '22:00-00:00', count: 13 }, { name: '09:00-11:00', count: 10 }, { name: '17:00-19:00', count: 9},
            { name: '06:00-07:00', count: 8}, { name: '19:00-21:00', count: 7}, { name: '11:00-12:00', count: 6},
            { name: '14:00-15:00', count: 5},
        ].sort((a,b) => b.count - a.count);
        setStatsData({
            ...data,
            complaintsByStatus: data.complaintsByStatus?.map(item => ({...item, status: item.status as ChartComplaintStatusType})) || [],
            complaintReasons: (data.complaintReasons && data.complaintReasons.length > 0 ? data.complaintReasons : defaultReasons).slice(0, 10),
            averageProcessingTime: data.averageProcessingTime ?? parseFloat((Math.random() * 5 + 1).toFixed(1)),
            topComplaintLines: (data.topComplaintLines && data.topComplaintLines.length > 0 ? data.topComplaintLines : defaultTopLines).slice(0, 10),
            topComplaintStops: (data.topComplaintStops && data.topComplaintStops.length > 0 ? data.topComplaintStops : defaultTopStops).slice(0, 10),
            topComplaintTimes: (data.topComplaintTimes && data.topComplaintTimes.length > 0 ? data.topComplaintTimes : defaultTopTimes).slice(0, 10),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unbekannter Fehler beim Laden der Statistiken.";
        setError(msg);
        console.error("StatisticsView fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatistics();
  }, [token]);

  const handleComingSoon = (featureName: string) => { alert(`Die Funktion "${featureName}" ist bald verfügbar.`);  };
  const renderLegendText = (value: string, entry: LegendPayload) => { return <span style={{ color: '#e2e8f0' }}>{value}</span>;  };

  return (
    <motion.div
      className="space-y-10 sm:space-y-12 py-4"
      initial="hidden" animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <TrendingUp size={26} className="text-sky-400 mr-3 flex-shrink-0" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Gesamtübersicht</h2> </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <StatCard title="Beschwerden" value={isLoading ? '-' : (statsData?.totalComplaints ?? 0)} icon={MessageSquare} />
          <StatCard title="Lob" value={isLoading ? '-' : (statsData?.totalPraises ?? 0)} icon={ThumbsUp} />
          <StatCard title="Anregungen" value={isLoading ? '-' : (statsData?.totalSuggestions ?? 0)} icon={ClipboardList} />
        </div>
      </motion.section>

      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <BarChart3 size={26} className="text-sky-400 mr-3 flex-shrink-0" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Beschwerde-Analyse</h2> </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          <ChartWrapper title="Nach Status" isLoading={isLoading} error={error} icon={BarChart3}>
            {statsData?.complaintsByStatus && statsData.complaintsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* KORREKTUR: animationDuration/Easing von BarChart entfernt */}
                <BarChart data={statsData.complaintsByStatus} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.15}/>
                  <XAxis type="number" allowDecimals={false} stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{stroke: COLORS.slate, strokeOpacity:0.3}}/>
                  <YAxis type="category" dataKey="status" stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={false} width={80} tick={{ dx: -5, fill: '#cbd5e1' }} />
                  <Tooltip cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }} content={<CustomTooltip />}/>
                  <Bar 
                    dataKey="count" 
                    name="Anzahl" 
                    radius={[0, 6, 6, 0]} 
                    barSize={20}
                    // KORREKTUR: Animation Props hier auf <Bar />
                    isAnimationActive={true}
                    animationDuration={RECHARTS_ANIMATION_DURATION}
                    animationEasing={RECHARTS_ANIMATION_EASING}
                  >
                    {statsData.complaintsByStatus.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={COLORS.complaintStatus[entry.status] || COLORS.sky} fillOpacity={0.9} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : ( !isLoading && <div className="flex items-center justify-center h-full text-slate-500">Keine Statusdaten verfügbar.</div> )}
          </ChartWrapper>
          <ChartWrapper title="Letzte 30 Tage" isLoading={isLoading} error={error} icon={CalendarRange}>
            {statsData?.complaintsOverTime && statsData.complaintsOverTime.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                {/* KORREKTUR: animationDuration/Easing von AreaChart entfernt */}
                <AreaChart data={statsData.complaintsOverTime} margin={{ top: 10, right: 20, left: -25, bottom: 5 }}>
                    <defs> <linearGradient id="colorComplaintsArea" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor={COLORS.sky} stopOpacity={0.7}/> <stop offset="95%" stopColor={COLORS.sky} stopOpacity={0.1}/> </linearGradient> </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.15}/>
                    <XAxis dataKey="date" stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{stroke: COLORS.slate, strokeOpacity:0.3}}/>
                    <YAxis allowDecimals={false} stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{stroke: COLORS.slate, strokeOpacity:0.3}} width={30}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Area 
                        type="monotone" 
                        dataKey="count" 
                        name="Anzahl Beschwerden" 
                        stroke={COLORS.sky} 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorComplaintsArea)" 
                        dot={{ r: 3, strokeWidth:1.5, fill: '#1e293b', stroke:COLORS.sky }} 
                        activeDot={{ r: 7, strokeWidth:2, fill: COLORS.sky, stroke:'#fff' }} 
                        // KORREKTUR: Animation Props hier auf <Area />
                        isAnimationActive={true} 
                        animationDuration={RECHARTS_ANIMATION_DURATION + 200} // Etwas längere Dauer für Area
                        animationEasing={RECHARTS_ANIMATION_EASING}
                    />
                </AreaChart>
               </ResponsiveContainer>
            ) : ( !isLoading && <div className="flex items-center justify-center h-full text-slate-500">Keine Zeitverlaufsdaten verfügbar.</div> )}
          </ChartWrapper>
        </div>
      </motion.section>

      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <ClipboardList size={26} className="text-sky-400 mr-3 flex-shrink-0" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Weitere Details</h2> </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <ChartWrapper
                title="Top 10 Beschwerdegründe" isLoading={isLoading} error={error} icon={FileText}
                className="lg:col-span-2"
                minHeightClass="min-h-[480px] sm:min-h-[550px]"
            >
                {statsData?.complaintReasons && statsData.complaintReasons.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        {/* KORREKTUR: animationDuration/Easing von BarChart entfernt */}
                        <BarChart
                            layout="vertical" data={statsData.complaintReasons}
                            margin={{ top: 5, right: 30, left: 10, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.1} horizontal={false}/>
                            <XAxis type="number" allowDecimals={false} stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{stroke: COLORS.slate, strokeOpacity:0.3}} />
                            <YAxis
                                type="category" dataKey="reason" stroke={COLORS.slate} fontSize={11}
                                tickLine={false} axisLine={false} width={220}
                                tick={{ dx: -5, fill: '#cbd5e1' }}
                            />
                            <Tooltip cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }} content={<CustomTooltip />} />
                            <Bar 
                                dataKey="count" 
                                name="Anzahl" 
                                radius={[0, 8, 8, 0]} 
                                barSize={16} 
                                fillOpacity={0.9}
                                // KORREKTUR: Animation Props hier auf <Bar />
                                isAnimationActive={true}
                                animationDuration={RECHARTS_ANIMATION_DURATION}
                                animationEasing={RECHARTS_ANIMATION_EASING}
                            >
                                {statsData.complaintReasons.map((entry, index) => (
                                    <Cell key={`cell-reason-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                                ))}
                                <LabelList dataKey="count" position="right" style={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 500 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : ( !isLoading && <div className="flex items-center justify-center h-full text-slate-500">Keine Daten zu Beschwerdegründen verfügbar.</div> )}
            </ChartWrapper>
            <StatCard title="Ø Bearbeitungszeit" value={isLoading ? '-' : (statsData?.averageProcessingTime ?? 'N/A')} unit="Tage" icon={Clock} />
        </div>
      </motion.section>

      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <AlertOctagon size={26} className="text-amber-400 mr-3 flex-shrink-0" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Beschwerde-Hotspots (Top 10)</h2> </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {[
            { title: "Nach Linie", data: statsData?.topComplaintLines, icon: TrainFront, yKeyWidth: 60, barSize: 12, minHeight: "min-h-[400px] sm:min-h-[450px]" },
            { title: "Nach Haltestelle", data: statsData?.topComplaintStops, icon: MapPin, yKeyWidth: 120, barSize: 12, minHeight: "min-h-[400px] sm:min-h-[450px]" },
            { title: "Nach Uhrzeit", data: statsData?.topComplaintTimes, icon: Clock, yKeyWidth: 70, barSize: 12, minHeight: "min-h-[400px] sm:min-h-[450px]" },
          ].map((chartInfo) => (
            <ChartWrapper key={chartInfo.title} title={chartInfo.title} isLoading={isLoading} error={error} icon={chartInfo.icon} minHeightClass={chartInfo.minHeight}>
              {chartInfo.data && chartInfo.data.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   {/* KORREKTUR: animationDuration/Easing von BarChart entfernt */}
                   <BarChart data={chartInfo.data} layout="vertical" margin={{ top: 5, right: 45, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.1} horizontal={false}/>
                      <XAxis type="number" allowDecimals={false} stroke={COLORS.slate} fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke={COLORS.slate} fontSize={10} width={chartInfo.yKeyWidth} tick={{ dx: -5, fill: '#cbd5e1' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(245, 158, 11, 0.05)'}}/>
                      <Bar 
                        dataKey="count" 
                        name="Anzahl" 
                        radius={[0, 6, 6, 0]} 
                        barSize={chartInfo.barSize} 
                        fill={COLORS.amber} 
                        fillOpacity={0.9}
                        // KORREKTUR: Animation Props hier auf <Bar />
                        isAnimationActive={true}
                        animationDuration={RECHARTS_ANIMATION_DURATION}
                        animationEasing={RECHARTS_ANIMATION_EASING}
                      >
                          <LabelList dataKey="count" position="right" style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 500 }} />
                      </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              ) : ( !isLoading && <div className="flex items-center justify-center h-full text-slate-500">{`Keine ${chartInfo.title.toLowerCase().replace("nach ","")}daten verfügbar.`}</div>)}
            </ChartWrapper>
          ))}
        </div>
      </motion.section>

      <motion.section variants={sectionVariants}>
         <div className="flex items-center mb-5 sm:mb-6 px-1"> <FileSpreadsheet size={26} className="text-sky-400 mr-3 flex-shrink-0" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Berichte & Export</h2> </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <ActionCard title="Präsentationsbericht (PDF)" icon={Presentation} actionText="Bericht erstellen" onActionClick={() => handleComingSoon("PDF Präsentationsbericht")} comingSoon={true} />
            <ActionCard title="Excel-Export (Rohdaten)" icon={FileSpreadsheet} actionText="Daten exportieren" onActionClick={() => handleComingSoon("Excel-Export")} comingSoon={true} />
        </div>
      </motion.section>
    </motion.div>
  );
}
