import { useState, useCallback, useEffect } from 'react';
import { DataItem, ViewType, CardSpecificDataItem } from '../types'; // CardSpecificDataItem hinzugefügt, falls DataItem zu generisch ist
import { API_ENDPOINTS, VIEW_TITLES } from '../constants';

interface UseDataFetchingProps {
    currentView: ViewType;
    token: string | null;
    isAuthenticated: boolean;
    logout: () => void; // Für 401-Fehler
}

export function useDataFetching({ currentView, token, isAuthenticated, logout }: UseDataFetchingProps) {
    const [data, setData] = useState<(DataItem & { action_required?: "relock_ui" })[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
    const [lastDataUpdateTimestamp, setLastDataUpdateTimestamp] = useState<Date | null>(null);

    const fetchDataInternal = useCallback(async (viewToFetch: ViewType, isBackgroundUpdate = false) => {
        if (viewToFetch === "statistik" || viewToFetch === "admin") {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            setData([]);
            setError(null);
            return;
        }

        if (!isAuthenticated || !token) {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            setData([]);
            return;
        }

        const apiEndpointKey = viewToFetch as keyof typeof API_ENDPOINTS;
        const apiEndpoint = API_ENDPOINTS[apiEndpointKey];

        if (!apiEndpoint) {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            const errorMessage = `Kein API Endpunkt definiert für die Ansicht: ${viewToFetch}`;
            setError(errorMessage);
            console.error(errorMessage);
            setData([]);
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
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                setIsDbConnected(false);
                const errorData = await response.json().catch(() => ({ error: `HTTP-Fehler ${response.status}`, details: response.statusText }));
                if (response.status === 401) {
                    setError("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
                    logout();
                    setData([]);
                    return;
                }
                throw new Error(errorData.error || `Fehler beim Laden der Daten für '${VIEW_TITLES[viewToFetch] || viewToFetch}': Status ${response.status}`);
            }
            const fetchedDataFromApi: (DataItem & { action_required?: "relock_ui" })[] = await response.json();
            setData(fetchedDataFromApi);
            setIsDbConnected(true);
            setLastDataUpdateTimestamp(new Date());
            if (!isBackgroundUpdate) setError(null);
        } catch (err) {
            setIsDbConnected(false);
            setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist beim Laden der Daten aufgetreten.");
            setData([]);
        } finally {
            if (!isBackgroundUpdate) setIsLoadingData(false);
        }
    }, [token, isAuthenticated, logout]);

    // NEUE FUNKTION für gezieltes Update oder Hinzufügen eines Items im Cache
    const updateSingleItemInCache = useCallback((updatedItem: CardSpecificDataItem) => { // Typ hier spezifischer machen
        setData(prevData => {
            const itemIndex = prevData.findIndex(item => item.id === updatedItem.id);
            if (itemIndex !== -1) {
                // Item gefunden, aktualisieren
                const newData = [...prevData];
                newData[itemIndex] = { ...newData[itemIndex], ...updatedItem }; // Mergen, um keine Props zu verlieren
                return newData;
            } else {
                // Item nicht gefunden (z.B. ein komplett neues Item, das serverseitig erstellt wurde)
                // Hier müssen Sie entscheiden, ob es hinzugefügt werden soll oder ob ein Full-Refetch besser ist.
                // Für den Fall, dass ein Update ein Item betrifft, das nicht im Cache war (sollte selten sein):
                // return [...prevData, updatedItem]; // Fügt es hinzu (ggf. am Ende)
                console.warn(`updateSingleItemInCache: Item mit ID ${updatedItem.id} nicht im Cache gefunden. Überlege, wie das behandelt werden soll.`);
                // Für mehr Robustheit könnte man hier einen Full-Refetch auslösen oder das Item einfach ignorieren.
                // Da diese Funktion primär für Updates gedacht ist, ist das Mergen oben der Hauptfall.
                return prevData; // Vorerst keine Änderung, wenn Item nicht da war
            }
        });
        setLastDataUpdateTimestamp(new Date());
    }, [setData, setLastDataUpdateTimestamp]); // setData und setLastDataUpdateTimestamp sind stabile Setter

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchDataInternal(currentView, false);
        } else if (!isAuthenticated) {
            setData([]);
            setIsLoadingData(false);
            setError(null);
        }
    }, [currentView, isAuthenticated, token, fetchDataInternal]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isAuthenticated && token && currentView !== "statistik" && currentView !== "admin") {
            intervalId = setInterval(() => {
                fetchDataInternal(currentView, true);
            }, 30000);
        }
        return () => clearInterval(intervalId);
    }, [currentView, isAuthenticated, token, fetchDataInternal]);

    return {
        data,
        isLoadingData,
        error,
        isDbConnected,
        lastDataUpdateTimestamp,
        refetchData: fetchDataInternal,
        updateSingleItemInCache, // NEUE FUNKTION EXPORTIEREN
    };
}