// app/components/ReportBuilderModal.tsx

"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { XIcon as XMarkIcon, FilePlus, Clock, List, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { ReportBlock, ReportBlockType, ReportDefinition, ReportDataResponse } from '../types/reports';
import React, { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer'; 
import { saveAs } from 'file-saver'; 
import { ReportDocument } from './ReportDocument'; 


function BlockConfigurationForm({ block, onUpdate }: { block: ReportBlock; onUpdate: (updatedBlock: ReportBlock) => void; }) {
  const [formData, setFormData] = useState(block);
  useEffect(() => { setFormData(block); }, [block]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'startDate' || name === 'endDate' || name === 'limit' || name === 'topNSubject') {
      setFormData(prev => ({ ...prev, filters: { ...prev.filters, [name]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleBlur = () => { onUpdate(formData); };
  
  return (
    <div className="bg-slate-900/50 p-4 mt-3 rounded-md space-y-4">
      <div>
        <label htmlFor={`title-${block.id}`} className="block text-xs font-medium text-slate-300 mb-1">Titel des Blocks</label>
        <input type="text" id={`title-${block.id}`} name="title" value={formData.title} onChange={handleInputChange} onBlur={handleBlur} className="bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-3 py-1.5 text-sm w-full focus:ring-1 focus:ring-sky-500" />
      </div>
      {block.type === 'TIME_SERIES' && (
        <div className="grid grid-cols-2 gap-4">
          <div><label htmlFor={`startDate-${block.id}`} className="block text-xs font-medium text-slate-300 mb-1">Startdatum</label><input type="date" id={`startDate-${block.id}`} name="startDate" value={formData.filters.startDate || ''} onChange={handleInputChange} onBlur={handleBlur} className="bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-3 py-1.5 text-sm w-full" style={{ colorScheme: 'dark' }}/></div>
          <div><label htmlFor={`endDate-${block.id}`} className="block text-xs font-medium text-slate-300 mb-1">Enddatum</label><input type="date" id={`endDate-${block.id}`} name="endDate" value={formData.filters.endDate || ''} onChange={handleInputChange} onBlur={handleBlur} className="bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-3 py-1.5 text-sm w-full" style={{ colorScheme: 'dark' }}/></div>
        </div>
      )}
      {block.type === 'TOP_N_LIST' && (
        <div className="grid grid-cols-2 gap-4">
          <div><label htmlFor={`topNSubject-${block.id}`} className="block text-xs font-medium text-slate-300 mb-1">Thema der Liste</label><select id={`topNSubject-${block.id}`} name="topNSubject" value={formData.filters.topNSubject || 'reasons'} onChange={handleInputChange} onBlur={handleBlur} className="bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-3 py-1.5 text-sm w-full"><option value="reasons">Beschwerdegründe</option><option value="lines">Linien</option><option value="stops">Haltestellen</option></select></div>
          <div><label htmlFor={`limit-${block.id}`} className="block text-xs font-medium text-slate-300 mb-1">Anzahl (Top N)</label><input type="number" id={`limit-${block.id}`} name="limit" min="1" max="20" value={formData.filters.limit || 10} onChange={handleInputChange} onBlur={handleBlur} className="bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-3 py-1.5 text-sm w-full" /></div>
        </div>
      )}
    </div>
  );
}

// --- Hauptkomponente ---
export function ReportBuilderModal({ onClose }: { onClose: () => void; }) {
  // HINZUGEFÜGT: States für Titel, Ladezustand und Fehler
  const [reportTitle, setReportTitle] = useState("Neuer Bericht");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<ReportBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const handleAddBlock = (type: ReportBlockType) => {
    const newBlock: ReportBlock = { id: crypto.randomUUID(), type, title: `Neue ${type === 'TIME_SERIES' ? 'Zeitverlauf-Analyse' : 'Top-Liste'}`, filters: { limit: 10, topNSubject: 'reasons' } };
    setBlocks(prev => [...prev, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const handleRemoveBlock = (idToRemove: string) => { setBlocks(prev => prev.filter(block => block.id !== idToRemove)); };
  const handleUpdateBlock = (updatedBlock: ReportBlock) => { setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b)); };
  const toggleActiveBlock = (id: string) => { setActiveBlockId(prevId => (prevId === id ? null : id)); };

  // HINZUGEFÜGT: Die Funktion zur Berichtserstellung
 const handleGenerateReport = async () => {
  if (blocks.length === 0) {
    setError("Bitte fügen Sie mindestens einen Analyse-Block hinzu.");
    setTimeout(() => setError(null), 3000);
    return;
  }
  setIsGenerating(true);
  setError(null);

  const reportDefinition: ReportDefinition = {
    reportTitle: reportTitle,
    generatedAt: new Date().toISOString(),
    blocks: blocks,
  };

  try {
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportDefinition)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `Serverfehler: ${response.statusText}`);
    }

    const reportData: ReportDataResponse = await response.json();
    console.log("Antwort vom Backend erhalten, starte PDF-Generierung:", reportData);

    // PDF-GENERIERUNG UND DOWNLOAD
    const blob = await pdf(<ReportDocument response={reportData} />).toBlob();
    saveAs(blob, `<span class="math-inline">\{reportTitle\.replace\(/ /g, '\_'\)\}\_</span>{new Date().toISOString().split('T')[0]}.pdf`);

    onClose();

  } catch (err) {
    console.error("Fehler bei der Berichtserstellung:", err);
    setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.");
  } finally {
    setIsGenerating(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={isGenerating ? undefined : onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          {/* GEÄNDERT: Titel ist jetzt ein Eingabefeld */}
          <div className="flex items-center gap-3">
            <FilePlus className="text-sky-400" size={24} />
            <input type="text" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="bg-transparent text-xl font-semibold text-slate-100 focus:outline-none focus:border-b border-sky-500 w-full" />
          </div>
          <button onClick={onClose} disabled={isGenerating} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors disabled:opacity-50"><XMarkIcon size={20} /></button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Ihre Analyse-Blöcke</h3>
            <div className="space-y-3">
              {blocks.length > 0 ? (
                blocks.map(block => (
                  <div key={block.id} className="bg-slate-700/50 rounded-lg p-4 animate-fade-in">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleActiveBlock(block.id)}>
                      <div className="flex items-center gap-3">
                        <span className="p-1.5 bg-slate-600 rounded-md">
                          {block.type === 'TIME_SERIES' && <Clock className="text-sky-300" size={20} />}
                          {block.type === 'TOP_N_LIST' && <List className="text-amber-300" size={20} />}
                        </span>
                        <span className="text-slate-100 font-medium">{block.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block.id); }} className="p-1.5 rounded-md text-slate-500 hover:bg-red-500/20 hover:text-red-400"><Trash2 size={16} /></button>
                        <ChevronDown className={`text-slate-400 transition-transform duration-300 ${activeBlockId === block.id ? 'rotate-180' : ''}`} size={20}/>
                      </div>
                    </div>
                    <AnimatePresence>
                      {activeBlockId === block.id && (
                        <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                           <BlockConfigurationForm block={block} onUpdate={handleUpdateBlock} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              ) : ( <p className="text-slate-500 text-sm p-4 text-center bg-slate-900/50 rounded-lg">Fügen Sie Ihren ersten Analyse-Block hinzu, um zu beginnen.</p> )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Block-Bibliothek</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
               <button onClick={() => handleAddBlock('TIME_SERIES')} className="p-4 bg-slate-700/70 hover:bg-slate-700 rounded-lg text-left transition-colors flex items-center gap-3"><Clock className="text-emerald-400" size={24} /><div><p className="font-semibold text-slate-100">Zeitverlauf</p><p className="text-xs text-slate-400">Anzahl über Zeit.</p></div></button>
               <button onClick={() => handleAddBlock('TOP_N_LIST')} className="p-4 bg-slate-700/70 hover:bg-slate-700 rounded-lg text-left transition-colors flex items-center gap-3"><List className="text-amber-400" size={24} /><div><p className="font-semibold text-slate-100">Top-Liste</p><p className="text-xs text-slate-400">z.B. Top 10 Gründe.</p></div></button>
            </div>
          </div>
        </div>
        
        {/* GEÄNDERT: Footer mit Ladezustand und Fehleranzeige */}
        <div className="flex items-center justify-between gap-4 p-5 border-t border-slate-700 bg-slate-800/50">
           {error && <p className="text-xs text-red-400 animate-fade-in max-w-xs truncate" title={error}>Fehler: {error}</p>}
           <div className="flex items-center justify-end gap-4 flex-grow">
               <button onClick={onClose} disabled={isGenerating} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50">Abbrechen</button>
               <button onClick={handleGenerateReport} disabled={isGenerating || blocks.length === 0} className="px-5 py-2 w-40 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                 {isGenerating ? <Loader2 className="animate-spin" size={20} /> : "Bericht erstellen"}
               </button>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}