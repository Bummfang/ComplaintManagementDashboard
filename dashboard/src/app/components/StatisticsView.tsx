// app/components/StatisticsView.tsx
"use client";

import { useEffect, useState, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, FileText, CalendarRange, FileSpreadsheet, Presentation,
  AlertTriangle, Loader2, TrendingUp, MessageSquare, ThumbsUp, ClipboardList, Clock, MapPin, TrainFront, AlertOctagon,
  FilterIcon, XIcon as XMarkIcon
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
  TooltipProps
} from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../constants';
import { formatDate } from '../utils';

// --- Typdefinitionen ---
// Diese bleiben wie von dir bereitgestellt, da sie die API-Antwort widerspiegeln.
// Wichtig ist, wie wir im Frontend damit umgehen.
export type ChartComplaintStatusType = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt" | "Unbekannt";
interface ComplaintByStatus { status: ChartComplaintStatusType; count: number; }
interface ComplaintOverTime { date: string; count: number; }
interface ComplaintReason { reason: string; count: number; }
interface ComplaintHotspot { name: string; count: number; }

// Die Struktur, die von der API erwartet wird (StatisticsApiResponse in deiner route.ts)
// und wie wir sie im Frontend-State halten (StatisticsData).
// Wir machen die Array-Felder im State nicht-optional, da wir sie bei Bedarf mit `[]` initialisieren.
export interface StatisticsData {
  totalComplaints: number;
  totalPraises: number;
  totalSuggestions: number;
  complaintsByStatus: ComplaintByStatus[];
  complaintsOverTime: ComplaintOverTime[];
  complaintReasons: ComplaintReason[]; // Wird im Code zu `[]` wenn von API undefined/null
  averageProcessingTime: number | null;
  topComplaintLines: ComplaintHotspot[]; // Wird im Code zu `[]` wenn von API undefined/null
  topComplaintStops: ComplaintHotspot[]; // Wird im Code zu `[]` wenn von API undefined/null
  topComplaintTimes: ComplaintHotspot[]; // Wird im Code zu `[]` wenn von API undefined/null
  filterApplied: { startDate?: string; endDate?: string; isDefault: boolean };
}

