// app/components/FilterControls.tsx
"use client";

import { motion } from "framer-motion";
import { SearchIcon, XIcon, MailIcon, FilterIcon, HashIcon } from "lucide-react";
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
                                        className="absolute inset-0 bg-green-500/70 rounded-full  -z-0"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}
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
                <div className="flex flex-col items-start self-end">
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="relative px-3 h-[38px] bg-slate-600 hover:bg-slate-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center gap-2 whitespace-nowrap"
                        title={showAdvancedFilters ? "Erweiterte Filter ausblenden" : "Erweiterte Filter anzeigen"}
                    >
                        <FilterIcon size={14} />
                        <span>{showAdvancedFilters ? "Weniger" : "Mehr"} Filter</span>
                        {isDateFilterApplied && (
                            <img src={'warning.svg'} className="absolute -right-10 w-5.5 h-5.5  border-slate-800 animate-pulse"></img>
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
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-3 pt-4 border-t border-slate-700/50">
                        <div className="flex flex-col items-start h-12">
                            <input placeholder="323" type="date" id="startDate" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full sm:w-auto" style={{ colorScheme: 'dark' }} />
                        </div>
                        <div className="flex flex-col items-start h-12">
                            <input type="date" id="endDate" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} min={startDateInput} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full sm:w-auto" style={{ colorScheme: 'dark' }} />
                        </div>
                        <div className="flex gap-2 items-center pt-1 h-15 sm:pt-0">
                            <button onClick={handleApplyDateFilter} className="px-3 h-[38px] bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 whitespace-nowrap">
                                Anwenden
                            </button>
                            <button onClick={handleClearDateFilter} className="px-3 h-[38px] bg-slate-600 hover:bg-slate-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 whitespace-nowrap" >
                                Löschen
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}