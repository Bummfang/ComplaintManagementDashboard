// app/components/ui/DataField.tsx
"use client";

import { motion } from 'framer-motion';
import { CopyIcon, CheckIcon } from 'lucide-react';
import React from 'react'; // Import React für React.ElementType










interface DataFieldProps {
    label: string;
    value?: string | number | null; // Wert kann auch eine Zahl sein (z.B. ID)
    onCopy?: (textToCopy: string, fieldKey: string) => void;
    isCopied?: boolean;
    copyValue?: string; // Expliziter Wert, der kopiert werden soll (z.B. unformatierter Zeitstempel)
    fieldKey: string; // Eindeutiger Schlüssel für das Feld, wichtig für die Kopierfunktion
    valueClassName?: string;
    icon?: React.ElementType; // Typ für Icon-Komponenten
    children?: React.ReactNode; // Für komplexere Werte oder zusätzliche Elemente
}








const DataField: React.FC<DataFieldProps> = ({
    label,
    value,
    onCopy,
    isCopied,
    copyValue,
    fieldKey,
    valueClassName,
    icon: Icon,
    children
}) => {
   
   





   
   
   
    // Bestimme den anzuzeigenden Wert. Wenn children vorhanden sind, werden diese verwendet.
    const displayValueNode = children ? children : (value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : "N/A");
    // Der Wert, der tatsächlich kopiert wird.
    const actualCopyValue = copyValue || (typeof displayValueNode === 'string' && displayValueNode !== "N/A" ? displayValueNode : String(value || ""));

    // Stellt sicher, dass onCopy nur aufgerufen wird, wenn es eine Funktion ist und ein kopierbarer Wert vorhanden ist.
    const canCopy = onCopy && actualCopyValue && actualCopyValue !== "N/A";

    return (
        <div className="py-1 group">
            <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
            <div className="flex items-center">
                {Icon && <Icon size={13} className="mr-1.5 text-slate-400 flex-shrink-0" />}
                <span className={`text-sm break-words ${valueClassName || 'text-slate-200'}`}>
                    {displayValueNode}
                </span>
                {canCopy && (
                    <motion.button
                        onClick={() => onCopy(actualCopyValue, fieldKey)}
                        className="ml-2 p-0.5 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        title={isCopied ? "Kopiert!" : "Kopieren"}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        aria-label={`Kopiere ${label}`}
                    >
                        {isCopied ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
                    </motion.button>
                )}
            </div>
        </div>
    );
};

export default DataField;