// --- Animationsvarianten und Hilfskomponenten ---
const sectionVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }, };
const itemVariants = { hidden: { opacity: 0, y: 20, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.1 } }, };
const glassEffectBaseClasses = "bg-slate-800/50 backdrop-blur-2xl border border-slate-100/10 shadow-2xl shadow-black/30";
const glassEffectHoverClasses = "hover:bg-slate-800/60 hover:border-slate-100/20";
const RECHARTS_ANIMATION_DURATION = 800;
const RECHARTS_ANIMATION_EASING = 'ease-out';
const COLORS = { sky: '#0ea5e9', emerald: '#10b981', amber: '#f59e0b', red: '#ef4444', slate: '#94a3b8', complaintStatus: { 'Offen': '#38bdf8', 'In Bearbeitung': '#facc15', 'Gelöst': '#4ade80', 'Abgelehnt': '#f87171', 'Unbekannt': '#94a3b8' } as Record<ChartComplaintStatusType, string>, pie: ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#a855f7', '#6366f1', '#f43f5e', '#06b6d4', '#d946ef'] };

// Hilfskomponente für "Keine Daten"-Nachrichten
const NoDataDisplay = ({ message }: { message: string }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4">
        <BarChart3 size={36} className="mb-2 opacity-50" />
        <p className="text-center text-sm">{message}</p>
    </div>
);

// ChartWrapper: Zeigt entweder Lade-, Fehlerzustand oder den Inhalt (children) an.
const ChartWrapper = ({ title, children, icon: Icon, className = "", minHeightClass = "min-h-[320px] sm:min-h-[380px]" }: { title: string; children: ReactNode; icon?: React.ElementType; className?: string; minHeightClass?: string; }) => (
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
      {children}
    </div>
  </motion.div>
);

// StatCard: Definition wie im Original.
const StatCard = ({ title, value, icon: Icon, unit }: { title: string; value: string | number; icon: React.ElementType; unit?: string; }) => (
    <motion.div variants={itemVariants} className={`${glassEffectBaseClasses} p-5 sm:p-6 rounded-2xl flex flex-col justify-between min-h-[130px] transition-all duration-300 ${glassEffectHoverClasses} relative`} whileHover={{ y: -4, scale: 1.02, transition: { type: "spring", stiffness: 350, damping: 15 } }} >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="flex items-start justify-between"> <p className="text-sm text-slate-400 font-medium">{title}</p> <div className="p-2.5 bg-sky-500/15 rounded-lg"> <Icon size={24} className="text-sky-400 opacity-90" /> </div> </div>
        <p className="text-3xl sm:text-4xl font-bold text-slate-50 mt-1"> {value} {unit && <span className="text-lg sm:text-xl font-medium text-slate-400 ml-1.5">{unit}</span>} </p>
    </motion.div>
);

// ActionCard: Definition wie im Original.
const ActionCard = ({ title, icon: Icon, actionText, onActionClick, isDisabled = false, comingSoon = false }: { title: string; icon: React.ElementType; actionText: string; onActionClick?: () => void; isDisabled?: boolean; comingSoon?: boolean; }) => (
    <motion.div variants={itemVariants} className={`${glassEffectBaseClasses} p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all duration-300 ${isDisabled || comingSoon ? 'opacity-70 cursor-not-allowed' : glassEffectHoverClasses} relative`} whileHover={isDisabled || comingSoon ? {} : { y: -6, scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 15 } }} >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <Icon size={40} className={`mb-4 ${isDisabled || comingSoon ? 'text-slate-500' : 'text-emerald-400 opacity-90'}`} /> <h3 className={`text-lg font-semibold mb-1 ${isDisabled || comingSoon ? 'text-slate-400' : 'text-slate-100'}`}>{title}</h3> {comingSoon && <p className="text-xs text-amber-400 mb-3">(Bald verfügbar)</p>}
        <button onClick={isDisabled || comingSoon ? undefined : onActionClick} disabled={isDisabled || comingSoon} className="mt-auto bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 ease-out text-sm shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:bg-slate-600 disabled:hover:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none hover:disabled:shadow-none" > {actionText} </button>
    </motion.div>
);

// CustomTooltip: Definition wie im Original.
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => { if (active && payload && payload.length) { return ( <div className="bg-slate-800/90 backdrop-blur-md p-3 rounded-lg shadow-xl border border-slate-100/10"> <p className="text-sm text-sky-300 font-semibold mb-0.5">{label}</p> {payload.map((pld, index) => ( <div key={index} style={{ color: pld.color || COLORS.sky }}> <span className="text-xs text-slate-200">{`${pld.name || 'Wert'}: `}</span> <span className="text-xs font-semibold">{pld.value}</span> </div> ))} </div> ); } return null; };


