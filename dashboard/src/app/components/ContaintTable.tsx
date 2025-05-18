// app/components/ContaintTable.tsx
"use client";

import { motion, MotionProps, Transition as MotionTransition } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";

import { useAuth, User as AuthUser } from '../contexts/AuthContext'; // User als AuthUser importieren, falls nötig
import { useRouter } from 'next/navigation';

import { DataItem, ViewType, StatusFilterMode, BeschwerdeItem } from '../types';
import { API_ENDPOINTS, VIEW_TITLES, FILTER_LABELS } from '../constants';
import StatusBar from './StatusBar';
import ViewTabs from './ViewTabs';
import FilterControls from './FilterControls';
import DataItemCard from './DataItemCard';
import StatisticsView from './StatisticsView';
import AdminSection from './AdminSection'; // NEU: Admin-Sektion importieren

// BackgroundBlob Komponente (unverändert)
interface BackgroundBlobProps {
  className: string;
  animateProps: MotionProps['animate'];
  transitionProps: MotionTransition;
}
type AnimatableXYProperties = {
  x?: string | number | string[] | number[];
  y?: string | number | string[] | number[];
};
const BackgroundBlob = ({ className, animateProps, transitionProps }: BackgroundBlobProps) => {
  const initialMotionValues: MotionProps['initial'] = {
    scale: 0.8,
    opacity: 0,
  };
  if (typeof animateProps === 'object' && animateProps !== null && !Array.isArray(animateProps)) {
    const target = animateProps as AnimatableXYProperties;
    if (target.x && Array.isArray(target.x) && typeof target.x[0] === 'number') {
      initialMotionValues.x = target.x[0];
    }
    if (target.y && Array.isArray(target.y) && typeof target.y[0] === 'number') {
      initialMotionValues.y = target.y[0];
    }
  }
  return (
    <motion.div
      className={`absolute rounded-full filter blur-xl pointer-events-none ${className}`}
      initial={initialMotionValues}
      animate={animateProps}
      transition={transitionProps}
    />
  );
};

