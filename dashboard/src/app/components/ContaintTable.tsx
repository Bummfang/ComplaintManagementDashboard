// app/page.tsx

"use client";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

// --- Deine Interfaces und Konstanten bleiben gleich ---
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
    // zugewiesenAn wurde entfernt
}

interface LobItem extends BaseItem {}
interface AnregungItem extends BaseItem {}

type DataItem = BeschwerdeItem | LobItem | AnregungItem;
type ViewType = "beschwerden" | "lob" | "anregungen";

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

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch (e) {
        return dateString;
    }
};

const getStatusColor = (status?: BeschwerdeItem["status"]) => {
    switch (status) {
        case "Offen": return "text-green-400";
        case "In Bearbeitung": return "text-yellow-400";
        case "Gelöst": return "text-blue-400";
        case "Abgelehnt": return "text-red-400";
        default: return "text-neutral-400";
    }
};

export default function Home() {
    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [data, setData] = useState<DataItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
        if (!isBackgroundUpdate) {
            setIsLoading(true);
        }
        console.log(`[fetchData] Lade Daten für: ${view}, Hintergrund: ${isBackgroundUpdate}`);
        try {
            const response = await fetch(API_ENDPOINTS[view]);
            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorDetails = `Status: ${response.status} ${response.statusText}`;
                if (contentType && contentType.includes("application/json")) {
                    try {
                        const errorData = await response.json();
                        errorDetails = errorData.details || errorData.error || JSON.stringify(errorData);
                    } catch (jsonError) {
                        errorDetails += ` (Konnte Fehler-JSON nicht parsen: ${(jsonError as Error).message})`;
                    }
                } else {
                    try {
                        const errorText = await response.text();
                        errorDetails += ` (Serverantwort: ${errorText.substring(0, 100)}...)`;
                    } catch (textError) {
                         errorDetails += ` (Konnte Fehlertext nicht lesen: ${(textError as Error).message})`;
                    }
                }
                throw new Error(`Fehler beim Abrufen der Daten: ${errorDetails}`);
            }
            let fetchedData: DataItem[] = await response.json();

            if (view === "beschwerden") {
                fetchedData = fetchedData.map((item, index) => ({
                    ...item,
                    status: (["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"] as BeschwerdeItem["status"][])[index % 4],
                }));
            }
            setData(fetchedData);
            setError(null);
        } catch (err) {
            console.error(`Fehler beim Laden von ${view}:`, err);
            setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.");
        } finally {
            if (!isBackgroundUpdate) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchData(currentView);
    }, [currentView, fetchData]);

    useEffect(() => {
        console.log(`[Intervall-Effekt] Setze Intervall für Ansicht: ${currentView}`);
        const intervalId = setInterval(() => {
            console.log(`[Intervall] Aktualisiere Daten für Ansicht: ${currentView}`);
            fetchData(currentView, true);
        }, 50000); // 50 Sekunden Intervall

        return () => {
            clearInterval(intervalId);
            console.log(`[Intervall-Effekt] Intervall für Ansicht ${currentView} gestoppt.`);
        };
    }, [currentView, fetchData]);

    const renderTableHeaders = () => {
        const baseHeaders = ["ID", "Name", "Betreff", "Erstellt am"];
        if (currentView === "beschwerden") {
            // Neue Reihenfolge: "Beschreibung", dann Details, dann "Status" ans Ende (vor "Aktionen")
            return [...baseHeaders, "Beschreibung", "Vorfall Datum", "Linie", "Haltestelle", "Status", "Aktionen"];
        }
        // Für Lob & Anregungen: Beschreibung (Auszug) kann bei Bedarf auch angepasst werden
        return [...baseHeaders, "Beschreibung (Auszug)", "Aktionen"];
    };

    const renderTableRow = (item: DataItem,) => {
        const itemTypePrefix = currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-";
        return (
            <tr
                key={`${currentView}-${item.id}`}
                className="border-t border-[#20202A] hover:bg-[#1C1C22] transition-colors"
            >
                <td className="px-4 py-3 whitespace-nowrap">{itemTypePrefix}{item.id}</td>
                <td className="px-4 py-3 whitespace-nowrap">{item.name}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={item.betreff}>{item.betreff}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.erstelltam)}</td>

                {currentView === "beschwerden" && "beschwerdegrund" in item && (
                    <>
                        {/* BESCHREIBUNG: `truncate` und `whitespace-nowrap` entfernt für Umbruch. `max-w-..` steuert die maximale Breite. */}
                        <td className="px-4 py-3 max-w-md whitespace-normal" title={item.beschreibung}>
                            {item.beschreibung}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate((item as BeschwerdeItem).datum)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{(item as BeschwerdeItem).linie || "N/A"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{(item as BeschwerdeItem).haltestelle || "N/A"}</td>
                        {/* STATUS: An neuer Position */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`font-medium ${getStatusColor((item as BeschwerdeItem).status)}`}>
                                {(item as BeschwerdeItem).status || "N/A"}
                            </span>
                        </td>
                    </>
                )}

                {currentView !== "beschwerden" && (
                    // Für Lob/Anregungen: Wenn hier auch der volle Text mit Umbruch angezeigt werden soll, `truncate` entfernen und `whitespace-normal` hinzufügen.
                    <td className="px-4 py-3 max-w-md truncate" title={item.beschreibung}>
                        {item.beschreibung}
                    </td>
                )}

                <td className="px-4 py-3 whitespace-nowrap">
                    <button
                        onClick={() => alert(`Details für ${itemTypePrefix}${item.id}\nBetreff: ${item.betreff}`)}
                        className="text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-[#2a2a32] transition-colors"
                    >
                        Details
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div className="min-h-screen w-full bg-[#0D0D12] text-white p-4 md:p-8 font-sans">
            <motion.div
                // Erwäge max-w-full oder eine noch größere max-w- Variante, wenn horizontales Scrollen komplett vermieden werden soll
                // und das Layout es zulässt.
                className="w-full max-w-7xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* Tab-Navigation und Titel bleiben gleich */}
                <div className="mb-6 flex space-x-1 border-b border-[#20202A] pb-px">
                    {(Object.keys(VIEW_TITLES) as ViewType[]).map((viewKey) => (
                        <button
                            key={viewKey}
                            onClick={() => setCurrentView(viewKey)}
                            className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-all duration-150 ease-in-out
                                ${currentView === viewKey
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-500'
                                }`}
                        >
                            {VIEW_TITLES[viewKey].replace("übersicht", "")}
                        </button>
                    ))}
                </div>
                <h1 className="text-xl md:text-2xl font-semibold mb-6 text-neutral-200">
                    {VIEW_TITLES[currentView]}
                </h1>

                {/* Lade-, Fehler- und Tabellenlogik */}
                {isLoading ? (
                    <div className="text-center py-10 text-neutral-300">Lade Daten...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-400">
                        <p>Fehler beim Laden der Daten:</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#20202A] shadow-lg">
                        <table className="w-full min-w-[1000px] text-sm bg-[#121217]">
                            <thead className="bg-[#18181E] text-neutral-400">
                                <tr>
                                    {renderTableHeaders().map(header => (
                                        <th key={header} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={renderTableHeaders().length} className="text-center py-10 text-neutral-500">
                                            Keine Einträge für "{VIEW_TITLES[currentView]}" gefunden.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item,) => renderTableRow(item,))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </div>
    );
}