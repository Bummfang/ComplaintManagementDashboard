import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    DataItem,
    ViewType,
    StatusFilterMode,
    BeschwerdeItem,
    AnyItemStatus // Sicherstellen, dass AnyItemStatus korrekt importiert ist oder hier definiert wird
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
    const [assigneeSearchTerm, setAssigneeSearchTerm] = useState<string>("");

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
    }, [startDateInput, endDateInput]);

    const handleClearDateFilter = useCallback(() => {
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);
    }, []);

    const isDateFilterApplied = useMemo(() => !!(appliedStartDate || appliedEndDate), [appliedStartDate, appliedEndDate]);

    const filteredData = useMemo(() => {
        let tempData = [...initialData];

        if (currentView === "statistik" || currentView === "admin" || !initialData || initialData.length === 0) {
            return [];
        }

        // ANGEPASSTE STATUSFILTER-LOGIK
        if (activeStatusFilter !== "alle" && (currentView === "beschwerden" || currentView === "lob" || currentView === "anregungen")) {
            tempData = tempData.filter(item => {
                const itemStatusValue = item.status; // Kann null, undefined, "offen", "Offen", "In Bearbeitung" etc. sein
                let normalizedItemStatus: string; // Wird "Offen", "In Bearbeitung", etc. halten

                if (itemStatusValue === null || typeof itemStatusValue === 'undefined') {
                    normalizedItemStatus = "Offen"; // Standard für nicht gesetzte Status
                } else if (typeof itemStatusValue === 'string' && itemStatusValue.toLowerCase() === "offen") {
                    // Wenn item.status ein String ist und kleingeschrieben "offen" lautet,
                    // normalisiere es zu "Offen" (mit großem O) für den Vergleich.
                    normalizedItemStatus = "Offen";
                } else if (typeof itemStatusValue === 'string') {
                    // Für alle anderen String-Status (z.B. "In Bearbeitung", "Gelöst", "Abgelehnt", "Offen" (bereits korrekt))
                    // wird der Wert direkt übernommen. AnyItemStatus sollte diese abdecken.
                    normalizedItemStatus = itemStatusValue;
                } else {
                    // Dieser Fall sollte bei korrekter Typisierung von item.status (AnyItemStatus | null | undefined)
                    // nicht eintreten. Wenn doch, passt das Item zu keinem gültigen Status.
                    return false; 
                }
                
                return normalizedItemStatus === activeStatusFilter;
            });
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
                tempData = tempData.filter(item => item.id === searchId);
            } else {
                tempData = []; 
            }
        }
        
        if (assigneeSearchTerm.trim() !== "") {
            const lowerAssigneeSearchTerm = assigneeSearchTerm.trim().toLowerCase();
            tempData = tempData.filter(item =>
                item.bearbeiter_name && 
                item.bearbeiter_name.toLowerCase().includes(lowerAssigneeSearchTerm)
            );
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
        assigneeSearchTerm, 
        haltestelleSearchTerm, linieSearchTerm, appliedStartDate, appliedEndDate, dateFilterTarget
    ]);

    useEffect(() => {
        setActiveStatusFilter("alle");
        setSearchTerm("");
        setEmailSearchTerm("");
        setIdSearchTerm("");
        setAssigneeSearchTerm(""); 
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);

        if (currentView !== "beschwerden") {
            setHaltestelleSearchTerm("");
            setLinieSearchTerm("");
        }
    }, [currentView]);

    return {
        filteredData,
        activeStatusFilter, setActiveStatusFilter,
        searchTerm, setSearchTerm,
        emailSearchTerm, setEmailSearchTerm,
        idSearchTerm, setIdSearchTerm,
        assigneeSearchTerm, setAssigneeSearchTerm, 
        haltestelleSearchTerm, setHaltestelleSearchTerm,
        linieSearchTerm, setLinieSearchTerm,
        startDateInput, setStartDateInput,
        endDateInput, setEndDateInput,
        dateFilterTarget, setDateFilterTarget,
        handleApplyDateFilter,
        handleClearDateFilter,
        isDateFilterApplied,
    };
}