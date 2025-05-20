// src/app/hooks/useDataFetching.ts
import { useState, useCallback, useEffect } from 'react';
import { DataItem, ViewType } from '../types'; // Pfad anpassen (z.B. '@/app/types')
import { API_ENDPOINTS, VIEW_TITLES } from '../constants'; // Pfad anpassen (z.B. '@/app/constants')

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
            setData([]); // Statistik/Admin Ansichten haben ihre eigene Datenbeschaffung
            setError(null);
            return;
        }

        if (!isAuthenticated || !token) {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            setData([]); // Keine Daten, wenn nicht authentifiziert
            // console.warn("useDataFetching: fetchDataInternal called without token or auth.");
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
                    logout(); // Logout-Funktion vom AuthContext aufrufen
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
            setData([]); // Im Fehlerfall Daten leeren
        } finally {
            if (!isBackgroundUpdate) setIsLoadingData(false);
        }
    }, [token, isAuthenticated, logout]); // API_ENDPOINTS, VIEW_TITLES sind Konstanten

    // Effekt für initiales Laden und bei Änderung der Ansicht oder Authentifizierung
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchDataInternal(currentView, false);
        } else if (!isAuthenticated) {
            setData([]);
            setIsLoadingData(false);
            setError(null); // Ggf. Fehler zurücksetzen, wenn ausgeloggt
        }
    }, [currentView, isAuthenticated, token, fetchDataInternal]);

    // Effekt für Polling
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isAuthenticated && token && currentView !== "statistik" && currentView !== "admin") {
            intervalId = setInterval(() => {
                // console.log(`Polling data for ${currentView} at ${new Date().toLocaleTimeString()}`);
                fetchDataInternal(currentView, true);
            }, 30000); // 30 Sekunden Polling-Intervall
        }
        return () => clearInterval(intervalId);
    }, [currentView, isAuthenticated, token, fetchDataInternal]);

    return {
        data,
        isLoadingData,
        error,
        isDbConnected,
        lastDataUpdateTimestamp,
        refetchData: fetchDataInternal // Exponiere die Fetch-Funktion für manuelles Neuladen
    };
}