export default function StatisticsView() {
  const { token } = useAuth();
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Für globale API-Fehler

  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("");
  // appliedStartDate/EndDate speichern die zuletzt für den API-Call verwendeten Daten
  const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);
  const [dateFilterError, setDateFilterError] = useState<string | null>(null); // Für lokale Fehler der Datumseingabe

  const fetchStatistics = useCallback(async (startDate?: string | null, endDate?: string | null) => {
    if (!token || !API_ENDPOINTS.statistik) {
      setError("Statistik-Endpunkt nicht konfiguriert oder kein Token.");
      setStatsData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null); // Globalen Fehler zurücksetzen
    setDateFilterError(null); // Lokalen Datumsfilterfehler zurücksetzen
    // setStatsData(null); // Alte Daten entfernen, während neue geladen werden. Führt zu kurzzeitigem "Keine Daten".

    let apiUrl = API_ENDPOINTS.statistik;
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (queryParams.toString()) {
      apiUrl += `?${queryParams.toString()}`;
    }

    try {
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errResponse = await response.json().catch(() => null);
        const errorDetail = errResponse?.details || errResponse?.error || `Serverfehler ${response.status}`;
        throw new Error(errorDetail);
      }

      // Wichtig: StatisticsApiResponse ist der Typ, den die API sendet.
      // Es kann sein, dass optionale Felder wie `complaintReasons` als `undefined` kommen.
      const apiData = await response.json() as Partial<StatisticsData>; // Teilweise Übereinstimmung erlauben

      // Normalisiere die Daten von der API zu unserem strikten StatisticsData Typ
      // Fehlende Arrays werden zu leeren Arrays.
      // Die API sollte idealerweise die volle Struktur liefern.
      setStatsData({
        totalComplaints: apiData.totalComplaints ?? 0,
        totalPraises: apiData.totalPraises ?? 0,
        totalSuggestions: apiData.totalSuggestions ?? 0,
        complaintsByStatus: apiData.complaintsByStatus || [],
        complaintsOverTime: apiData.complaintsOverTime || [],
        complaintReasons: (apiData.complaintReasons || []).slice(0, 10),
        averageProcessingTime: apiData.averageProcessingTime === undefined ? null : apiData.averageProcessingTime,
        topComplaintLines: (apiData.topComplaintLines || []).slice(0, 10),
        topComplaintStops: (apiData.topComplaintStops || []).slice(0, 10),
        topComplaintTimes: (apiData.topComplaintTimes || []).slice(0, 10),
        filterApplied: apiData.filterApplied || { // Fallback für filterApplied, falls API es nicht mitsendet
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            isDefault: !startDate && !endDate,
        }
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler beim Laden der Statistiken.";
      console.error("StatisticsView fetch error:", err, { apiUrl, startDate, endDate });
      setError(msg);
      setStatsData(null); // Im Fehlerfall alle Statistikdaten entfernen
    } finally {
      setIsLoading(false);
    }
  }, [token]);


  useEffect(() => {
    fetchStatistics(appliedStartDate, appliedEndDate); // Beim Mounten mit den initialen (null) Filtern laden
  }, [fetchStatistics, appliedStartDate, appliedEndDate]); // Neu laden, wenn sich die angewendeten Filter ändern (obwohl fetchStatistics schon via Button getriggert wird)

  const handleApplyDateFilter = () => {
    if (selectedStartDate && selectedEndDate && new Date(selectedStartDate) > new Date(selectedEndDate)) {
      setDateFilterError("Das Startdatum darf nicht nach dem Enddatum liegen.");
      return;
    }
    setDateFilterError(null);
    // Wichtig: Setze appliedStartDate/EndDate, damit der useEffect Trigger greift oder direkt fetchen
    setAppliedStartDate(selectedStartDate || null);
    setAppliedEndDate(selectedEndDate || null);
    // fetchStatistics(selectedStartDate || null, selectedEndDate || null); // Direkter Aufruf ist auch möglich
  };

  const handleClearDateFilter = () => {
    setSelectedStartDate("");
    setSelectedEndDate("");
    setDateFilterError(null);
    setAppliedStartDate(null);
    setAppliedEndDate(null);
    // fetchStatistics(null, null); // Direkter Aufruf
  };

  const handleComingSoon = (featureName: string) => { alert(`Die Funktion "${featureName}" ist bald verfügbar.`); };
  
  const isAnyDateSelectedForFilter = selectedStartDate || selectedEndDate;


  // Render-Logik für Ladezustand oder globalen Fehler
  if (isLoading && !statsData && !error) { // Initiales Laden
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={48} className="animate-spin mb-4 text-sky-500" />
        <p className="text-slate-300">Statistiken werden geladen...</p>
      </div>
    );
  }

  if (error) { // Globaler Fehler beim Laden der Statistiken
    return (
      <motion.div className="flex flex-col items-center justify-center min-h-[400px] text-red-300 bg-slate-800/30 p-8 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} >
        <AlertTriangle size={48} className="mb-4 opacity-80" />
        <h2 className="text-xl font-semibold mb-2 text-slate-100">Fehler beim Laden der Statistiken</h2>
        <p className="text-center max-w-md text-sm">{error}</p>
        <button onClick={() => fetchStatistics(appliedStartDate, appliedEndDate)} className="mt-6 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors" > Erneut versuchen </button>
      </motion.div>
    );
  }

  // Wenn weder geladen wird, noch ein Fehler vorliegt, aber keine Daten da sind (z.B. nach initialem Laden ohne Ergebnis)
  // Dieser Fall sollte durch die `NoDataDisplay` in den ChartWrappern oder spezifischen Sektionen behandelt werden,
  // falls `statsData` zwar nicht null ist, aber die Arrays leer sind.
  // Wenn `statsData` selbst `null` ist (und kein Fehler/Laden), ist das ein ungewöhnlicher Zustand, den wir oben abfangen.


  return (
    <motion.div className="space-y-10 sm:space-y-12 py-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} >
      {/* Filter Section */}
      <motion.section variants={sectionVariants} className={`${glassEffectBaseClasses} p-5 sm:p-6 rounded-2xl relative`}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-75"></div>
        <div className="flex flex-wrap items-end gap-4 md:gap-6">
          <div>
            <label htmlFor="startDate" className="block text-xs font-medium text-slate-300 mb-1.5">Startdatum</label>
            <input type="date" id="startDate" value={selectedStartDate} onChange={(e) => setSelectedStartDate(e.target.value)} max={selectedEndDate || undefined} className="bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-full sm:w-auto shadow-inner" style={{ colorScheme: 'dark' }} />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs font-medium text-slate-300 mb-1.5">Enddatum</label>
            <input type="date" id="endDate" value={selectedEndDate} onChange={(e) => setSelectedEndDate(e.target.value)} min={selectedStartDate || undefined} max={new Date().toISOString().split('T')[0]} className="bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-full sm:w-auto shadow-inner" style={{ colorScheme: 'dark' }} />
          </div>
          <motion.button onClick={handleApplyDateFilter} disabled={isLoading || !isAnyDateSelectedForFilter} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" whileHover={{ scale: isLoading || !isAnyDateSelectedForFilter ? 1 : 1.03 }} whileTap={{ scale: isLoading || !isAnyDateSelectedForFilter ? 1 : 0.97 }} > <FilterIcon size={16} /> Filter anwenden </motion.button>
          {(appliedStartDate || appliedEndDate) && ( <motion.button onClick={handleClearDateFilter} disabled={isLoading} className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" whileHover={{ scale: isLoading ? 1 : 1.03 }} whileTap={{ scale: isLoading ? 1 : 0.97 }} title="Datumsfilter zurücksetzen" > <XMarkIcon size={16} /> Zurücksetzen </motion.button> )}
        </div>
        {dateFilterError && ( <p className="text-xs text-red-400 mt-2">{dateFilterError}</p> )}
        
        {statsData?.filterApplied && (
            statsData.filterApplied.isDefault ?
            <p className="text-xs text-slate-400 mt-3">Gesamtdatenansicht. Wählen Sie einen Zeitraum für spezifische Analysen.</p> :
            (statsData.filterApplied.startDate && statsData.filterApplied.endDate ?
                <p className="text-xs text-sky-300 mt-3">Statistiken für: {formatDate(statsData.filterApplied.startDate)} - {formatDate(statsData.filterApplied.endDate)}</p> :
            statsData.filterApplied.startDate ?
                <p className="text-xs text-sky-300 mt-3">Statistiken ab: {formatDate(statsData.filterApplied.startDate)}</p> :
            statsData.filterApplied.endDate ?
                <p className="text-xs text-sky-300 mt-3">Statistiken bis: {formatDate(statsData.filterApplied.endDate)}</p> : null)
        )}
      </motion.section>

      {/* Gesamtübersicht */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <TrendingUp size={26} className="text-sky-400 mr-3" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Gesamtübersicht</h2> </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <StatCard title="Beschwerden" value={isLoading ? '-' : statsData?.totalComplaints ?? '-'} icon={MessageSquare} />
          <StatCard title="Lob" value={isLoading ? '-' : statsData?.totalPraises ?? '-'} icon={ThumbsUp} />
          <StatCard title="Anregungen" value={isLoading ? '-' : statsData?.totalSuggestions ?? '-'} icon={ClipboardList} />
        </div>
      </motion.section>

      {/* Beschwerde-Analyse */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <BarChart3 size={26} className="text-sky-400 mr-3" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Beschwerde-Analyse</h2> </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          <ChartWrapper title="Nach Status" icon={BarChart3}>
            {isLoading ? <Loader2 size={36} className="animate-spin text-sky-500 m-auto" /> : 
             !statsData || statsData.complaintsByStatus.length === 0 ? <NoDataDisplay message="Keine Statusdaten verfügbar." /> :
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData.complaintsByStatus} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.15} />
                  <XAxis type="number" allowDecimals={false} stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{ stroke: COLORS.slate, strokeOpacity: 0.3 }} />
                  <YAxis type="category" dataKey="status" stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={false} width={80} tick={{ dx: -5, fill: '#cbd5e1' }} />
                  <Tooltip cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Anzahl" radius={[0, 6, 6, 0]} barSize={20} isAnimationActive={true} animationDuration={RECHARTS_ANIMATION_DURATION} animationEasing={RECHARTS_ANIMATION_EASING}>
                    {statsData.complaintsByStatus.map((entry, index) => ( <Cell key={`cell-status-${index}`} fill={COLORS.complaintStatus[entry.status] || COLORS.sky} fillOpacity={0.9} /> ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          </ChartWrapper>
          <ChartWrapper title={statsData?.filterApplied?.isDefault === false ? 'Im Zeitraum' : 'Letzte 30 Tage'} icon={CalendarRange}>
            {isLoading ? <Loader2 size={36} className="animate-spin text-sky-500 m-auto" /> :
             !statsData || statsData.complaintsOverTime.length === 0 ? <NoDataDisplay message="Keine Zeitverlaufsdaten verfügbar." /> :
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData.complaintsOverTime} margin={{ top: 10, right: 20, left: -25, bottom: 5 }}>
                  <defs> <linearGradient id="colorComplaintsArea" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor={COLORS.sky} stopOpacity={0.7} /> <stop offset="95%" stopColor={COLORS.sky} stopOpacity={0.1} /> </linearGradient> </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.15} />
                  <XAxis dataKey="date" stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{ stroke: COLORS.slate, strokeOpacity: 0.3 }} />
                  <YAxis allowDecimals={false} stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{ stroke: COLORS.slate, strokeOpacity: 0.3 }} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Anzahl Beschwerden" stroke={COLORS.sky} strokeWidth={2} fillOpacity={1} fill="url(#colorComplaintsArea)" dot={{ r: 3, strokeWidth: 1.5, fill: '#1e293b', stroke: COLORS.sky }} activeDot={{ r: 7, strokeWidth: 2, fill: COLORS.sky, stroke: '#fff' }} isAnimationActive={true} animationDuration={RECHARTS_ANIMATION_DURATION + 200} animationEasing={RECHARTS_ANIMATION_EASING} />
                </AreaChart>
              </ResponsiveContainer>
            }
          </ChartWrapper>
        </div>
      </motion.section>

      {/* Weitere Details */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <ClipboardList size={26} className="text-sky-400 mr-3" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Weitere Details</h2> </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <ChartWrapper title="Top 10 Beschwerdegründe" icon={FileText} className="lg:col-span-2" minHeightClass="min-h-[480px] sm:min-h-[550px]">
            {isLoading ? <Loader2 size={36} className="animate-spin text-sky-500 m-auto" /> :
             !statsData || statsData.complaintReasons.length === 0 ? <NoDataDisplay message="Keine Daten zu Beschwerdegründen verfügbar." /> :
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={statsData.complaintReasons} margin={{ top: 5, right: 30, left: 10, bottom: 20 }} >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.1} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} stroke={COLORS.slate} fontSize={10} tickLine={false} axisLine={{ stroke: COLORS.slate, strokeOpacity: 0.3 }} />
                  <YAxis type="category" dataKey="reason" stroke={COLORS.slate} fontSize={11} tickLine={false} axisLine={false} width={220} tick={{ dx: -5, fill: '#cbd5e1', textAnchor: 'end' }} />
                  <Tooltip cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Anzahl" radius={[0, 8, 8, 0]} barSize={16} fillOpacity={0.9} isAnimationActive={true} animationDuration={RECHARTS_ANIMATION_DURATION} animationEasing={RECHARTS_ANIMATION_EASING}>
                    {statsData.complaintReasons.map((entry, index) => ( <Cell key={`cell-reason-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} /> ))}
                    <LabelList dataKey="count" position="right" style={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 500 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          </ChartWrapper>
          <StatCard title="Ø Bearbeitungszeit" value={isLoading ? '-' : statsData?.averageProcessingTime === null || statsData?.averageProcessingTime === undefined ? 'N/A' : statsData.averageProcessingTime} unit={isLoading || statsData?.averageProcessingTime === null || statsData?.averageProcessingTime === undefined ? "" : "Tage"} icon={Clock} />
        </div>
      </motion.section>

      {/* Beschwerde-Hotspots */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <AlertOctagon size={26} className="text-amber-400 mr-3" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Beschwerde-Hotspots (Top 10)</h2> </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {[
            { title: "Nach Linie", dataArray: statsData?.topComplaintLines, icon: TrainFront, yKeyWidth: 60 },
            { title: "Nach Haltestelle", dataArray: statsData?.topComplaintStops, icon: MapPin, yKeyWidth: 120 },
            { title: "Nach Uhrzeit", dataArray: statsData?.topComplaintTimes, icon: Clock, yKeyWidth: 70 },
          ].map((chartInfo) => (
            <ChartWrapper key={chartInfo.title} title={chartInfo.title} icon={chartInfo.icon} minHeightClass="min-h-[400px] sm:min-h-[450px]">
              {isLoading ? <Loader2 size={36} className="animate-spin text-sky-500 m-auto" /> :
               !chartInfo.dataArray || chartInfo.dataArray.length === 0 ? <NoDataDisplay message={`Keine ${chartInfo.title.toLowerCase().replace("nach ", "")}daten verfügbar.`} /> :
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartInfo.dataArray} layout="vertical" margin={{ top: 5, right: 45, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} strokeOpacity={0.1} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke={COLORS.slate} fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke={COLORS.slate} fontSize={10} width={chartInfo.yKeyWidth} tick={{ dx: -5, fill: '#cbd5e1', textAnchor: 'end' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }} />
                    <Bar dataKey="count" name="Anzahl" radius={[0, 6, 6, 0]} barSize={12} fill={COLORS.amber} fillOpacity={0.9} isAnimationActive={true} animationDuration={RECHARTS_ANIMATION_DURATION} animationEasing={RECHARTS_ANIMATION_EASING}>
                      <LabelList dataKey="count" position="right" style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 500 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              }
            </ChartWrapper>
          ))}
        </div>
      </motion.section>

      {/* Berichte & Export */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-5 sm:mb-6 px-1"> <FileSpreadsheet size={26} className="text-sky-400 mr-3" /> <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">Berichte & Export</h2> </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <ActionCard title="Präsentationsbericht (PDF)" icon={Presentation} actionText="Bericht erstellen" onActionClick={() => handleComingSoon("PDF Präsentationsbericht")} comingSoon={true} />
          <ActionCard title="Excel-Export (Rohdaten)" icon={FileSpreadsheet} actionText="Daten exportieren" onActionClick={() => handleComingSoon("Excel-Export")} comingSoon={true} />
        </div>
      </motion.section>
    </motion.div>
  );
}