export default function ContaintTable() {
  const { isAuthenticated, user, token, isLoadingAuth, logout } = useAuth(); // user ist hier AuthUser
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
  const [cardAccentsEnabled, setCardAccentsEnabled] = useState<boolean>(true);

  // Modal-Zustände und Handler sind jetzt in AdminSection.tsx

  const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
    // Daten nicht laden für Admin- oder Statistik-Ansicht über diesen Weg
    if (view === "statistik" || view === "admin") {
      setIsLoadingData(false);
      setData([]);
      setError(null);
      return;
    }

    if (!token) {
      if (!isBackgroundUpdate) setIsLoadingData(false);
      console.warn("ContaintTable: fetchData called without a token.");
      return;
    }

    const apiEndpoint = API_ENDPOINTS[view];
    if (!apiEndpoint) {
        setIsLoadingData(false);
        const errorMessage = `Kein API Endpunkt definiert für die Ansicht: ${view}`;
        setError(errorMessage);
        console.error(errorMessage);
        return;
    }

    if (!isBackgroundUpdate) {
      setIsLoadingData(true);
      setError(null);
    }
    try {
      const response = await fetch(apiEndpoint, {
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
        throw new Error(errorData.error || `Fehler beim Laden der Daten für '${VIEW_TITLES[view] || view}': Status ${response.status}`);
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
      if (currentView !== "statistik" && currentView !== "admin") {
        setActiveStatusFilter("alle");
        setSearchTerm("");
        setEmailSearchTerm("");
        setIdSearchTerm("");
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);
        setShowAdvancedFilters(false);
      }
    } else if (!isLoadingAuth && !isAuthenticated) {
      setData([]);
    }
  }, [currentView, isAuthenticated, token, isLoadingAuth, fetchData]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAuthenticated && token && currentView !== "statistik" && currentView !== "admin") {
      intervalId = setInterval(() => {
        fetchData(currentView, true);
      }, 30000);
    }
    return () => clearInterval(intervalId);
  }, [currentView, isAuthenticated, token, fetchData]);

  const filteredData = useMemo(() => {
    if (currentView === "statistik" || currentView === "admin" || !data || data.length === 0) return [];
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
        } catch (e) {
          console.error("Error parsing date for filtering:", item.erstelltam, e);
          return false;
        }
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
    if (!token) {
      setError("Nicht autorisiert für Statusänderung. Bitte neu anmelden.");
      logout();
      return;
    }
    const originalData = [...data];
    setData(prevData => prevData.map(item =>
      item.id === itemId && 'status' in item ? { ...item, status: newStatus } as BeschwerdeItem : item
    ));
    setError(null);
    try {
        const beschwerdenEndpoint = API_ENDPOINTS.beschwerden; // API_ENDPOINTS.beschwerden ist string | null
        if (!beschwerdenEndpoint) {
            throw new Error("API Endpunkt für Beschwerden-Statusänderung nicht definiert.");
        }
      const response = await fetch(beschwerdenEndpoint, {
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
      throw err; // Wichtig, damit der Aufrufer den Fehler bemerkt
    }
  }, [token, data, logout, fetchData, currentView, setError, setData]);

  const handleStatusChangeForCard = (itemId: number, newStatus: BeschwerdeItem["status"]): void => {
    if (currentView === "beschwerden") {
      performStatusChangeAsync(itemId, newStatus).catch(err => {
        console.error("ContaintTable: Fehler beim Aufruf von performStatusChangeAsync:", err);
        // Fehler wird bereits in performStatusChangeAsync und an das UI weitergegeben
      });
    } else {
      setError("Statusänderung in dieser Ansicht nicht möglich.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleApplyDateFilter = () => { setAppliedStartDate(startDateInput || null); setAppliedEndDate(endDateInput || null); };
  const handleClearDateFilter = () => { setStartDateInput(""); setEndDateInput(""); setAppliedStartDate(null); setAppliedEndDate(null); };
  const isDateFilterApplied = useMemo(() => !!(appliedStartDate || appliedEndDate), [appliedStartDate, appliedEndDate]);

  // Der alte handleCreateNewUser Button und Funktion wurden entfernt.

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans flex justify-center items-center">
        <p>Authentifizierung wird geprüft...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans flex flex-col justify-center items-center p-4">
        <p className="mb-4 text-xl text-center">Bitte melden Sie sich an, um auf diese Inhalte zuzugreifen.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Zur Login-Seite
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans relative pt-16 pb-16 overflow-hidden">
      <BackgroundBlob
        className="w-[700px] h-[700px] bg-sky-900/80 -top-1/4 -left-1/3"
        animateProps={{ x: [-200, 100, -200], y: [-150, 80, -150], rotate: [0, 100, 0], scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03] }}
        transitionProps={{ duration: 55, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <BackgroundBlob
        className="w-[800px] h-[800px] bg-emerald-800/70 -bottom-1/3 -right-1/4"
        animateProps={{ x: [150, -100, 150], y: [100, -80, 100], rotate: [0, -120, 0], scale: [1.1, 1.3, 1.1], opacity: [0.04, 0.09, 0.04] }}
        transitionProps={{ duration: 60, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <BackgroundBlob
        className="w-[900px] h-[900px] bg-slate-700/60 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animateProps={{ scale: [1, 1.1, 1], opacity: [0.02, 0.05, 0.02] }}
        transitionProps={{ duration: 70, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />

      <StatusBar
        isDbConnected={isDbConnected}
        lastDataUpdateTimestamp={lastDataUpdateTimestamp}
        isAuthenticated={isAuthenticated}
        logout={logout}
      />

      <motion.div
        className="w-full max-w-none p-4 md:p-8 mx-auto relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* user Prop wird an ViewTabs übergeben */}
        <ViewTabs currentView={currentView} setCurrentView={setCurrentView} user={user} />

        <div className="flex flex-col md:flex-row justify-between items-center my-4">
          <h1 className="text-xl md:text-4xl font-semibold text-neutral-200 text-center md:text-left mb-2 md:mb-0">
            {VIEW_TITLES[currentView] || "Übersicht"}
          </h1>
          {/* Der Button "Neuen Nutzer anlegen" wurde von hier entfernt */}
        </div>

        {/* FilterControls nur anzeigen, wenn nicht Admin- oder Statistik-Ansicht */}
        {currentView !== "statistik" && currentView !== "admin" && (
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
            cardAccentsEnabled={cardAccentsEnabled}
            setCardAccentsEnabled={setCardAccentsEnabled}
          />
        )}

        {/* Fehlermeldung für allgemeinen Datenabruf (nicht für Admin- oder Statistikansicht relevant) */}
        {error && currentView !== "statistik" && currentView !== "admin" && (
          <div className="my-4 p-3 bg-red-700/80 text-red-100 border border-red-600 rounded-md shadow-lg" role="alert">
            <p><strong>Fehler:</strong> {error}</p>
          </div>
        )}

        {/* Hauptinhaltsbereich basierend auf currentView */}
        {currentView === "admin" ? (
          <AdminSection />
        ) : currentView === "statistik" ? (
          <StatisticsView />
        ) : isLoadingData && !error ? (
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
                cardAccentsEnabled={cardAccentsEnabled}
              />
            ))}
          </motion.div>
        ) : null}
      </motion.div>
      {/* Das CreateUserModal wird jetzt innerhalb von AdminSection gerendert */}
    </div>
  );
}