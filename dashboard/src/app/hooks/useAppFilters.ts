// src/app/hooks/useAppFilters.ts
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    DataItem,
    ViewType,
    StatusFilterMode,
    BeschwerdeItem,
} from '../types'; // Passe den Pfad ggf. an (z.B. '@/app/types')
import { DateFilterTarget } from '../components/ContaintTable'; // Passe den Pfad ggf. an (z.B. '@/app/components/ContaintTable')

interface UseAppFiltersProps {
    initialData: (DataItem & { action_required?: "relock_ui" })[];
    currentView: ViewType;
}

export function useAppFilters({ initialData, currentView }: UseAppFiltersProps) {
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterMode>("alle");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [emailSearchTerm, setEmailSearchTerm] = useState<string>("");
    const [idSearchTerm, setIdSearchTerm] = useState<string>("");
    const [haltestelleSearchTerm, setHaltestelleSearchTerm] = useState<string>("");
    const [linieSearchTerm, setLinieSearchTerm] = useState<string>("");

    const [startDateInput, setStartDateInput] = useState<string>("");
    const [endDateInput, setEndDateInput] = useState<string>("");
    const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
    const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

    const [dateFilterTarget, setDateFilterTarget] = useState<DateFilterTarget>(
        currentView === "beschwerden" ? 'datum' : 'erstelltam'
    );

    useEffect(() => {
        setDateFilterTarget(currentView === "beschwerden" ? 'datum' : 'erstelltam');
    }, [currentView]);

    const handleApplyDateFilter = useCallback(() => {
        setAppliedStartDate(startDateInput || null);
        setAppliedEndDate(endDateInput || null);
        // console.log(`Datumsfilter angewendet via Hook: Start=${startDateInput || 'N/A'}, Ende=${endDateInput || 'N/A'}`);
    }, [startDateInput, endDateInput]);

    const handleClearDateFilter = useCallback(() => {
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);
        // console.log("Datumsfilter zurückgesetzt via Hook.");
    }, []);

    const isDateFilterApplied = useMemo(() => !!(appliedStartDate || appliedEndDate), [appliedStartDate, appliedEndDate]);

    const filteredData = useMemo(() => {
        let tempData = [...initialData];
        // console.log("-----------------------------------------");
        // console.log("ID-Filter (Hook): Start der Filterberechnung");
        // console.log("ID-Filter (Hook): idSearchTerm (aus Input):", idSearchTerm);
        // console.log("ID-Filter (Hook): Ursprüngliche tempData Länge:", tempData.length);

        if (currentView === "statistik" || currentView === "admin" || !initialData || initialData.length === 0) {
            return [];
        }

        if (activeStatusFilter !== "alle" && (currentView === "beschwerden" || currentView === "lob" || currentView === "anregungen")) {
            tempData = tempData.filter(item => 'status' in item && item.status === activeStatusFilter);
        }

        if (searchTerm.trim() !== "") {
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            tempData = tempData.filter(item => item.name?.toLowerCase().includes(lowerSearchTerm));
        }
        if (emailSearchTerm.trim() !== "") {
            const lowerEmailSearchTerm = emailSearchTerm.trim().toLowerCase();
            tempData = tempData.filter(item => item.email?.toLowerCase().includes(lowerEmailSearchTerm));
        }

        if (idSearchTerm.trim() !== "") {
            const trimmedIdSearchTerm = idSearchTerm.trim();
            const searchId = parseInt(trimmedIdSearchTerm, 10);
            if (!isNaN(searchId)) {
                // console.log(`ID-Filter (Hook): Wende Filter an für searchId: ${searchId}.`);
                // console.log(`ID-Filter (Hook): tempData VOR Filterung (nur IDs):`, JSON.parse(JSON.stringify(tempData.map(item => item.id))));
                tempData = tempData.filter(item => item.id === searchId);
                // console.log(`ID-Filter (Hook): tempData NACH Filterung für searchId: ${searchId} (nur IDs):`, JSON.parse(JSON.stringify(tempData.map(item => item.id))));
            } else {
                // console.log(`ID-Filter (Hook): idSearchTerm "${trimmedIdSearchTerm}" ist keine gültige Zahl. Leere tempData.`);
                tempData = [];
            }
        } else {
            // console.log("ID-Filter (Hook): idSearchTerm ist leer, ID-Filter wird übersprungen.");
        }

        if (currentView === "beschwerden") {
            if (haltestelleSearchTerm.trim() !== "") {
                const lower = haltestelleSearchTerm.trim().toLowerCase();
                tempData = tempData.filter(item => 'haltestelle' in item && (item as BeschwerdeItem).haltestelle?.toLowerCase().includes(lower));
            }
            if (linieSearchTerm.trim() !== "") {
                const lower = linieSearchTerm.trim().toLowerCase();
                tempData = tempData.filter(item => 'linie' in item && (item as BeschwerdeItem).linie?.toLowerCase().includes(lower));
            }
        }

        if (appliedStartDate || appliedEndDate) {
            const sDate = appliedStartDate ? new Date(appliedStartDate) : null;
            const eDate = appliedEndDate ? new Date(appliedEndDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            if (eDate) eDate.setHours(23, 59, 59, 999);

            tempData = tempData.filter(item => {
                let dateStringToFilter: string | null = item.erstelltam;
                if (dateFilterTarget === 'datum' && currentView === 'beschwerden' && 'datum' in item) {
                    dateStringToFilter = (item as BeschwerdeItem).datum;
                }
                if (!dateStringToFilter) return false;

                try {
                    const itemDate = new Date(dateStringToFilter);
                    if (dateFilterTarget === 'datum' && currentView === 'beschwerden' && dateStringToFilter.length === 10) {
                        const [year, month, day] = dateStringToFilter.split('-').map(Number);
                        itemDate.setFullYear(year, month - 1, day);
                        itemDate.setHours(0, 0, 0, 0);
                    }

                    if (isNaN(itemDate.getTime())) return false;

                    let match = true;
                    if (sDate && itemDate < sDate) match = false;
                    if (eDate && itemDate > eDate) match = false;
                    return match;
                } catch (e) {
                    console.error("Fehler beim Parsen des Datums im Filter:", e, {dateStringToFilter, item});
                    return false;
                }
            });
        }
        return tempData;
    }, [
        initialData, currentView, activeStatusFilter, searchTerm, emailSearchTerm, idSearchTerm,
        haltestelleSearchTerm, linieSearchTerm, appliedStartDate, appliedEndDate, dateFilterTarget
    ]);

    useEffect(() => {
        // Beim Wechsel der Ansicht (currentView) werden die Filter zurückgesetzt.
        setActiveStatusFilter("alle");
        setSearchTerm("");
        setEmailSearchTerm("");
        setIdSearchTerm("");
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);
        // setDateFilterTarget wird bereits durch den anderen useEffect auf currentView oben gehandhabt.

        if (currentView !== "beschwerden") {
            setHaltestelleSearchTerm("");
            setLinieSearchTerm("");
        }
        // Die `showAdvancedFilters` Logik verbleibt in ContaintTable, da sie reiner UI-State ist.
    }, [currentView]);

    return {
        filteredData,
        activeStatusFilter, setActiveStatusFilter,
        searchTerm, setSearchTerm,
        emailSearchTerm, setEmailSearchTerm,
        idSearchTerm, setIdSearchTerm,
        haltestelleSearchTerm, setHaltestelleSearchTerm,
        linieSearchTerm, setLinieSearchTerm,
        startDateInput, setStartDateInput,
        endDateInput, setEndDateInput,
        // appliedStartDate, // Nicht direkt benötigt, isDateFilterApplied reicht
        // appliedEndDate,   // Nicht direkt benötigt
        dateFilterTarget, setDateFilterTarget,
        handleApplyDateFilter,
        handleClearDateFilter,
        isDateFilterApplied,
    };
}