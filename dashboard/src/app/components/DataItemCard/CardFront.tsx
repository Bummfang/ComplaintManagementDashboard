"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, UserIcon, PaperclipIcon, XCircleIcon, DownloadIcon, ReplaceIcon, UploadCloudIcon } from 'lucide-react';
import { 
    CardSpecificDataItem, 
    ViewType, 
    BeschwerdeItem
} from '@/app/types';
import { API_ENDPOINTS } from '@/app/constants';
import { formatDateTime, formatDate, formatTime } from '@/app/utils';
import DataField from '@/app/components/ui/DataField';

const contentItemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20 } }
};

// Type Guard, um zu prüfen, ob es ein BeschwerdeItem mit einem gültigen Anhangs-Dateinamen ist.
type BeschwerdeItemWithDefiniteAttachment = BeschwerdeItem & {
    attachment_filename: string; // Definitiv ein string
};

function isBeschwerdeAndHasAttachment( // Umbenannt für Klarheit
    item: CardSpecificDataItem,
    currentView: ViewType
): item is BeschwerdeItemWithDefiniteAttachment {
    if (currentView !== 'beschwerden') return false;
    // Sicherstellen, dass item auch die Struktur von BeschwerdeItem hat
    // attachment_filename ist in deinem BeschwerdeItem Typ optional.
    const potentialBeschwerde = item as BeschwerdeItem;
    return (
        'beschwerdegrund' in potentialBeschwerde && // Check für BeschwerdeItem-Struktur
        typeof potentialBeschwerde.attachment_filename === 'string' && 
        potentialBeschwerde.attachment_filename !== null
    );
}

interface CardFrontProps {
    item: CardSpecificDataItem; 
    currentView: ViewType;
    copiedCellKey: string | null;
    onCopyToClipboard: (textToCopy: string, cellKey: string) => void;
    itemTypePrefix: string;
    abgeschlossenText: string | null;
    abgeschlossenValueClassName: string;
    isStatusRelevantView: boolean;
    statusDisplayClass: string;
    statusToDisplay: string;
    
    selectedFile: File | null; 
    onFileSelect: (file: File | null) => void;
    
    // Callbacks und Zustände von DataItemCard
    onRemoveAttachment?: () => void;
    onUploadSelectedFile?: () => void; 
    isUploadingFile?: boolean; // Umbenannt zu isProcessingFile in DataItemCard, hier auch anpassen für Konsistenz
    isProcessingFile?: boolean; // Neuer Name für den Ladezustand

    isLocked?: boolean;
}

