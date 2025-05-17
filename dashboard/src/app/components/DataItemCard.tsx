// app/components/DataItemCard.tsx
"use client";

import { motion } from 'framer-motion';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { DataItem, BeschwerdeItem, ViewType } from '../types'; // Pfad anpassen
import { formatDate, formatTime } from '../utils'; // Pfad anpassen

// Hilfsfunktion für dynamische Textfarben basierend auf dem Status
const getStatusTextColorClass = (status?: BeschwerdeItem["status"]): string => {
  switch (status) {
    case "Offen":
      return "text-sky-400 font-medium";
    case "In Bearbeitung":
      return "text-amber-400 font-medium";
    case "Gelöst":
      return "text-green-400 font-medium";
    case "Abgelehnt":
      return "text-red-400 font-medium";
    default:
      return "text-slate-200";
  }
};

// Hilfsfunktion für einen subtilen, vollflächigen Hintergrund-Farbstich
const getCardBackgroundAccentClasses = (status?: BeschwerdeItem["status"]): string => {
  const baseFallback = "bg-slate-800/60"; // Standardhintergrund für nicht-Beschwerde oder unbekannten Status

  switch (status) {
    case "Offen":
      // Deckkraft von 6% auf 10% erhöht (/[.06] zu /[.1])
      return "bg-sky-900/[.4]"; 
    case "In Bearbeitung":
      // Deckkraft von 6% auf 10% erhöht
      return "bg-yellow-900/[.3]";
    case "Gelöst":
      // Deckkraft von 6% auf 10% erhöht
      return "bg-green-900/[.4]";
    case "Abgelehnt":
      // Deckkraft von 6% auf 10% erhöht
      return "bg-red-900/[.3]";
    default:
      return baseFallback; 
  }
};


// DataField Komponente
const DataField = ({
  label,
  value,
  onCopy,
  isCopied,
  copyValue,
  fieldKey,
  valueClassName
}: {
  label: string;
  value?: string | null;
  onCopy: (text: string, key: string) => void;
  isCopied: boolean;
  copyValue?: string;
  fieldKey: string;
  valueClassName?: string;
}) => {
  const displayValue = value || "N/A";
  const actualCopyValue = copyValue || displayValue;
  return (
    <div className="py-1 group">
      <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
      <div className="flex items-center">
        <span className={`text-sm break-words ${valueClassName || 'text-slate-200'}`}>
          {displayValue}
        </span>
        {displayValue !== "N/A" && (
          <motion.button
            onClick={() => onCopy(actualCopyValue, fieldKey)}
            className="ml-2 p-0.5 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            title={isCopied ? "Kopiert!" : "Kopieren"}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            {isCopied ? <CheckIcon size={14} className="text-emerald-400"/> : <CopyIcon size={14} />}
          </motion.button>
        )}
      </div>
    </div>
  );
};

// Varianten für die Hauptkarte und ihre gestaffelten Kinder
const cardContainerVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1], staggerChildren: 0.07 }
  },
  exit: {
    opacity: 0, y: -20, scale: 0.98,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

const contentItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } }
};


