// app/components/FilterControls.tsx
"use client";

import { motion } from "framer-motion";
import { SearchIcon, XIcon, MailIcon, FilterIcon, HashIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react"; // CheckCircleIcon hinzugefügt
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

    // NEUE Farbe für den aktiven Datumsfilter-Button und das Leuchten
    const dateFilterActiveColorClasses = "bg-yellow-500/50 hover:bg-yellow-600 focus:ring-cyan-400 animate-pulse";
    const dateFilterDefaultColorClasses = "bg-green-600 hover:bg-green-500 focus:ring-green-400";
    const warningIconColor = "text-amber-400"; // Beibehalten für das Warndreieck-Icon

    return (
        <div className="my-6 space-y-4 md:space-y-0 md:flex md:flex-col p-3 bg-slate-800/60 backdrop-blur-lg rounded-2xl shadow-xl">
            <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-4">
                {currentView === "beschwerden" && (
                    <div className="p-1 bg-slate-700/50 backdrop-blur-sm rounded-full shadow-lg flex justify-center items-center relative max-w-md w-full md:w-auto">
                        {(Object.keys(FILTER_LABELS) as StatusFilterMode[]).map((filterKey) => (
                            <button
                                key={filterKey}
                                onClick={() => setActiveStatusFilter(filterKey)}
                                className={`relative flex-1 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-opacity-75 whitespace-nowrap
                                    ${activeStatusFilter === filterKey ? 'text-green-50' : 'text-slate-300 hover:text-slate-100'}`}
                            >
                                <span className="relative z-10">{FILTER_LABELS[filterKey]}</span>
                                {activeStatusFilter === filterKey && (
                                    <motion.div
                                        layoutId="activeFilterPillNeonGlass"
                                        className="absolute inset-0 bg-green-500/70 rounded-full -z-0"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}
                {/* Suchfelder */}
                <div className="flex flex-col items-start w-full md:w-auto md:min-w-[180px]">
                    <div className="relative w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"> <SearchIcon size={16} className="text-slate-400" /> </span>
                        <input type="text" id="personSearch" placeholder="Personensuche" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full pl-10 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full" style={{ colorScheme: 'dark' }} />
                        {searchTerm && (<button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-200" title="Suche zurücksetzen" > <XIcon size={18} /> </button>)}
                    </div>
                </div>
                <div className="flex flex-col items-start w-full md:w-auto md:min-w-[180px]">
                    <div className="relative w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"> <MailIcon size={16} className="text-slate-400" /> </span>
                        <input type="text" id="emailSearch" placeholder="E-Mail Suche" value={emailSearchTerm} onChange={(e) => setEmailSearchTerm(e.target.value)} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full pl-10 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full" style={{ colorScheme: 'dark' }} />
                        {emailSearchTerm && (<button onClick={() => setEmailSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-200" title="E-Mail-Suche zurücksetzen" > <XIcon size={18} /> </button>)}
                    </div>
                </div>
                <div className="flex flex-col items-start w-full md:w-auto md:min-w-[150px]">
                    <div className="relative w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"> <HashIcon size={16} className="text-slate-400" /> </span>
                        <input type="text" id="idSearch" placeholder="ID (Nr.)..." value={idSearchTerm} onChange={(e) => setIdSearchTerm(e.target.value.replace(/\D/g, ''))} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full pl-10 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full" style={{ colorScheme: 'dark' }} />
                        {idSearchTerm && (<button onClick={() => setIdSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-200" title="ID-Suche zurücksetzen" > <XIcon size={18} /> </button>)}
                    </div>
                </div>

                {/* Button für erweiterte Filter */}
                <div className="flex flex-col items-start self-center md:self-end">
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="relative px-3 h-[38px] bg-slate-600 hover:bg-slate-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center gap-2 whitespace-nowrap"
                        title={showAdvancedFilters ? "Erweiterte Filter ausblenden" : "Erweiterte Filter anzeigen"}
                    >
                        <FilterIcon size={14} />
                        <span>{showAdvancedFilters ? "Weniger" : "Mehr"} Filter</span>
                        {isDateFilterApplied && (
                            // Statt img ein Lucide Icon verwenden für konsistente Farbgebung
                            <AlertTriangleIcon size={18} className={`absolute -right-10.5 ${warningIconColor} animate-pulse`} />
                        )}
                    </button>
                </div>
            </div>

            {showAdvancedFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                >
                    <div className="flex flex-wrap items-end gap-x-3 border-t border-slate-700/50 h-20">
                        <div className="flex flex-col items-start">
                            <input placeholder="Startdatum" type="date" id="startDate" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="bg-slate-700/50 text-slate-100 border mb-1 border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full sm:w-auto" style={{ colorScheme: 'dark' }} />
                        </div>
                        <div className="flex flex-col items-start">
                            <input type="date" id="endDate" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} min={startDateInput || undefined} className="bg-slate-700/50 text-slate-100 border mb-1 border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full sm:w-auto" style={{ colorScheme: 'dark' }} />
                        </div>
                        <div className="flex gap-2 items-center pt-1 h-auto sm:pt-0 sm:self-end">
                            <button 
                                onClick={handleApplyDateFilter} 
                                className={`flex items-center justify-center gap-1.5 px-3 h-[38px] mb-1 text-white text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ease-in-out focus:outline-none whitespace-nowrap
                                            ${isDateFilterApplied ? dateFilterActiveColorClasses : dateFilterDefaultColorClasses}`}
                            >
                                {isDateFilterApplied && <CheckCircleIcon size={14} />} {/* Icon für angewendeten Zustand */}
                                {isDateFilterApplied ? "Angewendet" : "Anwenden"} {/* Dynamischer Text */}
                            </button>
                            <button 
                                onClick={handleClearDateFilter} 
                                className="px-3 h-[38px] bg-slate-600 hover:bg-slate-500 text-white mb-1 text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 whitespace-nowrap"
                            >
                                Löschen
                            </button>
                        </div>
                        {isDateFilterApplied && (
                            <div className="w-full mt-2 md:mt-0 md:ml-auto md:flex-grow md:text-right">
                                <p className={`text-xs ${warningIconColor} italic flex items-center justify-start md:justify-end`}>
                                    <AlertTriangleIcon size={14} className="mr-1.5 inline-block" />
                                    Die Ergebnisse sind nach dem gewählten Zeitraum gefiltert.
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
