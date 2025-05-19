// app/components/DataItemCard/CardFront.tsx
"use client";

import { motion } from 'framer-motion';
import { ClockIcon, UserIcon } from 'lucide-react';
import { CardSpecificDataItem, ViewType, BeschwerdeItem } from '@/app/types'; // Pfade anpassen
import { formatDateTime, formatDate, formatTime } from '@/app/utils'; // Pfade anpassen
import DataField from '@/app/components/ui/DataField'; // Pfad anpassen
// Entferne den direkten Import von getStatusTextColorClass
// import { getStatusTextColorClass } from './hooks/useStatusLogic'; 

// Framer Motion Varianten für das Einblenden der Inhalte der Karte
const contentItemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20 } }
};

interface CardFrontProps {
    item: CardSpecificDataItem;
    currentView: ViewType;
    copiedCellKey: string | null;
    onCopyToClipboard: (textToCopy: string, cellKey: string) => void;
    itemTypePrefix: string;
    abgeschlossenText: string | null;
    abgeschlossenValueClassName: string;
    isStatusRelevantView: boolean;
    statusDisplayClass: string; // NEUE Prop für die Status-Textfarbe
    statusToDisplay: string;    // NEUE Prop für den anzuzeigenden Status-Text
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
    statusDisplayClass, // Verwende die übergebene Klasse
    statusToDisplay,    // Verwende den übergebenen Status-Text
}) => {
    const cardKey = `card-${currentView}-${item.id}`;

    // Helfer, um zu prüfen, ob das Item ein BeschwerdeItem ist (für typsicheren Zugriff)
    const isBeschwerde = (dataItem: CardSpecificDataItem): dataItem is BeschwerdeItem & { internal_details?: any, action_required?: any } => {
        return currentView === 'beschwerden' && 'beschwerdegrund' in dataItem;
    };
    const beschwerdeItem = isBeschwerde(item) ? item : null;

    return (
        <div className="p-4 md:p-5 flex flex-col flex-grow">
            <motion.div variants={contentItemVariants} className="flex justify-between items-start mb-2.5">
                <h3 className="text-md font-semibold text-slate-100 hover:text-white transition-colors break-words pr-2">
                    {item.betreff || "Unbekannter Betreff"}
                </h3>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-2 pt-0.5">ID: {itemTypePrefix}{item.id}</span>
            </motion.div>

            <motion.div variants={contentItemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs mb-1">
                <DataField
                    label="Name"
                    value={item.name}
                    onCopy={onCopyToClipboard}
                    isCopied={copiedCellKey === `${cardKey}-name`}
                    fieldKey={`${cardKey}-name`}
                />
                <DataField
                    label="Email"
                    value={item.email}
                    onCopy={onCopyToClipboard}
                    isCopied={copiedCellKey === `${cardKey}-email`}
                    fieldKey={`${cardKey}-email`}
                />
                <DataField
                    label="Tel."
                    value={item.tel}
                    onCopy={onCopyToClipboard}
                    isCopied={copiedCellKey === `${cardKey}-tel`}
                    fieldKey={`${cardKey}-tel`}
                />
                <DataField
                    label="Erstellt am"
                    value={formatDateTime(item.erstelltam)}
                    onCopy={onCopyToClipboard}
                    isCopied={copiedCellKey === `${cardKey}-erstelltam`}
                    fieldKey={`${cardKey}-erstelltam`}
                    copyValue={item.erstelltam}
                    icon={ClockIcon}
                />
                
                {item.bearbeiter_id !== null && item.bearbeiter_id !== undefined && (
                     <DataField
                        label="Bearbeiter"
                        value={String(item.bearbeiter_name || `ID: ${item.bearbeiter_id}`)}
                        fieldKey={`${cardKey}-bearbeiter`}
                        icon={UserIcon}
                    />
                )}

                {isStatusRelevantView && (
                    <DataField
                        label="Status"
                        value={statusToDisplay} // Verwende die Prop
                        onCopy={onCopyToClipboard}
                        isCopied={copiedCellKey === `${cardKey}-status`}
                        fieldKey={`${cardKey}-status`}
                        valueClassName={statusDisplayClass} // Verwende die Prop
                    />
                )}
                 {isStatusRelevantView && abgeschlossenText !== null && (
                    <DataField
                        label="Bearbeitungsende"
                        value={abgeschlossenText}
                        fieldKey={`${cardKey}-abgeschlossen`}
                        valueClassName={abgeschlossenValueClassName}
                        icon={ClockIcon}
                        onCopy={item.abgeschlossenam ? onCopyToClipboard : undefined}
                        isCopied={item.abgeschlossenam ? (copiedCellKey === `${cardKey}-abgeschlossen`) : false}
                        copyValue={item.abgeschlossenam || undefined}
                    />
                )}
                
                {beschwerdeItem && (
                    <>
                        <DataField
                            label="Beschwerdegrund"
                            value={beschwerdeItem.beschwerdegrund}
                            onCopy={onCopyToClipboard}
                            isCopied={copiedCellKey === `${cardKey}-grund`}
                            fieldKey={`${cardKey}-grund`}
                        />
                        <DataField
                            label="Vorfalldatum"
                            value={formatDate(beschwerdeItem.datum)}
                            onCopy={onCopyToClipboard}
                            isCopied={copiedCellKey === `${cardKey}-vdatum`}
                            fieldKey={`${cardKey}-vdatum`}
                            copyValue={beschwerdeItem.datum}
                        />
                        <DataField
                            label="Vorfallzeit"
                            value={formatTime(beschwerdeItem.uhrzeit)}
                            onCopy={onCopyToClipboard}
                            isCopied={copiedCellKey === `${cardKey}-vzeit`}
                            fieldKey={`${cardKey}-vzeit`}
                            copyValue={beschwerdeItem.uhrzeit}
                        />
                        <DataField
                            label="Linie"
                            value={beschwerdeItem.linie}
                            onCopy={onCopyToClipboard}
                            isCopied={copiedCellKey === `${cardKey}-linie`}
                            fieldKey={`${cardKey}-linie`}
                        />
                        <DataField
                            label="Haltestelle"
                            value={beschwerdeItem.haltestelle}
                            onCopy={onCopyToClipboard}
                            isCopied={copiedCellKey === `${cardKey}-hst`}
                            fieldKey={`${cardKey}-hst`}
                        />
                    </>
                )}
            </motion.div>

            <motion.div variants={contentItemVariants} className="mt-2 py-1 flex-grow flex flex-col">
                <span className="text-xs text-slate-400 block mb-0.5">Beschreibung</span>
                <div className="text-slate-200 text-xs whitespace-pre-wrap break-words max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/70 scrollbar-track-slate-700/30 pt-1 pb-1 min-h-[40px] flex-grow">
                    {item.beschreibung || (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="italic text-slate-500"
                        >
                            Keine Beschreibung vorhanden.
                        </motion.span>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CardFront;
