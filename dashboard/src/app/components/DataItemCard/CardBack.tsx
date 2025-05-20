// app/components/DataItemCard/CardBack.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon, SaveIcon, XCircleIcon, AlertCircleIcon,
    StickyNoteIcon, ListChecksIcon, CreditCardIcon, MailIcon, PhoneIcon, Edit3Icon, CheckSquare, Square
} from 'lucide-react';
import React from 'react';
import { InternalCardData } from '@/app/types'; // Pfad anpassen
import FormSection from '@/app/components/ui/FormSection'; // Pfad anpassen

// Framer Motion Varianten
const contentItemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20, delay: 0.05 } }
};

interface CardBackProps {
    internalDetails: InternalCardData;
    onDetailChange: <K extends keyof InternalCardData>(key: K, value: InternalCardData[K]) => void;
    onSave: () => void;
    onCancel: () => void;
    validationError: string | null;
    cardKey: string;
    isSubmitting?: boolean;
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
    const formElementBaseClass = "w-full text-sm rounded-lg transition-all duration-200 ease-in-out shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";
    const formInputTextClass = `${formElementBaseClass} bg-slate-700/60 border border-slate-600/80 text-slate-100 placeholder-slate-400/90 focus:bg-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 py-2.5 px-3.5`;

    const CustomCheckbox = ({ id, checked, onChange, label, disabled }: { id: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, label: string, disabled?: boolean }) => (
        <label
            htmlFor={id}
            className={`group flex items-center text-sm text-slate-200 hover:text-sky-200 transition-colors cursor-pointer p-3 rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-slate-600/70 
                        ${disabled ? 'opacity-60 cursor-not-allowed hover:bg-transparent hover:border-transparent' : ''}`}
        >
            <div className="relative flex items-center justify-center w-5 h-5">
                <input
                    id={id} type="checkbox" checked={checked} onChange={onChange}
                    disabled={disabled} className="sr-only peer"
                />
                <Square
                    size={20}
                    className={`absolute text-slate-500 group-hover:text-sky-500 transition-all duration-150 ${checked ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
                    strokeWidth={2.5}
                />
                <CheckSquare
                    size={20}
                    className={`absolute text-sky-400 transition-all duration-150 ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                    strokeWidth={2.5}
                />
            </div>
            <span className="ml-3 select-none">{label}</span>
        </label>
    );

    const clarificationTypes = [
        { value: 'schriftlich', label: 'Schriftlich', icon: MailIcon },
        { value: 'telefonisch', label: 'Telefonisch', icon: PhoneIcon }
    ] as const;

    const optionalInternalNotes = [
        { key: 'teamLeadInformed', label: 'Teamleiter informiert' },
        { key: 'departmentHeadInformed', label: 'Geschäftsbereichsleiter informiert' },
        { key: 'forwardedToSubcontractor', label: 'Weiterleitung an Nachauftraggeber' },
        { key: 'forwardedToInsurance', label: 'Weiterleitung an Versicherungsabteilung' },
    ];

    // Button Styling Klassen
    const baseButtonClass = "px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ease-out flex items-center justify-center shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-md disabled:hover:y-0 disabled:hover:scale-100";
    const primaryButtonClass = `${baseButtonClass} bg-sky-600 hover:bg-sky-500 text-white focus-visible:ring-sky-400 shadow-sky-500/30 hover:shadow-sky-500/40`;
    const secondaryButtonClass = `${baseButtonClass} bg-slate-600 hover:bg-slate-500 text-slate-100 focus-visible:ring-slate-400 shadow-slate-500/20 hover:shadow-slate-500/30`;


    return (
        <motion.div
            key={`${cardKey}-back-content`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="p-4 md:p-5 flex flex-col flex-grow justify-between h-full overflow-x-hidden"
        >
            <motion.div
                variants={contentItemVariants}
                className="flex justify-between items-center pb-4 border-b border-slate-600/70 sticky top-0 bg-slate-800/80 backdrop-blur-md z-20 pt-3 -mx-4 md:-mx-5 px-4 md:px-5 shadow-lg shadow-slate-900/30"
            >
                <h4 className="text-lg font-semibold text-sky-400 flex items-center">
                    <Edit3Icon size={20} className="mr-2.5 flex-shrink-0" /> Interne Bearbeitung
                </h4>
                <motion.button
                    onClick={onCancel} disabled={isSubmitting}
                    className="p-1.5 rounded-full text-slate-400 hover:text-sky-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:opacity-50"
                    title="Abbrechen & Zurück"
                    whileHover={{ scale: isSubmitting ? 1 : 1.15, rotate: isSubmitting ? 0 : -5 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.9 }}
                >
                    <ArrowLeftIcon size={20} />
                </motion.button>
            </motion.div>

            <div className="overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-500/70 scrollbar-track-slate-700/40 pr-1.5 -mr-1.5 pb-6 flex-grow pt-6">
                <FormSection title="Allgemeine Notizen" icon={StickyNoteIcon} htmlFor={`${cardKey}-generalNotes`} className="mb-6">
                    <textarea
                        id={`${cardKey}-generalNotes`}
                        value={internalDetails.generalNotes || ""} 
                        onChange={e => onDetailChange('generalNotes', e.target.value)}
                        rows={4}
                        className={`${formInputTextClass} min-h-[100px]`}
                        placeholder="Interne Vermerke, Beobachtungen, nächste Schritte..."
                        disabled={isSubmitting}
                    />
                </FormSection>

                <FormSection title="Klärungsart" required icon={AlertCircleIcon} className="mb-6">
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                        {clarificationTypes.map(type => {
                            const IconComponent = type.icon;
                            const isSelected = internalDetails.clarificationType === type.value;
                            return (
                                <label
                                    key={type.value}
                                    className={`flex-1 flex items-center justify-center text-sm font-medium transition-all duration-200 cursor-pointer p-4 rounded-xl border-2 shadow-lg hover:shadow-sky-500/20
                                        ${isSelected
                                            ? 'bg-sky-500/90 border-sky-400 text-white ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-800'
                                            : `bg-slate-700/70 border-slate-600 hover:border-sky-500 text-slate-200 hover:text-white ${isSubmitting ? '' : 'hover:bg-slate-700/90'}`
                                        }
                                        ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <input
                                        type="radio" name={`${cardKey}-clarificationType`} checked={isSelected}
                                        onChange={() => onDetailChange('clarificationType', type.value)}
                                        className="sr-only" disabled={isSubmitting}
                                    />
                                    <IconComponent size={18} className={`mr-2.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-sky-300'}`} />
                                    {type.label}
                                </label>
                            );
                        })}
                    </div>
                </FormSection>

                <FormSection title="Optionale interne Vermerke" icon={ListChecksIcon} className="mb-6">
                    <div className="space-y-2">
                        {optionalInternalNotes.map(opt => (
                            <CustomCheckbox
                                key={opt.key} id={`${cardKey}-${opt.key}`}
                                checked={!!internalDetails[opt.key as keyof InternalCardData]}
                                onChange={e => onDetailChange(opt.key as keyof InternalCardData, e.target.checked)}
                                label={opt.label} disabled={isSubmitting}
                            />
                        ))}
                    </div>
                </FormSection>

                <FormSection icon={CreditCardIcon} className="mb-4">
                    <CustomCheckbox
                        id={`${cardKey}-moneyRefunded`}
                        checked={internalDetails.moneyRefunded}
                        onChange={e => onDetailChange('moneyRefunded', e.target.checked)}
                        label="Geld erstattet" disabled={isSubmitting}
                    />
                    <AnimatePresence>
                        {internalDetails.moneyRefunded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }}
                                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                                className="pl-9"
                            >
                                <label htmlFor={`${cardKey}-refundAmount`} className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Erstatteter Betrag (€) <span className="text-red-400">*</span>:
                                </label>
                                <input
                                    type="number" 
                                    id={`${cardKey}-refundAmount`}
                                    value={internalDetails.refundAmount || ""}
                                    onChange={e => onDetailChange('refundAmount', e.target.value)}
                                    placeholder="z.B. 10.50"
                                    className={`${formInputTextClass} text-sm py-2 px-3`}
                                    min="0.01" step="0.01" disabled={isSubmitting}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </FormSection>
            </div>

            <div className="mt-auto pt-5 border-t border-slate-600/70">
                {validationError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 text-sm text-red-100 bg-red-600/60 border border-red-500/80 rounded-lg flex items-center shadow-lg"
                    >
                        <AlertCircleIcon size={20} className="mr-2.5 flex-shrink-0" />
                        {validationError}
                    </motion.div>
                )}
                <motion.div
                    variants={contentItemVariants} // Behält die Einblendanimation für den Button-Container
                    className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4"
                >
                    <motion.button
                        onClick={onCancel} disabled={isSubmitting}
                        className={secondaryButtonClass} // NEUE Klasse
                        whileHover={{ scale: isSubmitting ? 1 : 1.05, y: isSubmitting ? 0 : -3, boxShadow: "0px 8px 20px -3px rgba(100, 116, 139, 0.35)" }} // Angepasster Hover
                        whileTap={{ scale: isSubmitting ? 1 : 0.98, y: 0 }}
                    >
                        <XCircleIcon size={18} className="mr-2 opacity-90" /> Abbrechen
                    </motion.button>
                    <motion.button
                        onClick={onSave} disabled={isSubmitting}
                        className={primaryButtonClass} // NEUE Klasse
                        whileHover={{ scale: isSubmitting ? 1 : 1.05, y: isSubmitting ? 0 : -3, boxShadow: "0px 8px 20px -3px rgba(14, 165, 233, 0.4)" }} // Angepasster Hover
                        whileTap={{ scale: isSubmitting ? 1 : 0.98, y: 0 }}
                    >
                        {isSubmitting ? (
                            <>
                                <motion.svg className="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </motion.svg>
                                Speichern...
                            </>
                        ) : (
                            <>
                                <SaveIcon size={18} className="mr-2 opacity-90" /> Speichern
                            </>
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default CardBack;
