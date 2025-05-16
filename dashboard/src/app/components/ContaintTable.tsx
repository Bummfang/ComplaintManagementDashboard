// app/page.tsx

"use client";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";

// Definiere die Typen für deine Daten
interface BaseItem {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
}

interface BeschwerdeItem extends BaseItem {
    beschwerdegrund: string;
    datum: string;
    uhrzeit: string;
    haltestelle?: string;
    linie?: string;
    status?: "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
}

type LobItem = BaseItem;
type AnregungItem = BaseItem;
type DataItem = BeschwerdeItem | LobItem | AnregungItem;
type ViewType = "beschwerden" | "lob" | "anregungen";

type StatusFilterMode = "alle" | "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";

const API_ENDPOINTS: Record<ViewType, string> = {
    beschwerden: "/api/containt",
    lob: "/api/like",
    anregungen: "/api/feedback",
};

const VIEW_TITLES: Record<ViewType, string> = {
    beschwerden: "Beschwerdeübersicht",
    lob: "Lobübersicht",
    anregungen: "Anregungsübersicht",
};

const FILTER_LABELS: Record<StatusFilterMode, string> = {
    "alle": "Alle",
    "Offen": "Offen",
    "In Bearbeitung": "In Bearb.", // Gekürzt für besseren Platz
    "Gelöst": "Gelöst",
    "Abgelehnt": "Abgelehnt",
};

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error("Invalid date value");
        return date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch (e) {
        console.error("Fehler beim Formatieren des Datums:", e, "Input:", dateString);
        return dateString;
    }
};

const formatTime = (timeString?: string) => {
    if (!timeString || timeString.toLowerCase() === "invalid date") return "N/A"; // Behandelt "Invalid Date"
    try {
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
            return timeString.substring(0, 5);
        }
        const date = new Date(`1970-01-01T${timeString}`);
        if (isNaN(date.getTime())) {
            const fullDate = new Date(timeString);
            if (isNaN(fullDate.getTime())) return timeString; // Fallback auf Original, wenn alles fehlschlägt
            return fullDate.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        console.error("Fehler beim Formatieren der Uhrzeit:", e, "Input:", timeString);
        return timeString;
    }
};


const getStatusColor = (status?: BeschwerdeItem["status"]) => {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : undefined;
    switch (normalizedStatus) {
        case "offen": return "text-green-400";
        case "in bearbeitung": return "text-yellow-400";
        case "gelöst": return "text-blue-400";
        case "abgelehnt": return "text-red-400";
        default: return "text-neutral-400";
    }
};

