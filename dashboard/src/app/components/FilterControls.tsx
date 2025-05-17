// app/components/FilterControls.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Mail, Filter, Hash, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { ViewType, StatusFilterMode } from '../types'; // Pfad anpassen
import { FILTER_LABELS } from '../constants'; // Pfad anpassen

interface FilterControlsProps {
    currentView: ViewType;
    activeStatusFilter: StatusFilterMode;
    setActiveStatusFilter: (filter: StatusFilterMode) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    emailSearchTerm: string;
    setEmailSearchTerm: (term: string) => void;
    idSearchTerm: string;
    setIdSearchTerm: (term: string) => void;
    showAdvancedFilters: boolean;
    setShowAdvancedFilters: (show: boolean) => void;
    startDateInput: string;
    setStartDateInput: (date: string) => void;
    endDateInput: string;
    setEndDateInput: (date: string) => void;
    handleApplyDateFilter: () => void;
    handleClearDateFilter: () => void;
    isDateFilterApplied: boolean;
}

// Globale Animationsvarianten
const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
        opacity: 1, y: 0,
        transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1], staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

// Button Basis-Styling
const neonButtonBaseClasses = "px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/80 shadow-md whitespace-nowrap flex items-center justify-center gap-2";
const neonButtonSkyClasses = `bg-sky-600/80 hover:bg-sky-500/90 text-sky-50 hover:text-white focus-visible:ring-sky-400 shadow-[0_0_10px_1px_rgba(56,189,248,0.3),0_0_20px_2px_rgba(56,189,248,0.2)] hover:shadow-[0_0_15px_2px_rgba(56,189,248,0.4),0_0_30px_4px_rgba(56,189,248,0.3)]`;
const neonButtonSlateClasses = `bg-slate-600/80 hover:bg-slate-500/90 text-slate-100 hover:text-white focus-visible:ring-slate-400 shadow-[0_0_10px_1px_rgba(100,116,139,0.3),0_0_20px_2px_rgba(100,116,139,0.2)] hover:shadow-[0_0_15px_2px_rgba(100,116,139,0.4),0_0_30px_4px_rgba(100,116,139,0.3)]`;


