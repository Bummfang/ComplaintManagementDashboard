// app/components/DataItemCard/CardBack.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquareTextIcon, ArrowLeftIcon, SaveIcon, XCircleIcon, AlertCircleIcon,
    StickyNoteIcon, ListChecksIcon, CreditCardIcon, MailIcon, PhoneIcon
} from 'lucide-react';
import React from 'react';
import { InternalCardData } from '@/app/types'; // Pfad anpassen
import FormSection from '@/app/components/ui/FormSection'; // Pfad anpassen

// Framer Motion Varianten (können auch global oder in einer varianten.ts Datei definiert werden)
const contentItemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20 } }
};

// Diese Variante ist spezifisch für den Flip-Effekt und sollte in der Haupt-DataItemCard verwendet werden,
// aber wir definieren sie hier, falls die CardBack-Komponente sie direkt für ihre eigene Ein-/Ausblendung nutzen möchte.
const flipContentVariants = {
    initial: { opacity: 0, rotateY: 90 }, // Startet von der Seite gedreht
    animate: { opacity: 1, rotateY: 0, transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, rotateY: -90, transition: { duration: 0.3, ease: "easeInOut" } }, // Dreht zur anderen Seite weg
};

interface CardBackProps {
    internalDetails: InternalCardData;
    onDetailChange: <K extends keyof InternalCardData>(key: K, value: InternalCardData[K]) => void;
    onSave: () => void;
    onCancel: () => void;
    validationError: string | null;
    cardKey: string; // Für eindeutige IDs der Formularelemente
    isSubmitting?: boolean; // Optional, um Buttons während des Speicherns zu deaktivieren
}