const CardFront: React.FC<CardFrontProps> = ({
    item,
    currentView,
    copiedCellKey,
    onCopyToClipboard,
    itemTypePrefix,
    abgeschlossenText,
    abgeschlossenValueClassName,
    isStatusRelevantView,
    statusDisplayClass,
    statusToDisplay,
    selectedFile,
    onFileSelect,
    onRemoveAttachment,
    onUploadSelectedFile,
    isProcessingFile, // Angepasster Prop-Name
    isLocked,
}) => {
    const cardKey = `card-${currentView}-${item.id}`;

    const isBeschwerdeTypeCheck = (dataItem: CardSpecificDataItem): dataItem is BeschwerdeItem => {
        return currentView === 'beschwerden' && 'beschwerdegrund' in dataItem;
    };
    const beschwerdeItemData = isBeschwerdeTypeCheck(item) ? item : null;

    const handleLocalFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked || isProcessingFile) return;
        const file = event.target.files?.[0];
        if (file && file.type === "application/pdf") {
            onFileSelect(file);
        } else if (file) {
            alert("Bitte nur PDF-Dateien auswählen.");
            onFileSelect(null);
            event.target.value = "";
        } else {
            onFileSelect(null);
        }
    };

    const removeSelectedLocalFile = () => {
        if (isLocked || isProcessingFile) return;
        onFileSelect(null);
        const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    const fileInputId = `pdf-upload-${item.id}-${currentView}`;

    const triggerFileInput = () => {
        if (isLocked || isProcessingFile) return;
        document.getElementById(fileInputId)?.click();
    };

    let downloadUrl: string | undefined = undefined;
    let dbAttachmentFilename: string | null = null;

    // Nutze den spezifischeren Guard
    if (isBeschwerdeAndHasAttachment(item, currentView)) {
        dbAttachmentFilename = item.attachment_filename; 
        const beschwerdenApiBase = API_ENDPOINTS.beschwerden;
        if (beschwerdenApiBase && item.id) {
            downloadUrl = `${beschwerdenApiBase}/${item.id}/attachment`;
        }
    }
    
    const showUploadButtonForSelectedFile = selectedFile && typeof onUploadSelectedFile === 'function' && !isLocked && !isProcessingFile;

    return (
        <div className="p-4 md:p-5 flex flex-col flex-grow">
            <motion.div variants={contentItemVariants} className="flex justify-between items-start mb-2.5">
                <h3 className="text-md font-semibold text-slate-100 hover:text-white transition-colors break-words pr-2"> {item.betreff || "Unbekannter Betreff"} </h3>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-2 pt-0.5">ID: {itemTypePrefix}{item.id}</span>
            </motion.div>
            <motion.div variants={contentItemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs mb-1">
                <DataField label="Name" value={item.name} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-name`} fieldKey={`${cardKey}-name`} />
                <DataField label="Email" value={item.email} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-email`} fieldKey={`${cardKey}-email`} />
                <DataField label="Tel." value={item.tel} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-tel`} fieldKey={`${cardKey}-tel`} />
                <DataField label="Erstellt am" value={formatDateTime(item.erstelltam)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-erstelltam`} fieldKey={`${cardKey}-erstelltam`} copyValue={item.erstelltam} icon={ClockIcon} />
                {item.bearbeiter_id !== null && item.bearbeiter_id !== undefined && ( <DataField label="Bearbeiter" value={String(item.bearbeiter_name || `ID: ${item.bearbeiter_id}`)} fieldKey={`${cardKey}-bearbeiter`} icon={UserIcon} /> )}
                {isStatusRelevantView && ( <DataField label="Status" value={statusToDisplay} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-status`} fieldKey={`${cardKey}-status`} valueClassName={statusDisplayClass} /> )}
                {isStatusRelevantView && abgeschlossenText !== null && ( <DataField label="Bearbeitungsende" value={abgeschlossenText} fieldKey={`${cardKey}-abgeschlossen`} valueClassName={abgeschlossenValueClassName} icon={ClockIcon} onCopy={item.abgeschlossenam ? onCopyToClipboard : undefined} isCopied={item.abgeschlossenam ? (copiedCellKey === `${cardKey}-abgeschlossen`) : false} copyValue={item.abgeschlossenam || undefined} /> )}
                {beschwerdeItemData && ( <> <DataField label="Beschwerdegrund" value={beschwerdeItemData.beschwerdegrund} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-grund`} fieldKey={`${cardKey}-grund`} /> <DataField label="Vorfalldatum" value={formatDate(beschwerdeItemData.datum)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vdatum`} fieldKey={`${cardKey}-vdatum`} copyValue={beschwerdeItemData.datum} /> <DataField label="Vorfallzeit" value={formatTime(beschwerdeItemData.uhrzeit)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vzeit`} fieldKey={`${cardKey}-vzeit`} copyValue={beschwerdeItemData.uhrzeit} /> <DataField label="Linie" value={beschwerdeItemData.linie} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-linie`} fieldKey={`${cardKey}-linie`} /> <DataField label="Haltestelle" value={beschwerdeItemData.haltestelle} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-hst`} fieldKey={`${cardKey}-hst`} /> </> )}
            </motion.div>
            <motion.div variants={contentItemVariants} className="mt-2 py-1 flex flex-col">
                <span className="text-xs text-slate-400 block mb-0.5">Beschreibung</span>
                <div className="text-slate-200 text-xs whitespace-pre-wrap break-words max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/70 scrollbar-track-slate-700/30 pt-1 pb-1 min-h-[40px] flex-grow">{item.beschreibung || ( <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="italic text-slate-500" > Keine Beschreibung vorhanden. </motion.span> )}</div>
            </motion.div>

            {currentView === 'beschwerden' && (
                <motion.div variants={contentItemVariants} className="mt-3 pt-3 border-t border-slate-700/40 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">
                            PDF-Anhang {isLocked && !isProcessingFile ? "(Gesperrt)" : ""} {isProcessingFile ? "(Verarbeite Datei...)" : ""}
                        </span>
                    </div>

                    <input type="file" id={fileInputId} accept=".pdf" onChange={handleLocalFileChange} className="hidden" disabled={isLocked || isProcessingFile} />

                    {/* Fall 1: Anhang aus DB vorhanden */}
                    {dbAttachmentFilename && downloadUrl && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-700/50 px-2 py-1.5 rounded-md">
                                <PaperclipIcon size={14} className="text-sky-400 shrink-0" />
                                <span className="truncate flex-grow" title={dbAttachmentFilename}> {dbAttachmentFilename} </span>
                                <a href={downloadUrl} download={dbAttachmentFilename} className={`p-1 text-sky-400 hover:text-sky-300 transition-colors ${isLocked || isProcessingFile ? "cursor-not-allowed opacity-50" : ""}`} title="Anhang herunterladen" onClick={(e) => { if (isLocked || isProcessingFile) e.preventDefault(); }} rel="noopener noreferrer" >
                                    <DownloadIcon size={16} />
                                </a>
                            </div>
                            {!isLocked && !isProcessingFile && (
                                <div className="flex gap-2">
                                    <button onClick={triggerFileInput} className="flex-1 cursor-pointer bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5">
                                        <ReplaceIcon size={14} /> Ersetzen
                                    </button>
                                    {typeof onRemoveAttachment === 'function' && (
                                    <button onClick={onRemoveAttachment} className="flex-1 cursor-pointer bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5">
                                        <XCircleIcon size={14} /> Löschen
                                    </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Anzeigen, wenn eine lokale Datei ausgewählt wurde (entweder neu oder als Ersatz) */}
                    {selectedFile && (
                        <div className={`space-y-2 ${dbAttachmentFilename ? 'mt-2 pt-2 border-t border-slate-700/30' : 'mt-1'}`}> {/* Abstand wenn schon DB Anhang da ist */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-300">{dbAttachmentFilename ? 'Neue Auswahl:' : 'Ausgewählt:'}</span>
                                <div className="flex items-center gap-1 text-xs text-amber-400 bg-slate-700/50 px-2 py-1 rounded-md flex-grow">
                                    <PaperclipIcon size={14} className="shrink-0" />
                                    <span className="truncate" title={selectedFile.name}>{selectedFile.name}</span>
                                </div>
                                {(!isLocked && !isProcessingFile) && (
                                    <button onClick={removeSelectedLocalFile} className="text-red-400 hover:text-red-300 p-1" title="Lokale Auswahl entfernen">
                                        <XCircleIcon size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Upload-Button für die ausgewählte lokale Datei (wenn keine DB-Datei da ist oder wenn eine lokale Datei als Ersatz gewählt wurde) */}
                    {showUploadButtonForSelectedFile && (
                         <button 
                            onClick={onUploadSelectedFile} 
                            disabled={isProcessingFile} 
                            className="w-full mt-2 cursor-pointer bg-green-600 hover:bg-green-500 disabled:bg-slate-500 disabled:cursor-wait text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5"
                        >
                            {isProcessingFile ? (
                                <motion.svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></motion.svg>
                            ) : ( <UploadCloudIcon size={14} /> )}
                            {isProcessingFile ? 'Wird verarbeitet...' : `"${selectedFile?.name}" hochladen`}
                        </button>
                    )}
                    
                    {/* Fall: Kein DB-Anhang UND KEINE lokal ausgewählte Datei -> Button zum Auswählen anzeigen */}
                    {!dbAttachmentFilename && !selectedFile && (
                        <>
                            <button onClick={triggerFileInput} disabled={isLocked || isProcessingFile} className={`w-full cursor-pointer bg-sky-600 hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5`}>
                                <PaperclipIcon size={14} /> PDF auswählen
                            </button>
                            <p className="text-xs text-slate-500 mt-1">Keine PDF angehängt.</p>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default CardFront;