export default function FilterControls({
    currentView,
    activeStatusFilter,
    setActiveStatusFilter,
    searchTerm,
    setSearchTerm,
    emailSearchTerm,
    setEmailSearchTerm,
    idSearchTerm,
    setIdSearchTerm,
    showAdvancedFilters,
    setShowAdvancedFilters,
    startDateInput,
    setStartDateInput,
    endDateInput,
    setEndDateInput,
    handleApplyDateFilter,
    handleClearDateFilter,
    isDateFilterApplied,
}: FilterControlsProps) {

    const dateFilterActiveColorClasses = "bg-sky-500/90 hover:bg-sky-400 text-white shadow-[0_0_18px_3px_rgba(56,189,248,0.5)] animate-pulse focus-visible:ring-sky-300";
    const dateFilterDefaultColorClasses = neonButtonSkyClasses;
    const warningIconColor = "text-amber-400";

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="my-6 space-y-4 md:space-y-0 mb-20 md:flex md:flex-col p-5 bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-[0_0_35px_5px_rgba(15,23,42,0.6),0_0_70px_-15px_rgba(14,165,233,0.28)] border border-slate-700/50"
        >
            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-start gap-x-4 gap-y-4">
                {currentView === "beschwerden" && (
                    // Container für Status-Pills: overflow-hidden ist hier entscheidend!
                    <div className="p-1.5 bg-slate-700/40 backdrop-blur-sm rounded-full shadow-lg flex justify-center items-center relative max-w-full w-full sm:w-auto overflow-x-auto scrollbar-hide overflow-hidden">
                        {(Object.keys(FILTER_LABELS) as StatusFilterMode[]).map((filterKey) => (
                            <motion.button
                                key={filterKey}
                                onClick={() => setActiveStatusFilter(filterKey)}
                                className={`relative flex-shrink-0 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-full transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-opacity-75 whitespace-nowrap
                                    ${activeStatusFilter === filterKey 
                                        ? 'text-white font-semibold' // Aktiver Text heller
                                        : 'text-slate-300 hover:text-sky-200 hover:shadow-[0_0_10px_1px_rgba(56,189,248,0.2)]' // Inaktiver Text und Hover-Effekt
                                    }`}
                                whileHover={{ scale: activeStatusFilter === filterKey ? 1 : 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <span className="relative z-10">{FILTER_LABELS[filterKey]}</span>
                                {activeStatusFilter === filterKey && (
                                    <motion.div
                                        layoutId="activeFilterPillNeonGlassControls"
                                        // Styling der aktiven "Hammer"-Pille
                                        className="absolute inset-0 bg-sky-500/90 rounded-full shadow-[0_0_15px_3px_rgba(56,189,248,0.7),_0_0_8px_1px_rgba(56,189,248,0.5)_inset] -z-0"
                                        transition={{ type: "spring", stiffness: 380, damping: 32 }} // Angepasste Federung
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Suchfelder */}
                {[
                    { Icon: Search, placeholder: "Personensuche", value: searchTerm, setter: setSearchTerm, title: "Suche zurücksetzen" },
                    { Icon: Mail, placeholder: "E-Mail Suche", value: emailSearchTerm, setter: setEmailSearchTerm, title: "E-Mail-Suche zurücksetzen" },
                    { Icon: Hash, placeholder: "ID (Nr.)...", value: idSearchTerm, setter: (val: string) => setIdSearchTerm(val.replace(/\D/g, '')), title: "ID-Suche zurücksetzen" }
                ].map(({ Icon, placeholder, value, setter, title }) => (
                    <motion.div key={placeholder} variants={itemVariants} className="relative w-full md:w-auto md:min-w-[180px] lg:min-w-[200px] group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <Icon size={16} className="text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                        </span>
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="bg-slate-700/50 hover:bg-slate-700/80 text-slate-100 border border-slate-600/80 rounded-full pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-slate-700/90 appearance-none w-full transition-all duration-200 ease-out shadow-inner focus:shadow-md focus:shadow-sky-500/30"
                            style={{ colorScheme: 'dark' }}
                        />
                        {value && (
                            <motion.button
                                onClick={() => setter("")}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-sky-300"
                                title={title}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={18} />
                            </motion.button>
                        )}
                    </motion.div>
                ))}

                {/* Button für erweiterte Filter & Warn-Icon Container */}
                <motion.div variants={itemVariants} className="flex items-center self-center md:self-auto ml-auto gap-2.5">
                    <AnimatePresence>
                        {isDateFilterApplied && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                                title="Datumsfilter ist aktiv"
                            >
                                <AlertTriangle size={20} className={`${warningIconColor} animate-pulse`} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <motion.button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`${neonButtonBaseClasses} ${neonButtonSlateClasses} h-[40px]`}
                        title={showAdvancedFilters ? "Erweiterte Filter ausblenden" : "Erweiterte Filter anzeigen"}
                        whileHover={{ scale: 1.05, y: -1, transition: { type: "spring", stiffness: 350, damping: 15 } }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Filter size={14} />
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={showAdvancedFilters ? "weniger" : "mehr"}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                {showAdvancedFilters ? "Weniger" : "Mehr"} Filter
                            </motion.span>
                        </AnimatePresence>
                    </motion.button>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {showAdvancedFilters && (
                    <motion.div
                        key="advanced-filters"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '1.25rem' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                        className="overflow-hidden border-t border-slate-700/70"
                    >
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="pt-5 flex flex-wrap items-end gap-x-4 gap-y-4"
                        >
                            <motion.div variants={itemVariants} className="flex flex-col items-start">
                                <label htmlFor="startDate" className="text-xs text-slate-300 mb-1.5 ml-1">Startdatum</label>
                                <input placeholder="Startdatum" type="date" id="startDate" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="bg-slate-700/50 hover:bg-slate-700/80 text-slate-100 border border-slate-600/80 rounded-full px-3.5 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none w-full sm:w-auto shadow-inner focus:shadow-md focus:shadow-sky-500/30" style={{ colorScheme: 'dark' }} />
                            </motion.div>
                            <motion.div variants={itemVariants} className="flex flex-col items-start">
                                 <label htmlFor="endDate" className="text-xs text-slate-300 mb-1.5 ml-1">Enddatum</label>
                                <input type="date" id="endDate" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} min={startDateInput || undefined} className="bg-slate-700/50 hover:bg-slate-700/80 text-slate-100 border border-slate-600/80 rounded-full px-3.5 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none w-full sm:w-auto shadow-inner focus:shadow-md focus:shadow-sky-500/30" style={{ colorScheme: 'dark' }} />
                            </motion.div>

                            <motion.div variants={itemVariants} className="flex gap-2.5 items-center pt-1 sm:pt-0 sm:self-end">
                                <motion.button
                                    onClick={handleApplyDateFilter}
                                    className={`${neonButtonBaseClasses} h-[40px] ${isDateFilterApplied ? dateFilterActiveColorClasses : dateFilterDefaultColorClasses}`}
                                    whileHover={{ scale: 1.05, y: -1, transition: { type: "spring", stiffness: 350, damping: 15 } }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.span
                                            key={isDateFilterApplied ? "angewendet" : "anwenden"}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center gap-1.5"
                                        >
                                            {isDateFilterApplied && <CheckCircle size={14} />}
                                            {isDateFilterApplied ? "Filter aktiv" : "Anwenden"}
                                        </motion.span>
                                    </AnimatePresence>
                                </motion.button>
                                <motion.button
                                    onClick={handleClearDateFilter}
                                    className={`${neonButtonBaseClasses} ${neonButtonSlateClasses} h-[40px]`}
                                    whileHover={{ scale: 1.05, y: -1, transition: { type: "spring", stiffness: 350, damping: 15 } }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Trash2 size={14}/> Löschen
                                </motion.button>
                            </motion.div>

                            {isDateFilterApplied && (
                                <motion.div
                                    variants={itemVariants}
                                    className="w-full mt-3 md:mt-0 md:ml-auto md:flex-grow md:text-right self-end"
                                >
                                    <p className={`text-xs ${warningIconColor} italic flex items-center justify-start md:justify-end`}>
                                        <AlertTriangle size={14} className="mr-1.5 inline-block animate-pulse" />
                                        Die Ergebnisse sind nach dem gewählten Zeitraum gefiltert.
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
