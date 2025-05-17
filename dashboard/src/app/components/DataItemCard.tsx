// app/components/DataItemCard.tsx
"use client";

import { motion } from 'framer-motion';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { DataItem, BeschwerdeItem, ViewType } from '../types'; // Pfad anpassen
import { formatDate, formatTime } from '../utils'; // Pfad anpassen

// DataField könnte auch eine eigene Datei sein (z.B. ./ui/DataField.tsx)
const DataField = ({ label, value, onCopy, isCopied, copyValue, fieldKey }: { label: string, value?: string | null, onCopy: (text: string, key: string) => void, isCopied: boolean, copyValue?: string, fieldKey: string }) => {
    const displayValue = value || "N/A";
    const actualCopyValue = copyValue || displayValue;
    return (
        <div className="py-1.5">
            <span className="text-xs text-slate-400 block">{label}</span>
            <div className="flex items-center group">
                <span className="text-slate-100 break-words">{displayValue}</span>
                {displayValue !== "N/A" && (
                    <button
                        onClick={() => onCopy(actualCopyValue, fieldKey)}
                        className="ml-2 p-0.5 text-slate-400 hover:text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={isCopied ? "Kopiert!" : "Kopieren"}
                    >
                        {isCopied ? <CheckIcon size={14} className="text-green-400"/> : <CopyIcon size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
};


interface DataItemCardProps {
    item: DataItem;
    currentView: ViewType; // Um den itemTypePrefix und Logik für Beschwerden zu steuern
    copiedCellKey: string | null;
    onCopyToClipboard: (textToCopy: string, cellKey: string) => void;
    onStatusChange: (itemId: number, newStatus: BeschwerdeItem["status"]) => void; // Nur für Beschwerden relevant
}

export default function DataItemCard({
    item,
    currentView,
    copiedCellKey,
    onCopyToClipboard,
    onStatusChange,
}: DataItemCardProps) {
    const itemTypePrefix = currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-";
    const isBeschwerde = currentView === 'beschwerden' && 'beschwerdegrund' in item;
    const beschwerdeItem = isBeschwerde ? item as BeschwerdeItem : null;
    const currentStatus = beschwerdeItem?.status;
    let actionButton = null;

    if (isBeschwerde && beschwerdeItem) {
        switch (currentStatus) {
            case "Offen":
                actionButton = (
                    <button
                        onClick={() => onStatusChange(item.id, "In Bearbeitung")}
                        className="w-full mt-3 text-yellow-300 hover:text-yellow-200 bg-yellow-600/30 hover:bg-yellow-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold"
                        title="Bearbeitung starten"
                    >
                        Bearbeitung starten
                    </button>
                );
                break;
            case "In Bearbeitung":
                actionButton = (
                    <div className="flex space-x-2 mt-3">
                        <button
                            onClick={() => onStatusChange(item.id, "Gelöst")}
                            className="flex-1 text-green-300 hover:text-green-200 bg-green-600/30 hover:bg-green-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold"
                            title="Als gelöst markieren"
                        >
                            Gelöst
                        </button>
                        <button
                            onClick={() => onStatusChange(item.id, "Abgelehnt")}
                            className="flex-1 text-red-300 hover:text-red-200 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold"
                            title="Ablehnen"
                        >
                            Ablehnen
                        </button>
                    </div>
                );
                break;
            case "Gelöst":
            case "Abgelehnt":
                actionButton = (
                    <button
                        onClick={() => onStatusChange(item.id, "Offen")}
                        className="w-full mt-3 text-purple-300 hover:text-purple-200 bg-purple-600/30 hover:bg-purple-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold"
                        title="Wieder öffnen"
                    >
                        Wieder öffnen
                    </button>
                );
                break;
            default:
                actionButton = <div className="mt-3 text-xs text-neutral-500 italic">(Status unklar)</div>;
        }
    }
    const cardKey = `card-${item.id}`; // Für eindeutige Keys der DataFields

    return (
        <motion.div
            key={item.id} // Haupt-Key für die Liste
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-[#1A1A2E] p-4 rounded-xl shadow-lg border border-slate-700/50 flex flex-col justify-between"
        >
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-green-400 break-words"> {item.betreff} </h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">ID: {itemTypePrefix}{item.id}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs">
                    <DataField label="Name" value={item.name} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-name`} fieldKey={`${cardKey}-name`} />
                    <DataField label="Email" value={item.email} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-email`} fieldKey={`${cardKey}-email`} />
                    <DataField label="Tel." value={item.tel} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-tel`} fieldKey={`${cardKey}-tel`} />
                    <DataField label="Erstellt am" value={formatDate(item.erstelltam)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-erstelltam`} fieldKey={`${cardKey}-erstelltam`} copyValue={item.erstelltam} />
                    {isBeschwerde && beschwerdeItem && (
                        <>
                            <DataField label="Status" value={beschwerdeItem.status} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-status`} fieldKey={`${cardKey}-status`} />
                            <DataField label="Beschwerdegrund" value={beschwerdeItem.beschwerdegrund} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-grund`} fieldKey={`${cardKey}-grund`} />
                            <DataField label="Vorfalldatum" value={formatDate(beschwerdeItem.datum)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vdatum`} fieldKey={`${cardKey}-vdatum`} copyValue={beschwerdeItem.datum} />
                            <DataField label="Vorfallzeit" value={formatTime(beschwerdeItem.uhrzeit)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vzeit`} fieldKey={`${cardKey}-vzeit`} copyValue={beschwerdeItem.uhrzeit} />
                            <DataField label="Linie" value={beschwerdeItem.linie} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-linie`} fieldKey={`${cardKey}-linie`} />
                            <DataField label="Haltestelle" value={beschwerdeItem.haltestelle} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-hst`} fieldKey={`${cardKey}-hst`} />
                        </>
                    )}
                </div>
                <div className="mt-2 py-1.5">
                    <span className="text-xs text-slate-400 block">Beschreibung</span>
                    <p className="text-slate-100 text-xs whitespace-pre-wrap break-words max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 pr-1">
                        {item.beschreibung}
                    </p>
                </div>
            </div>
            {isBeschwerde && actionButton && (
                <div className="mt-auto pt-3"> {actionButton} </div>
            )}
        </motion.div>
    );
}