// app/components/ReportBuilderModal.tsx
"use client";

import { XIcon as XMarkIcon, FileText, PlusCircle, Trash2, GripVertical, BarChart3, LineChart, PieChart, List, AlertTriangle, CalendarClock, Globe, ShieldCheck, Pilcrow, MessageSquare, Library } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useState, useMemo } from 'react';
import { ALLE_LINIEN, ALLE_HALTESTELLEN, COMPLAINT_REASONS } from '@/app/constants/index';
import { REPORT_TEXT_MODULES } from '@/app/constants/textModules';
import type { FC, ReactNode } from 'react';

// =================================================================================
//  TYP-DEFINITIONEN & KONSTANTEN FÜR MODULARITÄT
// =================================================================================

// Definiert die Struktur für jeden visuellen Berichtsbaustein
export interface ReportComponent {
  id: 'summary' | 'timeline' | 'reason_pie' | 'hotspot_bars' | 'details_table' | 'comparison_yoy' | 'multi_year_overview' | 'feedback_type_pie' | 'no_incident_proof';
  title: string;
  description: string;
  icon: React.ElementType;
}

// Definiert die Struktur für einen Textblock im Bericht
export interface TextBlock {
  instanceId: string; // Eindeutige ID für diesen spezifischen Block in der Liste
  type: 'module' | 'custom';
  moduleId?: string;   // ID aus REPORT_TEXT_MODULES
  content: string;
}

// Array aller verfügbaren *visuellen* Bausteine.
const AVAILABLE_VISUAL_COMPONENTS: readonly ReportComponent[] = [
  { id: 'summary', title: 'Statistische Übersicht (Zeitraum)', description: 'Zentrale Kennzahlen für den ausgewählten Zeitraum.', icon: BarChart3 },
  { id: 'timeline', title: 'Zeitlicher Verlauf', description: 'Grafik der Vorfälle über den ausgewählten Zeitraum.', icon: LineChart },
  { id: 'reason_pie', title: 'Beschwerdegründe (Zeitraum)', description: 'Kuchendiagramm der Top-Beschwerdegründe.', icon: PieChart },
  { id: 'hotspot_bars', title: 'Hotspot-Analyse (Zeitraum)', description: 'Balkendiagramme für Top-Linien & -Haltestellen.', icon: AlertTriangle },
  { id: 'details_table', title: 'Liste der Einzelvorfälle', description: 'Detaillierte Tabelle aller gefilterten Beschwerden.', icon: List },
  { id: 'no_incident_proof', title: 'Nachweis "Keine Vorfälle"', description: 'Bestätigt, dass keine Beschwerden zum Filter passen.', icon: ShieldCheck },
  { id: 'feedback_type_pie', title: 'Feedback-Typen (Gesamt)', description: 'Verhältnis von Beschwerden, Lob und Anregungen.', icon: PieChart },
  { id: 'multi_year_overview', title: 'Mehrjahresvergleich (Anzahl)', description: 'Vergleicht die Anzahl der Meldungen über mehrere Jahre.', icon: Globe },
  { id: 'comparison_yoy', title: 'Vorjahresvergleich (Häufigkeit)', description: 'Vergleicht die Beschwerdehäufigkeit mit dem Vorjahr.', icon: CalendarClock },
];

// =================================================================================
//  UI-HILFSKOMPONENTEN
// =================================================================================

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
    {children}
  </div>
);

// =================================================================================
//  HAUPTKOMPONENTE: ReportBuilderModal
// =================================================================================