export default function Home() {
    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [data, setData] = useState<DataItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterMode>("alle");
    const [startDateInput, setStartDateInput] = useState<string>("");
    const [endDateInput, setEndDateInput] = useState<string>("");
    const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
    const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

    const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
        if (!isBackgroundUpdate) { setIsLoading(true); setError(null); }
        try {
            const response = await fetch(API_ENDPOINTS[view]);
            if (!response.ok) { const errorText = await response.text(); throw new Error(`Fehler: Status ${response.status} - ${errorText.substring(0, 100)}`); }
            const fetchedData: DataItem[] = await response.json();
            setData(fetchedData);
            if (!isBackgroundUpdate) setError(null);
        } catch (err) {
            console.error(`Ladefehler ${view}:`, err); setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
        } finally { if (!isBackgroundUpdate) setIsLoading(false); }
    }, []);

    useEffect(() => {
        fetchData(currentView);
        setActiveStatusFilter("alle");
        setStartDateInput(""); setEndDateInput("");
        setAppliedStartDate(null); setAppliedEndDate(null);
    }, [currentView, fetchData]);

    useEffect(() => {
        const intervalId = setInterval(() => { fetchData(currentView, true); }, 30000);
        return () => clearInterval(intervalId);
    }, [currentView, fetchData]);

    const filteredData = useMemo(() => {
        let tempData = [...data];
        if (currentView === "beschwerden" && activeStatusFilter !== "alle") {
            tempData = tempData.filter(item => {
                if ("status" in item) { const beschwerde = item as BeschwerdeItem; return beschwerde.status === activeStatusFilter; }
                return false;
            });
        }
        if (appliedStartDate || appliedEndDate) {
            const sDate = appliedStartDate ? new Date(appliedStartDate) : null;
            const eDate = appliedEndDate ? new Date(appliedEndDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            if (eDate) eDate.setHours(23, 59, 59, 999);
            tempData = tempData.filter(item => {
                try {
                    const itemDate = new Date(item.erstelltam);
                    if (isNaN(itemDate.getTime())) return false;
                    let match = true;
                    if (sDate && itemDate < sDate) match = false;
                    if (eDate && itemDate > eDate) match = false;
                    return match;
                } catch (e) { return false; }
            });
        }
        return tempData;
    }, [data, currentView, activeStatusFilter, appliedStartDate, appliedEndDate]);

    const handleCopyToClipboard = async (textToCopy: string | undefined, cellKey: string) => {
        if (typeof textToCopy !== 'string' || !textToCopy) { return; }
        try { await navigator.clipboard.writeText(textToCopy); setCopiedCellKey(cellKey); setTimeout(() => setCopiedCellKey(null), 2000); }
        catch (err) { console.error('Kopierfehler: ', err); setError("Kopieren fehlgeschlagen."); setTimeout(() => setError(null), 3000); }
    };

    const handleStatusChange = async (itemId: number, newStatus: BeschwerdeItem["status"]) => {
        const originalData = [...data];
        setData(prevData => prevData.map(item => item.id === itemId && 'status' in item ? { ...item, status: newStatus } as BeschwerdeItem : item));
        setError(null);
        try {
            const response = await fetch(`${API_ENDPOINTS.beschwerden}/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify({ status: newStatus }), });
            if (!response.ok) { setData(originalData); const errorData = await response.json().catch(() => ({ details: response.statusText })); throw new Error(`Update fehlgeschlagen (${response.status}): ${errorData.details || errorData.error || "Serverfehler"}`); }
            fetchData(currentView, true);
        } catch (err) { console.error(`Statusänderungsfehler für Item ${itemId}:`, err); setData(originalData); setError(err instanceof Error ? err.message : "Statusupdate fehlgeschlagen."); setTimeout(() => setError(null), 5000); }
    };

    const renderTableHeaders = (): string[] => {
        const baseHeaders = ["ID", "Name", "Email", "Tel.", "Betreff"];
        if (currentView === "beschwerden") {
            return [...baseHeaders, "Grund", "Beschreibung", "Vorfall Datum", "Vorfall Uhrzeit", "Linie", "Haltestelle", "Status", "Erstellt am", "Aktionen"];
        }
        return [...baseHeaders, "Beschreibung", "Erstellt am", "Aktionen"];
    };

    const renderTableRow = (item: DataItem) => {
        const itemTypePrefix = currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-";
        const rowId = `${currentView}-${item.id}`;
        const renderCopyButton = (textToCopy: string | undefined, fieldName: string) => {
            if (typeof textToCopy !== 'string' || !textToCopy) return null;
            const cellKey = `${rowId}-${fieldName}`;
            const isCopied = copiedCellKey === cellKey;
            return (<button onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(textToCopy, cellKey); }} className="absolute top-1/2 right-1.5 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-all duration-150 ease-in-out" title={isCopied ? "Kopiert!" : "Kopieren"} > {isCopied ? "✓" : "📋"} </button>);
        };
        const idText = `${itemTypePrefix}${item.id}`;
        const nameText = item.name;
        const emailText = item.email;
        const telText = item.tel || "N/A";
        const betreffText = item.betreff;
        const beschreibungText = item.beschreibung;
        const erstelltAmText = formatDate(item.erstelltam);

        const beschwerdeItem = currentView === "beschwerden" && "status" in item ? item as BeschwerdeItem : null;
        const beschwerdeGrundText = beschwerdeItem?.beschwerdegrund || "N/A";
        const vorfallDatumText = beschwerdeItem ? formatDate(beschwerdeItem.datum) : "N/A";
        const vorfallUhrzeitText = beschwerdeItem ? formatTime(beschwerdeItem.uhrzeit) : "N/A";

        const currentStatus = beschwerdeItem?.status;
        let actionButton = null;

        if (currentView === "beschwerden" && beschwerdeItem) {
            switch (currentStatus) {
                case "Offen": actionButton = (<button onClick={() => handleStatusChange(item.id, "In Bearbeitung")} className="text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded hover:bg-[#2a2a32] transition-colors text-xs" title="Bearbeitung starten" > Starten </button>); break;
                case "In Bearbeitung": actionButton = (<div className="flex space-x-1"> <button onClick={() => handleStatusChange(item.id, "Gelöst")} className="text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-[#2a2a32] transition-colors text-xs" title="Als gelöst markieren" > Lösen </button> <button onClick={() => handleStatusChange(item.id, "Abgelehnt")} className="text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-[#2a2a32] transition-colors text-xs" title="Ablehnen" > Ablehnen </button> </div>); break;
                case "Gelöst": case "Abgelehnt": actionButton = (<button onClick={() => handleStatusChange(item.id, "Offen")} className="text-purple-400 hover:text-purple-300 px-2 py-1 rounded hover:bg-[#2a2a32] transition-colors text-xs" title="Wieder öffnen" > Öffnen </button>); break;
                default: actionButton = <span className="text-xs text-neutral-500 italic">(Status unklar)</span>;
            }
        }
        return (
            <tr key={rowId} className="border-t border-[#20202A] hover:bg-[#1C1C22] transition-colors text-neutral-300 text-xs" >
                <td className="px-3 py-2 whitespace-nowrap group relative"> <span>{idText}</span> {renderCopyButton(idText, "id")} </td>
                <td className="px-3 py-2 whitespace-nowrap group relative max-w-[150px] truncate" title={nameText}> <span>{nameText}</span> {renderCopyButton(nameText, "name")} </td>
                <td className="px-3 py-2 whitespace-nowrap group relative max-w-[150px] truncate" title={emailText}> <span>{emailText}</span> {renderCopyButton(emailText, "email")} </td>
                <td className="px-3 py-2 whitespace-nowrap group relative"> <span>{telText}</span> {renderCopyButton(telText, "tel")} </td>
                <td className="px-3 py-2 max-w-[200px] truncate group relative" title={betreffText}> <span className="block truncate">{betreffText}</span>  {renderCopyButton(betreffText, "betreff")} </td>

                {currentView === "beschwerden" && beschwerdeItem && (
                    <>
                        <td className="px-3 py-2 max-w-[180px] truncate group relative" title={beschwerdeGrundText}><span>{beschwerdeGrundText}</span> {renderCopyButton(beschwerdeGrundText, "beschwerdegrund")}</td>
                        <td className="px-3 py-2 max-w-[250px] whitespace-normal break-words group relative" title={beschreibungText}> <span>{beschreibungText}</span> {renderCopyButton(beschreibungText, "beschreibung")} </td>
                        <td className="px-3 py-2 whitespace-nowrap group relative"> <span>{vorfallDatumText}</span> {renderCopyButton(vorfallDatumText, "vorfalldatum")} </td>
                        <td className="px-3 py-2 whitespace-nowrap group relative"> <span>{vorfallUhrzeitText}</span> {renderCopyButton(vorfallUhrzeitText, "vorfalluhrzeit")} </td>
                        <td className="px-3 py-2 whitespace-nowrap group relative max-w-[100px] truncate" title={beschwerdeItem.linie || undefined}> <span>{beschwerdeItem.linie || "N/A"}</span> {renderCopyButton(beschwerdeItem.linie, "linie")} </td>
                        <td className="px-3 py-2 whitespace-nowrap group relative max-w-[180px] truncate" title={beschwerdeItem.haltestelle || undefined}> <span>{beschwerdeItem.haltestelle || "N/A"}</span> {renderCopyButton(beschwerdeItem.haltestelle, "haltestelle")} </td>
                        <td className="px-3 py-2 whitespace-nowrap group relative"> <span className={`font-medium ${getStatusColor(beschwerdeItem.status)}`}> {beschwerdeItem.status || "N/A"}  </span> {renderCopyButton(beschwerdeItem.status, "status")} </td>
                        <td className="px-3 py-2 whitespace-nowrap group relative"> <span>{erstelltAmText}</span> {renderCopyButton(erstelltAmText, "erstelltam")} </td>
                    </>
                )}
                {currentView !== "beschwerden" && (
                    <>
                        <td className="px-3 py-2 max-w-[250px] whitespace-normal break-words group relative" title={beschreibungText}> <span>{beschreibungText}</span> {renderCopyButton(beschreibungText, "beschreibung")} </td>
                        <td className="px-3 py-2 whitespace-nowrap group relative"> <span>{erstelltAmText}</span> {renderCopyButton(erstelltAmText, "erstelltam")} </td>
                    </>
                )}
                <td className="px-3 py-2 whitespace-nowrap"> {actionButton || (currentView !== "beschwerden" && <span className="text-xs text-neutral-500 italic">(Details)</span>)} </td>
            </tr>
        );
    };

    const handleApplyDateFilter = () => { setAppliedStartDate(startDateInput || null); setAppliedEndDate(endDateInput || null); };
    const handleClearDateFilter = () => { setStartDateInput(""); setEndDateInput(""); setAppliedStartDate(null); setAppliedEndDate(null); };

    return (
        <div className="min-h-screen w-full bg-[#0D0D12] text-white p-4 md:p-8 font-sans">
            <motion.div
                className="w-full max-w-none p-2 sm:p-6 md:p-10 mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="mb-6 flex flex-wrap space-x-1 border-b border-[#20202A] pb-px">
                    {(Object.keys(VIEW_TITLES) as ViewType[]).map((viewKey) => (
                        <button
                            key={viewKey}
                            onClick={() => setCurrentView(viewKey)}
                            className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500
                                ${currentView === viewKey
                                    ? 'border-b-2 border-blue-500 text-blue-400'
                                    : 'border-b-2 border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-500'
                                }`}
                        >
                            {VIEW_TITLES[viewKey].replace("übersicht", "")}
                        </button>
                    ))}
                </div>

                <h1 className="text-xl md:text-2xl font-semibold mb-2 text-neutral-200">
                    {VIEW_TITLES[currentView]}
                </h1>

                {/* Status-Filterleiste */}
                {currentView === "beschwerden" && (
                    <div className="my-6 p-1 bg-slate-800/60 backdrop-blur-lg rounded-full shadow-xl flex justify-center items-center relative max-w-2xl mx-auto"> {/* max-w-2xl für mehr Platz */}
                        {(Object.keys(FILTER_LABELS) as StatusFilterMode[]).map((filterKey) => (
                            <button
                                key={filterKey}
                                onClick={() => setActiveStatusFilter(filterKey)}
                                className={`relative flex-1 px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-opacity-75 whitespace-nowrap
                                    ${activeStatusFilter === filterKey
                                        ? 'text-green-50'
                                        : 'text-slate-300 hover:text-slate-100'
                                    }`}
                            >
                                <span className="relative z-10">{FILTER_LABELS[filterKey]}</span>
                                {activeStatusFilter === filterKey && (
                                    <motion.div
                                        layoutId="activeFilterPillNeonGlass"
                                        className="absolute inset-0 bg-green-500/70 rounded-full shadow-[0_0_10px_1px_theme(colors.green.400),_0_0_15px_2px_theme(colors.green.500/0.3)] -z-0" // Neon-Farbe zu Grün, Schatten angepasst
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Datumsbereichsfilter-UI */}
                <div className="my-6 p-1.5 bg-slate-800/60 backdrop-blur-lg rounded-full shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 flex-grow px-2 w-full sm:w-auto">
                        <label htmlFor="startDate" className="text-sm font-medium text-slate-300 whitespace-nowrap">Von:</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDateInput}
                            onChange={(e) => setStartDateInput(e.target.value)}
                            className="flex-grow min-w-0 bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-grow px-2 w-full sm:w-auto">
                        <label htmlFor="endDate" className="text-sm font-medium text-slate-300 whitespace-nowrap">bis:</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDateInput}
                            onChange={(e) => setEndDateInput(e.target.value)}
                            min={startDateInput}
                            className="flex-grow min-w-0 bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                    <div className="flex flex-row justify-center sm:justify-end gap-2 px-1 py-1 sm:py-0 w-full sm:w-auto">
                        <button
                            onClick={handleApplyDateFilter}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 whitespace-nowrap"
                        >
                            Anwenden
                        </button>
                        <button
                            onClick={handleClearDateFilter}
                            className="px-4 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 whitespace-nowrap"
                        >
                            Löschen
                        </button>
                    </div>
                </div>


                {error && (<div className="my-4 p-3 bg-red-700 text-white rounded-md shadow-lg" role="alert"> <p><strong>Fehler:</strong> {error}</p> </div>)}
                {isLoading && !error ? (<div className="text-center py-10 text-neutral-300">Lade Daten...</div>)
                    : !isLoading && filteredData.length === 0 && !error ? (<div className="text-center py-10 text-neutral-500"> Keine Einträge für &quot;{activeStatusFilter !== "alle" ? FILTER_LABELS[activeStatusFilter] : VIEW_TITLES[currentView]}&quot;{(appliedStartDate || appliedEndDate) && " im gewählten Zeitraum"} gefunden. </div>)
                        : !isLoading && filteredData.length > 0 && !error ? (
                            <div className="overflow-x-auto rounded-xl border border-[#20202A] shadow-lg bg-[#121217]">
                                <table className="w-full min-w-[1200px] text-sm">
                                    <thead className="bg-[#18181E] text-neutral-400">
                                        <tr> {renderTableHeaders().map((header: string) => (<th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap sticky top-0 bg-[#18181E] z-10"> {header} </th>))} </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#20202A]"> {filteredData.map((item) => renderTableRow(item))} </tbody>
                                </table>
                            </div>
                        ) : null}
            </motion.div>
        </div>
    );
}