interface DataItemCardProps {
  item: DataItem;
  currentView: ViewType;
  copiedCellKey: string | null;
  onCopyToClipboard: (textToCopy: string, cellKey: string) => void;
  onStatusChange: (itemId: number, newStatus: BeschwerdeItem["status"]) => void;
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
          <motion.button
            onClick={() => onStatusChange(item.id, "In Bearbeitung")}
            className="w-full mt-3 text-amber-300 hover:text-amber-200 bg-amber-600/30 hover:bg-amber-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg"
            title="Bearbeitung starten"
            whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }}
            whileTap={{ scale: 0.97 }}
          >
            Bearbeitung starten
          </motion.button>
        );
        break;
      case "In Bearbeitung":
        actionButton = (
          <div className="flex space-x-2 mt-3">
            <motion.button
              onClick={() => onStatusChange(item.id, "Gelöst")}
              className="flex-1 text-green-300 hover:text-green-200 bg-green-600/30 hover:bg-green-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg"
              title="Als gelöst markieren"
               whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }}
              whileTap={{ scale: 0.97 }}
            >
              Gelöst
            </motion.button>
            <motion.button
              onClick={() => onStatusChange(item.id, "Abgelehnt")}
              className="flex-1 text-red-300 hover:text-red-200 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg"
              title="Ablehnen"
               whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }}
              whileTap={{ scale: 0.97 }}
            >
              Ablehnen
            </motion.button>
          </div>
        );
        break;
      case "Gelöst":
      case "Abgelehnt":
        actionButton = (
          <motion.button
            onClick={() => onStatusChange(item.id, "Offen")}
            className="w-full mt-3 text-sky-300 hover:text-sky-200 bg-sky-600/30 hover:bg-sky-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg"
            title="Wieder öffnen"
            whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }}
            whileTap={{ scale: 0.97 }}
          >
            Wieder öffnen
          </motion.button>
        );
        break;
      default:
        actionButton = <div className="mt-3 text-xs text-slate-500 italic">(Status unklar)</div>;
    }
  }
  const cardKey = `card-${item.id}`;

  return (
    <motion.div
      key={item.id}
      variants={cardContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      whileHover={{ y: -5, scale: 1.01, transition: { type: "spring", stiffness: 300, damping: 18 } }}
      className={`
        relative overflow-hidden rounded-xl 
        ${isBeschwerde && beschwerdeItem && beschwerdeItem.status ? getCardBackgroundAccentClasses(beschwerdeItem.status) : 'bg-slate-800/60'}
        backdrop-blur-md transition-all duration-300 ease-out 
        shadow-lg shadow-slate-900/25 hover:shadow-xl hover:shadow-slate-900/35 
        flex flex-col justify-between cursor-pointer
      `}
    >
      {/* Hauptinhaltsbereich der Karte */}
      <div className="p-4 md:p-5 flex flex-col flex-grow">
        {/* Header-Sektion */}
        <motion.div variants={contentItemVariants} className="flex justify-between items-start mb-2.5">
          <h3 className="text-md font-semibold text-slate-100 hover:text-white transition-colors break-words pr-2">
            {item.betreff || "Unbekannter Betreff"}
          </h3>
          <span className="text-xs text-slate-400 whitespace-nowrap ml-2 pt-0.5">ID: {itemTypePrefix}{item.id}</span>
        </motion.div>

        {/* Datenfelder-Grid */}
        <motion.div variants={contentItemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs mb-1">
          <DataField label="Name" value={item.name} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-name`} fieldKey={`${cardKey}-name`} />
          <DataField label="Email" value={item.email} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-email`} fieldKey={`${cardKey}-email`} />
          <DataField label="Tel." value={item.tel} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-tel`} fieldKey={`${cardKey}-tel`} />
          <DataField label="Erstellt am" value={formatDate(item.erstelltam)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-erstelltam`} fieldKey={`${cardKey}-erstelltam`} copyValue={item.erstelltam} />
          {isBeschwerde && beschwerdeItem && (
            <>
              <DataField
                label="Status"
                value={beschwerdeItem.status}
                onCopy={onCopyToClipboard}
                isCopied={copiedCellKey === `${cardKey}-status`}
                fieldKey={`${cardKey}-status`}
                valueClassName={getStatusTextColorClass(beschwerdeItem.status)}
              />
              <DataField label="Beschwerdegrund" value={beschwerdeItem.beschwerdegrund} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-grund`} fieldKey={`${cardKey}-grund`} />
              <DataField label="Vorfalldatum" value={formatDate(beschwerdeItem.datum)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vdatum`} fieldKey={`${cardKey}-vdatum`} copyValue={beschwerdeItem.datum} />
              <DataField label="Vorfallzeit" value={formatTime(beschwerdeItem.uhrzeit)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vzeit`} fieldKey={`${cardKey}-vzeit`} copyValue={beschwerdeItem.uhrzeit} />
              <DataField label="Linie" value={beschwerdeItem.linie} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-linie`} fieldKey={`${cardKey}-linie`} />
              <DataField label="Haltestelle" value={beschwerdeItem.haltestelle} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-hst`} fieldKey={`${cardKey}-hst`} />
            </>
          )}
        </motion.div>

        {/* Beschreibungs-Sektion */}
        <motion.div variants={contentItemVariants} className="mt-2 py-1 flex-grow flex flex-col">
          <span className="text-xs text-slate-400 block mb-0.5">Beschreibung</span>
          <div className="text-slate-200 text-xs whitespace-pre-wrap break-words max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/70 scrollbar-track-slate-700/30 pt-1 pb-1 min-h-[40px] flex-grow">
            {item.beschreibung ? item.beschreibung :
              <motion.span
                initial={{opacity:0}}
                animate={{opacity:1}}
                transition={{delay:0.1, duration:0.4}}
                className="italic text-slate-500"
              >
                Keine Beschreibung vorhanden.
              </motion.span>
            }
          </div>
        </motion.div>
      </div>

      {/* Aktionsknöpfe-Sektion */}
      {isBeschwerde && actionButton && (
        <motion.div variants={contentItemVariants} className="px-4 md:px-5 pb-4 pt-2">
          {actionButton}
        </motion.div>
      )}
    </motion.div>
  );
}
