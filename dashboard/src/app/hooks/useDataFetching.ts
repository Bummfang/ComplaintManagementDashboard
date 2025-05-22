// src/app/hooks/useDataFetching.ts
import { useState, useCallback, useEffect, useRef } from 'react'; // useRef importieren
import { DataItem, ViewType, CardSpecificDataItem } from '../types';
import { API_ENDPOINTS, VIEW_TITLES } from '../constants';

export interface PaginatedDataResponse<T> {
    items: T[];
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
    currentPage?: number;
    itemsPerPage?: number;
    filters?: Record<string, string | number | boolean | null | undefined>;
}

export function useDataFetching({
    currentView,
    token,
    isAuthenticated,
    logout,
    currentPage = 1,
    itemsPerPage = 8,
    filters = {},
}: UseDataFetchingProps) {
    const [paginatedData, setPaginatedData] = useState<PaginatedDataResponse<DataItem & { action_required?: "relock_ui" }>>({
        items: [],
        totalItems: 0,
        currentPage: 1,
        totalPages: 0,
        limit: itemsPerPage,
    });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
    const [lastDataUpdateTimestamp, setLastDataUpdateTimestamp] = useState<Date | null>(null);

    const previousViewRef = useRef<ViewType | undefined>(undefined); // Ref für die vorherige Ansicht

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
            setIsLoadingData(true); // Wird hier gesetzt, wenn es ein Vordergrund-Fetch ist
            setError(null);
        }

        const queryParams = new URLSearchParams();
        queryParams.append('page', String(pageToFetch));
        queryParams.append('limit', String(limitToFetch));
        for (const key in currentFilters) {
            if (currentFilters[key] !== undefined && currentFilters[key] !== null && String(currentFilters[key]).trim() !== '') {
                queryParams.append(key, String(currentFilters[key]));
            }
        }
        apiEndpoint += `?${queryParams.toString()}`;
        // console.log(`[useDataFetching] Fetching from: ${apiEndpoint}`);

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
                    setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: limitToFetch });
                    if (!isBackgroundUpdate) setIsLoadingData(false); // Wichtig auch hier
                    return;
                }
                throw new Error(errorData.error || `Fehler beim Laden der Daten für '${VIEW_TITLES[viewToFetch] || viewToFetch}': Status ${response.status}`);
            }
            
            const fetchedApiResponse = await response.json();

            if (typeof fetchedApiResponse.data === 'undefined' || typeof fetchedApiResponse.totalItems === 'undefined') {
                console.error("[useDataFetching] Unerwartete API-Antwortstruktur:", fetchedApiResponse);
                throw new Error("Unerwartete API-Antwortstruktur. 'data' oder 'totalItems' fehlen.");
            }

            setPaginatedData({
                items: fetchedApiResponse.data,
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
            setPaginatedData({ items: [], totalItems: 0, currentPage: pageToFetch, totalPages: 0, limit: limitToFetch });
        } finally {
            if (!isBackgroundUpdate) setIsLoadingData(false);
        }
    }, [token, isAuthenticated, logout]); // Abhängigkeiten für fetchDataInternal

    // Effekt, der bei Änderungen der View, Authentifizierung, Seite oder Filter neu lädt
    useEffect(() => {
        // Wenn sich die Ansicht geändert hat (und es nicht der erste Render ist für previousViewRef)
        // und die vorherige Ansicht eine Datenansicht war: Daten leeren und Ladezustand setzen.
        if (previousViewRef.current && previousViewRef.current !== currentView &&
            !(previousViewRef.current === 'admin' || previousViewRef.current === 'statistik') && // Nur wenn alte Ansicht eine Datenansicht war
            !(currentView === 'admin' || currentView === 'statistik') // Nur wenn neue Ansicht auch eine Datenansicht ist
        ) {
            console.log(`[useDataFetching] View hat gewechselt von ${previousViewRef.current} zu ${currentView}. Leere alte Daten.`);
            setPaginatedData(prev => ({ 
                ...prev, // Behalte z.B. itemsPerPage vom vorherigen State
                items: [], 
                totalItems: 0, 
                // currentPage wird durch ContaintTable bereits auf 1 gesetzt, wenn der View wechselt, 
                // was diesen useEffect dann mit currentPage=1 erneut auslöst.
                totalPages: 0,
            }));
            setIsLoadingData(true); // Explizit für den neuen View Ladezustand setzen
            setError(null);
        }
        previousViewRef.current = currentView; // Aktuelle Ansicht für den nächsten Vergleich speichern

        // Datenabruflogik
        if (isAuthenticated && token) {
            // fetchDataInternal kümmert sich um 'admin'/'statistik' und setzt isLoadingData korrekt für Vordergrund-Fetches
            fetchDataInternal(currentView, currentPage, itemsPerPage, filters, false);
        } else if (!isAuthenticated) {
            // Wenn nicht authentifiziert, alles zurücksetzen
            setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: itemsPerPage });
            setIsLoadingData(false);
            setError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentView, isAuthenticated, token, currentPage, itemsPerPage, JSON.stringify(filters), fetchDataInternal]); // fetchDataInternal als Abhängigkeit

    // Intervall-Refresh (dein bestehender Code, stelle sicher, dass er fetchDataInternal mit isBackgroundUpdate = true aufruft)
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (isAuthenticated && token && currentView !== "statistik" && currentView !== "admin") {
            intervalId = setInterval(() => {
                // console.log(`[useDataFetching] Background refresh for view: ${currentView}, page: ${currentPage}, filters:`, filters);
                fetchDataInternal(currentView, currentPage, itemsPerPage, filters, true);
            }, 30000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [currentView, isAuthenticated, token, currentPage, itemsPerPage, filters, fetchDataInternal]);

    const updateSingleItemInCache = useCallback((updatedItem: CardSpecificDataItem) => {
        setPaginatedData(prevPaginatedData => {
            const itemIndex = prevPaginatedData.items.findIndex(item => item.id === updatedItem.id);
            if (itemIndex !== -1) {
                const newItems = [...prevPaginatedData.items];
                newItems[itemIndex] = { ...newItems[itemIndex], ...updatedItem };
                return { ...prevPaginatedData, items: newItems };
            }
            console.warn(`[useDataFetching] updateSingleItemInCache: Item mit ID ${updatedItem.id} nicht auf der aktuellen Seite im Cache gefunden.`);
            return prevPaginatedData;
        });
        setLastDataUpdateTimestamp(new Date());
    }, []); // setPaginatedData und setLastDataUpdateTimestamp sind stabil

    return {
        items: paginatedData.items,
        totalItems: paginatedData.totalItems,
        currentPage: paginatedData.currentPage,
        totalPages: paginatedData.totalPages,
        limit: paginatedData.limit,
        isLoadingData,
        error,
        isDbConnected,
        lastDataUpdateTimestamp,
        refetchData: (view: ViewType, page: number, limitNum: number, newFilters: Record<string, any>) => 
            fetchDataInternal(view, page, limitNum, newFilters, false),
        updateSingleItemInCache,
    };
}