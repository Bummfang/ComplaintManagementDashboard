// src/app/hooks/useDataFetching.ts
import { useState, useCallback, useEffect } from 'react';
import { DataItem, ViewType, CardSpecificDataItem } from '../types'; // CardSpecificDataItem ggf. anpassen, wenn API-Antwort immer voll ist
import { API_ENDPOINTS, VIEW_TITLES } from '../constants';

// Neue Struktur für den State, den der Hook verwaltet und zurückgibt
export interface PaginatedDataResponse<T> {
    items: T[]; // Die eigentlichen Daten für die aktuelle Seite
    totalItems: number;
    currentPage: number;
    totalPages: number;
    limit: number;
}

interface UseDataFetchingProps {
    currentView: ViewType;
    token: string | null;
    isAuthenticated: boolean;
    logout: () => void;
    // NEU: Parameter für Paginierung und Filter
    currentPage?: number;
    itemsPerPage?: number;
    filters?: Record<string, string | number | boolean | null | undefined>; // Ein Objekt für diverse Filter
}

// Der Typ für das, was der Hook zurückgibt, wird angepasst
export function useDataFetching({
    currentView,
    token,
    isAuthenticated,
    logout,
    currentPage = 1, // Standardmäßig Seite 1
    itemsPerPage = 20, // Standardmäßig 20 Items, passend zum Backend
    filters = {},     // Leeres Filterobjekt als Standard
}: UseDataFetchingProps) {
    // State für die paginierten Daten
    const [paginatedData, setPaginatedData] = useState<PaginatedDataResponse<DataItem & { action_required?: "relock_ui" }>>({
        items: [],
        totalItems: 0,
        currentPage: 1,
        totalPages: 0,
        limit: itemsPerPage,
    });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDbConnected, setIsDbConnected] = useState<boolean>(true); // Behalten wir bei
    const [lastDataUpdateTimestamp, setLastDataUpdateTimestamp] = useState<Date | null>(null);

    const fetchDataInternal = useCallback(async (
        viewToFetch: ViewType,
        pageToFetch: number,
        limitToFetch: number,
        currentFilters: Record<string, any>,
        isBackgroundUpdate = false
    ) => {
        if (viewToFetch === "statistik" || viewToFetch === "admin") {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: limitToFetch });
            setError(null);
            return;
        }

        if (!isAuthenticated || !token) {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: limitToFetch });
            return;
        }

        const apiEndpointKey = viewToFetch as keyof typeof API_ENDPOINTS;
        let apiEndpoint = API_ENDPOINTS[apiEndpointKey];

        if (!apiEndpoint) {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            const errorMessage = `Kein API Endpunkt definiert für die Ansicht: ${viewToFetch}`;
            setError(errorMessage);
            console.error(errorMessage);
            setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: limitToFetch });
            return;
        }

        if (!isBackgroundUpdate) {
            setIsLoadingData(true);
            setError(null);
        }

        // Query-Parameter für Paginierung und Filter erstellen
        const queryParams = new URLSearchParams();
        queryParams.append('page', String(pageToFetch));
        queryParams.append('limit', String(limitToFetch));

        for (const key in currentFilters) {
            if (currentFilters[key] !== undefined && currentFilters[key] !== null && String(currentFilters[key]).trim() !== '') {
                queryParams.append(key, String(currentFilters[key]));
            }
        }
        apiEndpoint += `?${queryParams.toString()}`;
        console.log(`[useDataFetching] Fetching from: ${apiEndpoint}`);


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
                    logout(); // Wichtig, um den User auszuloggen
                    setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: limitToFetch });
                    return;
                }
                throw new Error(errorData.error || `Fehler beim Laden der Daten für '${VIEW_TITLES[viewToFetch] || viewToFetch}': Status ${response.status}`);
            }
            
            // Die API liefert jetzt ein Objekt mit { data, totalItems, currentPage, totalPages, limit }
            const fetchedApiResponse = await response.json();

            if (typeof fetchedApiResponse.data === 'undefined' || typeof fetchedApiResponse.totalItems === 'undefined') {
                console.error("[useDataFetching] Unerwartete API-Antwortstruktur:", fetchedApiResponse);
                throw new Error("Unerwartete API-Antwortstruktur. 'data' oder 'totalItems' fehlen.");
            }

            setPaginatedData({
                items: fetchedApiResponse.data, // Das Array der Items
                totalItems: fetchedApiResponse.totalItems,
                currentPage: fetchedApiResponse.currentPage,
                totalPages: fetchedApiResponse.totalPages,
                limit: fetchedApiResponse.limit,
            });
            setIsDbConnected(true);
            setLastDataUpdateTimestamp(new Date());
            if (!isBackgroundUpdate) setError(null);

        } catch (err) {
            setIsDbConnected(false);
            const errorMessage = err instanceof Error ? err.message : "Ein unbekannter Fehler ist beim Laden der Daten aufgetreten.";
            setError(errorMessage);
            console.error(`[useDataFetching] Error fetching data for ${viewToFetch}:`, err);
            // Im Fehlerfall den Paginierungsstatus beibehalten oder zurücksetzen?
            // Hier setzen wir es zurück, um inkonsistente Zustände zu vermeiden.
            setPaginatedData({ items: [], totalItems: 0, currentPage: pageToFetch, totalPages: 0, limit: limitToFetch });
        } finally {
            if (!isBackgroundUpdate) setIsLoadingData(false);
        }
    }, [token, isAuthenticated, logout]);

    // Funktion, um ein einzelnes Item im Cache zu aktualisieren
    // Diese Funktion muss angepasst werden, da 'items' jetzt in paginatedData liegt
    const updateSingleItemInCache = useCallback((updatedItem: CardSpecificDataItem) => {
        setPaginatedData(prevPaginatedData => {
            const itemIndex = prevPaginatedData.items.findIndex(item => item.id === updatedItem.id);
            if (itemIndex !== -1) {
                const newItems = [...prevPaginatedData.items];
                newItems[itemIndex] = { ...newItems[itemIndex], ...updatedItem };
                return { ...prevPaginatedData, items: newItems };
            }
            // Wenn das Item nicht auf der aktuellen Seite ist, müssen wir entscheiden, was passiert.
            // Fürs Erste: Nur Items auf der aktuellen Seite aktualisieren. Ein Refetch der Seite könnte nötig sein,
            // wenn sich z.B. durch ein Statusupdate die Filterzugehörigkeit ändert.
            console.warn(`[useDataFetching] updateSingleItemInCache: Item mit ID ${updatedItem.id} nicht auf der aktuellen Seite im Cache gefunden.`);
            return prevPaginatedData;
        });
        setLastDataUpdateTimestamp(new Date());
    }, [setPaginatedData, setLastDataUpdateTimestamp]);


    // Effekt, der bei Änderungen der View, Authentifizierung, Seite oder Filter neu lädt
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchDataInternal(currentView, currentPage, itemsPerPage, filters, false);
        } else if (!isAuthenticated) {
            setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: itemsPerPage });
            setIsLoadingData(false);
            setError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentView, isAuthenticated, token, currentPage, itemsPerPage, JSON.stringify(filters), fetchDataInternal]); // JSON.stringify(filters) für tiefen Vergleich von Filterobjekten


    // Intervall-Refresh: Muss auch die aktuellen Filter und Seite berücksichtigen
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isAuthenticated && token && currentView !== "statistik" && currentView !== "admin") {
            intervalId = setInterval(() => {
                console.log(`[useDataFetching] Background refresh for view: ${currentView}, page: ${currentPage}, filters:`, filters);
                fetchDataInternal(currentView, currentPage, itemsPerPage, filters, true);
            }, 30000); // Alle 30 Sekunden
        }
        return () => clearInterval(intervalId);
    }, [currentView, isAuthenticated, token, currentPage, itemsPerPage, filters, fetchDataInternal]);

    return {
        // Statt 'data' geben wir jetzt 'paginatedData' oder dessen Teile zurück
        items: paginatedData.items, // Das Array der Daten für die aktuelle Seite
        totalItems: paginatedData.totalItems,
        currentPage: paginatedData.currentPage,
        totalPages: paginatedData.totalPages,
        limit: paginatedData.limit,
        isLoadingData,
        error,
        isDbConnected,
        lastDataUpdateTimestamp,
        refetchData: (view: ViewType, page: number, limit: number, newFilters: Record<string, any>) => 
            fetchDataInternal(view, page, limit, newFilters, false), // Eine spezifischere Refetch-Funktion
        updateSingleItemInCache,
    };
}