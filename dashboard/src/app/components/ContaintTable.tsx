// app/components/ContaintTable.tsx
"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";

// Importiere den useAuth-Hook für den Zugriff auf den Authentifizierungsstatus
import { useAuth } from '../contexts/AuthContext'; // Passe den Pfad ggf. an

// useRouter für eventuelle Weiterleitungen
import { useRouter } from 'next/navigation';

// Importiere deine Typen, Konstanten und anderen Komponenten
import { DataItem, ViewType, StatusFilterMode, BeschwerdeItem } from '../types'; // Stelle sicher, dass der Pfad zu 'types' korrekt ist
import { API_ENDPOINTS, VIEW_TITLES, FILTER_LABELS } from '../constants'; // Stelle sicher, dass der Pfad zu 'constants' korrekt ist
import StatusBar from './StatusBar'; // StatusBar wird hier verwendet
import ViewTabs from './ViewTabs';
import FilterControls from './FilterControls';
import DataItemCard from './DataItemCard';

export default function ContaintTable() {
  const { isAuthenticated, user, token, isLoadingAuth, logout } = useAuth();
  const router = useRouter();

  const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
  const [data, setData] = useState<DataItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterMode>("alle");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [emailSearchTerm, setEmailSearchTerm] = useState<string>("");
  const [idSearchTerm, setIdSearchTerm] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [startDateInput, setStartDateInput] = useState<string>("");
  const [endDateInput, setEndDateInput] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [lastDataUpdateTimestamp, setLastDataUpdateTimestamp] = useState<Date | null>(null);

  const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
    if (!token) {
      if (!isBackgroundUpdate) setIsLoadingData(false);
      console.warn("ContaintTable: fetchData called without a token.");
      return;
    }
    if (!isBackgroundUpdate) {
      setIsLoadingData(true);
      setError(null);
    }
    try {
      if (!API_ENDPOINTS[view]) {
        throw new Error(`Kein API Endpunkt definiert für die Ansicht: ${view}`);
      }
      const response = await fetch(API_ENDPOINTS[view], {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        setIsDbConnected(false);
        const errorData = await response.json().catch(() => ({ error: `HTTP-Fehler ${response.status}`, details: response.statusText }));
        if (response.status === 401) {
          setError("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
          logout();
          return;
        }
        throw new Error(errorData.error || `Fehler beim Laden der Daten für '${view}': Status ${response.status}`);
      }
      const fetchedData: DataItem[] = await response.json();
      setData(fetchedData);
      setIsDbConnected(true);
      setLastDataUpdateTimestamp(new Date());
      if (!isBackgroundUpdate) setError(null);
    } catch (err) {
      setIsDbConnected(false);
      setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist beim Laden der Daten aufgetreten.");
    } finally {
      if (!isBackgroundUpdate) setIsLoadingData(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchData(currentView);
      setActiveStatusFilter("alle");
      setSearchTerm("");
      setEmailSearchTerm("");
      setIdSearchTerm("");
      setStartDateInput("");
      setEndDateInput("");
      setAppliedStartDate(null);
      setAppliedEndDate(null);
      setShowAdvancedFilters(false);
    } else if (!isLoadingAuth && !isAuthenticated) {
      setData([]);
    }
  }, [currentView, isAuthenticated, token, isLoadingAuth, fetchData]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAuthenticated && token) {
      intervalId = setInterval(() => {
        fetchData(currentView, true);
      }, 30000);
    }
    return () => clearInterval(intervalId);
  }, [currentView, isAuthenticated, token, fetchData]);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let tempData = [...data];
    if (currentView === "beschwerden" && activeStatusFilter !== "alle") {
        tempData = tempData.filter(item => {
            if ("status" in item) { const beschwerde = item as BeschwerdeItem; return beschwerde.status === activeStatusFilter; }
            return false;
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
        const searchId = parseInt(idSearchTerm.trim(), 10);
        if (!isNaN(searchId)) {
            tempData = tempData.filter(item => item.id === searchId);
        }
    }
    if (appliedStartDate || appliedEndDate) {
        const sDate = appliedStartDate ? new Date(appliedStartDate) : null;
        const eDate = appliedEndDate ? new Date(appliedEndDate) : null;
        if (sDate) sDate.setHours(0, 0, 0, 0);
        if (eDate) eDate.setHours(23, 59, 59, 999);
        tempData = tempData.filter(item => {
            if (!item.erstelltam) return false;
            try {
                const itemDate = new Date(item.erstelltam);
                if (isNaN(itemDate.getTime())) return false;
                let match = true;
                if (sDate && itemDate < sDate) match = false;
                if (eDate && itemDate > eDate) match = false;
                return match;
            } catch (e) { console.error("Error parsing date for filtering:", item.erstelltam, e); return false; }
        });
    }
    return tempData;
  }, [data, currentView, activeStatusFilter, appliedStartDate, appliedEndDate, searchTerm, emailSearchTerm, idSearchTerm]);

  const handleCopyToClipboard = async (textToCopy: string, cellKey: string) => {
    if (!textToCopy) return;
    try {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedCellKey(cellKey);
        setTimeout(() => setCopiedCellKey(null), 1500);
    }
    catch (err) {
        setError("Kopieren fehlgeschlagen.");
        console.log("Clipboard error:", err);
        setTimeout(() => setError(null), 3000);
    }
  };

  const performStatusChangeAsync = useCallback(async (itemId: number, newStatus: BeschwerdeItem["status"]) => {
    if (!user?.isAdmin) {
      setError("Nur Administratoren können den Status ändern.");
      return;
    }
    if (!token) {
      setError("Nicht autorisiert für Statusänderung. Bitte neu anmelden.");
      logout();
      return;
    }
    const originalData = [...data];
    setData(prevData => prevData.map(item => item.id === itemId && 'status' in item ? { ...item, status: newStatus } as BeschwerdeItem : item));
    setError(null);
    try {
      if (!API_ENDPOINTS.beschwerden) {
        throw new Error("API Endpunkt für Beschwerden-Statusänderung nicht definiert.");
      }
      const response = await fetch(API_ENDPOINTS.beschwerden, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: itemId, status: newStatus }),
      });
      if (!response.ok) {
        setData(originalData);
        const errorData = await response.json().catch(() => ({ details: response.statusText, error: `HTTP-Fehler ${response.status}` }));
        if (response.status === 401) {
          setError("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
          logout();
          return;
        }
        throw new Error(`Statusupdate fehlgeschlagen (${response.status}): ${errorData.details || errorData.error || "Unbekannter Serverfehler"}`);
      }
      fetchData(currentView, true);
    } catch (err) {
      setData(originalData);
      setError(err instanceof Error ? err.message : "Statusupdate ist fehlgeschlagen.");
      throw err;
    }
  }, [user, token, data, logout, fetchData, currentView, setError, setData]);

  const handleStatusChangeForCard = (itemId: number, newStatus: BeschwerdeItem["status"]): void => {
    if (user?.isAdmin && currentView === "beschwerden") {
      performStatusChangeAsync(itemId, newStatus).catch(err => {
        console.error("ContaintTable: Fehler beim Aufruf von performStatusChangeAsync:", err);
      });
    } else {
      setError("Aktion nicht erlaubt.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleApplyDateFilter = () => { setAppliedStartDate(startDateInput || null); setAppliedEndDate(endDateInput || null); };
  const handleClearDateFilter = () => { setStartDateInput(""); setEndDateInput(""); setAppliedStartDate(null); setAppliedEndDate(null); };
  const isDateFilterApplied = useMemo(() => !!(appliedStartDate || appliedEndDate), [appliedStartDate, appliedEndDate]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen w-full bg-[#0D0D12] text-white font-sans flex justify-center items-center">
        <p>Authentifizierung wird geprüft...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#0D0D12] text-white font-sans flex flex-col justify-center items-center">
        <p className="mb-4 text-xl">Bitte melden Sie sich an, um auf diese Inhalte zuzugreifen.</p>
        <button
          onClick={() => router.push('/')} // Leitet zur Login-Seite (page.tsx)
          className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Zur Login-Seite
        </button>
      </div>
    );
  }

  // Haupt-JSX der Komponente
  return (
    // pt-16 (Padding Top) gibt Platz für die StatusBar (h-14 ist ca. 56px, pt-16 ist 64px)
    // Du kannst diesen Wert (z.B. pt-20) anpassen, um mehr oder weniger Abstand zu haben.
    <div className="min-h-screen w-full bg-[#0D0D12] text-white font-sans relative pt-16 pb-16">
      <StatusBar
        isDbConnected={isDbConnected}
        lastDataUpdateTimestamp={lastDataUpdateTimestamp}
        isAuthenticated={isAuthenticated}
        user={user}
        logout={logout}
      />
      
      {/* Der Hauptinhaltsbereich, der scrollbar ist */}
      {/* Original-Styling: "w-full max-w-none mt-10 p-4 md:p-8 mx-auto" */}
      {/* Das 'mt-10' wird durch das 'pt-16' des Elternelements und das Padding hier ersetzt/angepasst. */}
      <motion.div
        className="w-full max-w-none p-4 md:p-8 mx-auto" // mt-10 entfernt, da pt-16 am Elternelement ist. max-w-none für volle Breite.
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ViewTabs currentView={currentView} setCurrentView={setCurrentView} />
        
        {/* Titel wieder hier platziert, wie im Original */}
        <h1 className="text-xl md:text-2xl font-semibold my-4 text-neutral-200 text-center md:text-left"> 
          {/* my-4 für Abstand oben/unten, mb-2 war im Original, text-center/md:text-left für bessere Optik */}
          {VIEW_TITLES[currentView] || "Übersicht"}
        </h1>

        <FilterControls
          currentView={currentView}
          activeStatusFilter={activeStatusFilter}
          setActiveStatusFilter={setActiveStatusFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          emailSearchTerm={emailSearchTerm} setEmailSearchTerm={setEmailSearchTerm}
          idSearchTerm={idSearchTerm} setIdSearchTerm={setIdSearchTerm}
          showAdvancedFilters={showAdvancedFilters} setShowAdvancedFilters={setShowAdvancedFilters}
          startDateInput={startDateInput} setStartDateInput={setStartDateInput}
          endDateInput={endDateInput} setEndDateInput={setEndDateInput}
          handleApplyDateFilter={handleApplyDateFilter} handleClearDateFilter={handleClearDateFilter}
          isDateFilterApplied={isDateFilterApplied}
        />
        {error && (
          <div className="my-4 p-3 bg-red-700/80 text-red-100 border border-red-600 rounded-md shadow-lg" role="alert">
            <p><strong>Fehler:</strong> {error}</p>
          </div>
        )}
        {isLoadingData && !error ? (
          <div className="text-center py-10 text-neutral-400">Lade Daten...</div>
        ) : !isLoadingData && filteredData.length === 0 && !error ? (
          <div className="text-center py-10 text-neutral-500">
            Keine Einträge für
            {searchTerm.trim() !== "" && ` Person "${searchTerm}"`}
            {emailSearchTerm.trim() !== "" && `${searchTerm.trim() !== "" ? ' und' : ''} E-Mail "${emailSearchTerm}"`}
            {idSearchTerm.trim() !== "" && `${(searchTerm.trim() !== "" || emailSearchTerm.trim() !== "") ? ' und' : ''} ID "${idSearchTerm}"`}
            {currentView === "beschwerden" && activeStatusFilter !== "alle" && `${(searchTerm.trim() !== "" || emailSearchTerm.trim() !== "" || idSearchTerm.trim() !== "") ? ' und' : ''} Status "${FILTER_LABELS[activeStatusFilter]}"`}
            {(appliedStartDate || appliedEndDate) && `${(searchTerm.trim() !== "" || emailSearchTerm.trim() !== "" || idSearchTerm.trim() !== "" || (currentView === "beschwerden" && activeStatusFilter !== "alle")) ? ' und' : ''} im gewählten Zeitraum`}
            {searchTerm.trim() === "" && emailSearchTerm.trim() === "" && idSearchTerm.trim() === "" && (currentView !== "beschwerden" || activeStatusFilter === "alle") && !(appliedStartDate || appliedEndDate) && ` die Ansicht "${VIEW_TITLES[currentView]}"`}
            gefunden.
          </div>
        ) : !isLoadingData && filteredData.length > 0 && !error ? (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredData.map((item) => (
              <DataItemCard
                key={item.id}
                item={item}
                currentView={currentView}
                copiedCellKey={copiedCellKey}
                onCopyToClipboard={handleCopyToClipboard}
                onStatusChange={handleStatusChangeForCard}
              />
            ))}
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}