const CardBack: React.FC<CardBackProps> = ({
    internalDetails,
    onDetailChange,
    onSave,
    onCancel,
    validationError,
    cardKey,
    isSubmitting = false,
}) => {
    // Basis-CSS-Klassen für Formularelemente
    const formElementBaseClass = "w-full p-2.5 text-sm rounded-md transition-colors duration-150 shadow-sm";
    const formInputTextClass = `${formElementBaseClass} bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:bg-slate-900/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500`;
    const formCheckboxRadioBaseClass = "h-4 w-4 rounded cursor-pointer transition-all duration-150 shadow";
    const formCheckboxRadioFocusClass = "focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-slate-800";
    const formCheckboxClass = `${formCheckboxRadioBaseClass} bg-slate-700 border-slate-600 text-sky-500 ${formCheckboxRadioFocusClass}`;

    const clarificationTypes = [
        { value: 'written', label: 'Schriftlich', icon: MailIcon },
        { value: 'phone', label: 'Telefonisch', icon: PhoneIcon }
    ] as const; // 'as const' für strengere Typisierung von type.value

    const optionalInternalNotes = [
        { key: 'teamLeadInformed', label: 'Teamleiter informiert' },
        { key: 'departmentHeadInformed', label: 'Geschäftsbereichsleiter informiert' },
        { key: 'forwardedToSubcontractor', label: 'Weiterleitung an Nachauftraggeber' },
        { key: 'forwardedToInsurance', label: 'Weiterleitung an Versicherungsabteilung' },
    ];

    return (
        // Die äußere motion.div für die Flip-Animation wird in DataItemCard sein.
        // Diese motion.div hier ist für den Inhalt der Rückseite selbst.
        <motion.div 
            key={`${cardKey}-back-content`} // Eindeutiger Key für AnimatePresence
            variants={flipContentVariants} // Oder eine andere passende Variante für den Inhalt
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-4 md:p-5 flex flex-col flex-grow justify-between h-full" // h-full für Layout
        >
            {/* Scrollbarer Bereich für Formularinhalte */}
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/70 scrollbar-track-slate-700/30 pr-1 pb-4 flex-grow">
                <motion.div variants={contentItemVariants} className="flex justify-between items-center pb-3 border-b border-slate-700/80 mb-5 sticky top-0 bg-slate-800/80 backdrop-blur-sm z-10 pt-3 -mt-4 -mx-4 md:-mx-5 px-4 md:px-5">
                    <h4 className="text-lg font-semibold text-slate-100 flex items-center">
                        <MessageSquareTextIcon size={22} className="mr-2.5 text-sky-400 flex-shrink-0" /> Interne Bearbeitung
                    </h4>
                    <motion.button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="p-1.5 rounded-full text-slate-400 hover:text-sky-300 transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:opacity-50"
                        title="Abbrechen & Zurück"
                        whileHover={{ scale: isSubmitting ? 1 : 1.1 }}
                        whileTap={{ scale: isSubmitting ? 1 : 0.9 }}
                    >
                        <ArrowLeftIcon size={18} />
                    </motion.button>
                </motion.div>

                <FormSection title="Allgemeine Notizen" icon={StickyNoteIcon} htmlFor={`${cardKey}-generalNotes`}>
                    <textarea
                        id={`${cardKey}-generalNotes`}
                        value={internalDetails.generalNotes}
                        onChange={e => onDetailChange('generalNotes', e.target.value)}
                        rows={4}
                        className={`${formInputTextClass} min-h-[80px]`}
                        placeholder="Interne Vermerke, Beobachtungen, nächste Schritte..."
                        disabled={isSubmitting}
                    />
                </FormSection>

                <FormSection title="Klärungsart" required icon={AlertCircleIcon}>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        {clarificationTypes.map(type => {
                            const IconComponent = type.icon;
                            return (
                                <label
                                    key={type.value}
                                    className={`flex-1 flex items-center justify-center text-sm transition-all duration-150 cursor-pointer p-3 rounded-lg border-2 shadow-sm hover:shadow-md
                                        ${internalDetails.clarificationType === type.value
                                            ? 'bg-sky-600/40 border-sky-500 text-sky-100 ring-1 ring-sky-500'
                                            : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 hover:border-slate-500 text-slate-300 hover:text-slate-100'
                                        }
                                        ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <input
                                        type="radio"
                                        name={`${cardKey}-clarificationType`}
                                        checked={internalDetails.clarificationType === type.value}
                                        onChange={() => onDetailChange('clarificationType', type.value)}
                                        className="sr-only" // Screenreader-only
                                        disabled={isSubmitting}
                                    />
                                    <IconComponent size={16} className={`mr-2 flex-shrink-0 ${internalDetails.clarificationType === type.value ? 'text-sky-300' : 'text-slate-400'}`} />
                                    {type.label}
                                </label>
                            );
                        })}
                    </div>
                </FormSection>

                <FormSection title="Optionale interne Vermerke" icon={ListChecksIcon}>
                    <div className="space-y-1.5">
                        {optionalInternalNotes.map(opt => (
                            <label
                                key={opt.key}
                                className={`flex items-center text-sm text-slate-200 hover:text-sky-300 transition-colors cursor-pointer p-2.5 rounded-md hover:bg-slate-700/50 border border-transparent hover:border-slate-600 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={!!internalDetails[opt.key as keyof InternalCardData]}
                                    onChange={e => onDetailChange(opt.key as keyof InternalCardData, e.target.checked)}
                                    className={`mr-2.5 ${formCheckboxClass} ${isSubmitting ? 'cursor-not-allowed' : ''}`}
                                    disabled={isSubmitting}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </FormSection>
                
                <FormSection icon={CreditCardIcon}> {/* Kein Titel, nur Icon als visueller Hinweis */}
                    <label className={`flex items-center text-sm text-slate-200 hover:text-sky-300 transition-colors cursor-pointer p-2.5 rounded-md hover:bg-slate-700/50 border border-transparent hover:border-slate-600 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                        <input
                            type="checkbox"
                            checked={internalDetails.moneyRefunded}
                            onChange={e => onDetailChange('moneyRefunded', e.target.checked)}
                            className={`mr-2.5 ${formCheckboxClass} ${isSubmitting ? 'cursor-not-allowed' : ''}`}
                            disabled={isSubmitting}
                        />
                        Geld erstattet
                    </label>
                    <AnimatePresence>
                        {internalDetails.moneyRefunded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }} // mt-3
                                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom:0 }}
                                className="pl-7" // Einzug für den Betrag
                            >
                                <label htmlFor={`${cardKey}-refundAmount`} className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Erstatteter Betrag (€) <span className="text-red-400">*</span>:
                                </label>
                                <input
                                    type="number"
                                    id={`${cardKey}-refundAmount`}
                                    value={internalDetails.refundAmount}
                                    onChange={e => onDetailChange('refundAmount', e.target.value)}
                                    placeholder="z.B. 10.50"
                                    className={`${formInputTextClass} text-sm`}
                                    min="0.01"
                                    step="0.01"
                                    disabled={isSubmitting}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </FormSection>
            </div>

            {/* Buttons und Validierungsfehler am unteren Rand (außerhalb des scrollbaren Bereichs) */}
            <div className="mt-auto pt-4 border-t border-slate-700/60">
                {validationError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-3 p-2.5 text-xs text-red-200 bg-red-800/50 rounded-md flex items-center shadow"
                    >
                        <AlertCircleIcon size={16} className="mr-2 flex-shrink-0" />
                        {validationError}
                    </motion.div>
                )}
                <motion.div
                    variants={contentItemVariants} // Kann auch eine eigene Variante haben
                    className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3"
                >
                    <motion.button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-200 bg-slate-600 hover:bg-slate-500 transition-colors flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: isSubmitting ? 1 : 1.03, y: isSubmitting ? 0 : -1 }}
                        whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                    >
                        <XCircleIcon size={16} className="mr-1.5" /> Abbrechen
                    </motion.button>
                    <motion.button
                        onClick={onSave}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-sky-600 hover:bg-sky-500 transition-colors flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: isSubmitting ? 1 : 1.03, y: isSubmitting ? 0 : -1 }}
                        whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                    >
                        {isSubmitting ? (
                             <>
                                <motion.svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </motion.svg>
                                Speichern...
                            </>
                        ) : (
                            <>
                                <SaveIcon size={16} className="mr-1.5" /> Speichern
                            </>
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default CardBack;