export default function ReportBuilderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
    // === STATE-MANAGEMENT ===
    const [reportTitle, setReportTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedLinie, setSelectedLinie] = useState('');
    const [selectedHaltestelle, setSelectedHaltestelle] = useState('');
    const [selectedReason, setSelectedReason] = useState('');
    const [comparisonYears, setComparisonYears] = useState<number>(3);
    
    // Visuelle Bausteine
    const [selectedVisualComponents, setSelectedVisualComponents] = useState<ReportComponent[]>([]);
    // Text-Bausteine
    const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);


    // === LOGIK & HANDLER ===

    // --- Handler für visuelle Bausteine ---
    const handleAddVisualComponent = (component: ReportComponent) => {
        if (!selectedVisualComponents.some(c => c.id === component.id)) {
            setSelectedVisualComponents(prev => [...prev, component]);
        }
    };
    const handleRemoveVisualComponent = (componentId: string) => {
        setSelectedVisualComponents(prev => prev.filter(c => c.id !== componentId));
    };
    const availableVisualComponentsToDisplay = useMemo(() => {
        const selectedIds = new Set(selectedVisualComponents.map(c => c.id));
        return AVAILABLE_VISUAL_COMPONENTS.filter(c => !selectedIds.has(c.id));
    }, [selectedVisualComponents]);

    // --- Handler für Text-Bausteine ---
    const handleAddTextModule = (moduleId: string) => {
        const module = REPORT_TEXT_MODULES.flatMap(c => c.modules).find(m => m.id === moduleId);
        if (module) {
            const newBlock: TextBlock = { instanceId: crypto.randomUUID(), type: 'module', moduleId: module.id, content: module.text };
            setTextBlocks(prev => [...prev, newBlock]);
        }
    };
    const handleAddCustomTextBlock = () => {
        const newBlock: TextBlock = { instanceId: crypto.randomUUID(), type: 'custom', content: '' };
        setTextBlocks(prev => [...prev, newBlock]);
    };
    const handleUpdateTextBlockContent = (instanceId: string, newContent: string) => {
        setTextBlocks(prev => prev.map(block => block.instanceId === instanceId ? { ...block, content: newContent } : block));
    };
    const handleRemoveTextBlock = (instanceId: string) => {
        setTextBlocks(prev => prev.filter(block => block.instanceId !== instanceId));
    };
    
    // --- Handler zum Erstellen des Berichts ---
    const handleCreateReport = () => {
        console.log("=====================================================");
        console.log("BERICHT-KONFIGURATION FÜR BACKEND BEREITGESTELLT");
        console.log("=====================================================");
        console.log({
            title: reportTitle || "Unbenannter Bericht",
            dateRange: { start: startDate, end: endDate },
            filters: { linie: selectedLinie, haltestelle: selectedHaltestelle, reason: selectedReason },
            layout: selectedVisualComponents.map(c => c.id),
            textBlocks: textBlocks.map(block => block.content), // Sendet eine saubere, geordnete Liste von Text-Strings
            config: {
                multi_year_overview: { years: comparisonYears },
            }
        });
        console.log("=====================================================");
    };

    const showMultiYearConfig = useMemo(() => selectedVisualComponents.some(c => c.id === 'multi_year_overview'), [selectedVisualComponents]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-7xl text-white overflow-hidden flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-slate-700">
                            <div className="flex items-center gap-3"><FileText className="text-sky-400" size={24} /><h2 className="text-xl font-semibold">Bericht Konfigurieren & Zusammenstellen</h2></div>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"><XMarkIcon size={20} /></button>
                        </div>
                        <div className="flex-grow flex flex-col lg:flex-row min-h-0">
                            {/* LINKE SPALTE: Globale Einstellungen */}
                            <div className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0 p-6 space-y-5 overflow-y-auto border-r border-slate-700">
                                <Section title="1. Bericht benennen"><input type="text" placeholder="z.B. Analyse Verspätungen Q3" className="w-full bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} /></Section>
                                <Section title="2. Zeitraum definieren (für Detailanalysen)"><div className="flex flex-col gap-4"><input type="date" className="w-full bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500" style={{ colorScheme: 'dark' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} /><input type="date" className="w-full bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500" style={{ colorScheme: 'dark' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div></Section>
                                <Section title="3. Daten filtern (optional)"><div className="space-y-4"><select className="w-full bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500" value={selectedLinie} onChange={(e) => setSelectedLinie(e.target.value)}><option value="">Alle Linien</option>{ALLE_LINIEN.map(linie => (<option key={linie} value={linie}>{linie}</option>))}</select><select className="w-full bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500" value={selectedHaltestelle} onChange={(e) => setSelectedHaltestelle(e.target.value)}><option value="">Alle Haltestellen</option>{ALLE_HALTESTELLEN.map(stop => (<option key={stop} value={stop}>{stop}</option>))}</select><select className="w-full bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500" value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}><option value="">Alle Gründe</option>{COMPLAINT_REASONS.map(reason => (<option key={reason} value={reason}>{reason}</option>))}</select></div></Section>
                                {showMultiYearConfig && (<Section title="Konfiguration: Mehrjahresvergleich"><div className="flex items-center gap-2"><label htmlFor="comparisonYears" className="text-sm text-slate-400">Vergleichsjahre:</label><input type="number" id="comparisonYears" min="1" max="10" value={comparisonYears} onChange={(e) => setComparisonYears(parseInt(e.target.value, 10))} className="w-20 bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-sky-500" /></div></Section>)}
                            </div>
                            
                            {/* MITTLERE SPALTE: Baukasten */}
                            <div className="w-full lg:w-1/3 xl:w-1/3 flex flex-col p-6 overflow-y-auto border-r border-slate-700">
                                <Section title="4. Visuelle Bausteine hinzufügen">
                                    <div className="space-y-2">
                                      {availableVisualComponentsToDisplay.map((component) => (<button key={component.id} onClick={() => handleAddVisualComponent(component)} className="w-full flex items-center gap-3 p-3 text-left bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"><component.icon className="w-6 h-6 text-sky-400 flex-shrink-0" /><div><h4 className="font-semibold text-sm text-slate-100">{component.title}</h4><p className="text-xs text-slate-400">{component.description}</p></div><PlusCircle className="w-5 h-5 text-slate-400 ml-auto flex-shrink-0" /></button>))}
                                    </div>
                                </Section>
                                <div className="border-t border-slate-700 my-5"></div>
                                <Section title="5. Text-Inhalte hinzufügen">
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Textbaustein-Bibliothek</h4>
                                        <select onChange={(e) => handleAddTextModule(e.target.value)} className="w-full bg-slate-700/80 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500">
                                            <option>Textbaustein auswählen...</option>
                                            {REPORT_TEXT_MODULES.map(category => (<optgroup key={category.category} label={category.category} className="font-bold text-sky-300">{category.modules.map(m => (<option key={m.id} value={m.id} className="text-slate-200 font-normal p-1">{m.text}</option>))}</optgroup>))}
                                        </select>
                                        <button onClick={handleAddCustomTextBlock} className="w-full flex items-center justify-center gap-2 p-2 text-sm bg-sky-800/50 hover:bg-sky-800/80 rounded-lg transition-colors border border-sky-800/70 text-sky-200"><PlusCircle size={16}/> Eigenen Textblock hinzufügen</button>
                                    </div>
                                </Section>
                            </div>

                            {/* RECHTE SPALTE: Bericht-Vorschau & Anordnung */}
                            <div className="w-full lg:w-1/3 xl:w-1/3 flex flex-col p-6 overflow-y-auto">
                                <Section title="6. Finales Layout (Drag & Drop)">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 min-h-[50vh]">
                                        <h4 className="text-sm font-semibold text-slate-100 mb-2">{reportTitle || "Ihr Bericht"}</h4>
                                        <p className="text-xs text-slate-400 mb-4">Vom {startDate || '...'} bis {endDate || '...'}</p>
                                        <div className="border-t border-slate-700 my-2"></div>
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Visuelle Elemente</h4>
                                        {selectedVisualComponents.length > 0 ? (
                                            <Reorder.Group axis="y" values={selectedVisualComponents} onReorder={setSelectedVisualComponents} className="space-y-2 mb-4">
                                                {selectedVisualComponents.map((component) => (<Reorder.Item key={component.id} value={component} className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg cursor-grab active:cursor-grabbing"><GripVertical className="w-5 h-5 text-slate-500" /><component.icon className="w-5 h-5 text-sky-400 flex-shrink-0" /><span className="font-medium text-sm text-slate-200">{component.title}</span><button onClick={() => handleRemoveVisualComponent(component.id)} className="ml-auto p-1 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button></Reorder.Item>))}
                                            </Reorder.Group>
                                        ) : <p className="text-xs text-slate-500 italic mb-4">Keine visuellen Elemente ausgewählt.</p>}
                                        
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Text-Abschnitte</h4>
                                        {textBlocks.length > 0 ? (
                                            <Reorder.Group axis="y" values={textBlocks} onReorder={setTextBlocks} className="space-y-2">
                                                {textBlocks.map((block) => (<Reorder.Item key={block.instanceId} value={block} className="p-2 bg-slate-800 rounded-lg cursor-grab active:cursor-grabbing">
                                                    <div className="flex items-center gap-3 mb-2"><GripVertical className="w-5 h-5 text-slate-500 flex-shrink-0" /><Library size={16} className={`flex-shrink-0 ${block.type === 'module' ? 'text-green-400' : 'text-purple-400'}`} /><span className="text-xs font-semibold">{block.type === 'module' ? 'Textbaustein' : 'Eigener Text'}</span><button onClick={() => handleRemoveTextBlock(block.instanceId)} className="ml-auto p-1 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button></div>
                                                    <textarea value={block.content} onChange={(e) => handleUpdateTextBlockContent(block.instanceId, e.target.value)} placeholder="Schreiben Sie hier Ihren Text..." rows={block.type === 'module' ? 4 : 2} className="w-full bg-slate-700/60 text-slate-200 border border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-sky-500"></textarea>
                                                </Reorder.Item>))}
                                            </Reorder.Group>
                                        ) : <p className="text-xs text-slate-500 italic">Keine Text-Abschnitte ausgewählt.</p>}
                                    </div>
                                </Section>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center justify-end gap-4 p-5 bg-slate-800/50 border-t border-slate-700">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 bg-slate-600 hover:bg-slate-500 font-semibold transition-colors">Abbrechen</button>
                            <button onClick={handleCreateReport} className="px-5 py-2 rounded-lg text-white bg-sky-600 hover:bg-sky-500 font-semibold transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Bericht erstellen</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
