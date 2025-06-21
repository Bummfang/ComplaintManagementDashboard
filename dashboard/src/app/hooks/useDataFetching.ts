// src/app/hooks/useDataFetching.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { DataItem, ViewType, CardSpecificDataItem, ApiErrorResponse } from '../types';
import { API_ENDPOINTS, VIEW_TITLES } from '../constants';

// Typ-Alias für die Filterobjekte
type FetchFilters = Record<string, string | number | boolean | null | undefined>;

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
    filters?: FetchFilters; // KORREKT: FetchFilters hier verwenden
}

export function useDataFetching({
    currentView,
    token,
    isAuthenticated,
    logout,
    currentPage = 1,
    itemsPerPage = 8, // Dein neuer Standardwert
    filters = {},      // Typ wird von UseDataFetchingProps.filters abgeleitet
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
    const previousViewRef = useRef<ViewType | undefined>(undefined);

    const fetchDataInternal = useCallback(async (
        viewToFetch: ViewType,
        pageToFetch: number,
        limitToFetch: number,
        currentFilters: FetchFilters, 
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

        const queryParams = new URLSearchParams();
        queryParams.append('page', String(pageToFetch));
        queryParams.append('limit', String(limitToFetch));
        for (const key in currentFilters) { // currentFilters ist jetzt FetchFilters
            if (currentFilters[key] !== undefined && currentFilters[key] !== null && String(currentFilters[key]).trim() !== '') {
                queryParams.append(key, String(currentFilters[key]));
            }
        }
        if (queryParams.toString()) { 
            apiEndpoint += `?${queryParams.toString()}`;
        }
        
        try {
            const response = await fetch(apiEndpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const fetchedApiResponse = await response.json();

            if (!response.ok) {
                setIsDbConnected(false);
                const errorData = fetchedApiResponse || ({ error: `HTTP-Fehler ${response.status}`, details: response.statusText });
                if (response.status === 401) {
                    setError("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
                    logout();
                    setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: limitToFetch });
                    if (!isBackgroundUpdate) setIsLoadingData(false);
                    return;
                }
                throw new Error((errorData as ApiErrorResponse).error || (errorData as ApiErrorResponse).details || `Fehler beim Laden der Daten für '${VIEW_TITLES[viewToFetch] || viewToFetch}': Status ${response.status}`);
            }
            
            if (typeof fetchedApiResponse.data === 'undefined' || 
                typeof fetchedApiResponse.totalItems === 'undefined' ||
                typeof fetchedApiResponse.currentPage === 'undefined' ||
                typeof fetchedApiResponse.totalPages === 'undefined' ||
                typeof fetchedApiResponse.limit === 'undefined'
            ) {
                console.error("[useDataFetching] Unerwartete API-Antwortstruktur:", fetchedApiResponse);
                throw new Error("Unerwartete API-Antwortstruktur von Backend.");
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
    }, [token, isAuthenticated, logout]);

    useEffect(() => {
        if (previousViewRef.current && previousViewRef.current !== currentView &&
            !(previousViewRef.current === 'admin' || previousViewRef.current === 'statistik') &&
            !(currentView === 'admin' || currentView === 'statistik')
        ) {
            setPaginatedData(prev => ({ 
                ...prev, items: [], totalItems: 0, totalPages: 0, currentPage: 1, limit: itemsPerPage 
            }));
            setIsLoadingData(true); 
            setError(null);
        }
        previousViewRef.current = currentView;

        if (isAuthenticated && token) {
            fetchDataInternal(currentView, currentPage, itemsPerPage, filters, false);
        } else if (!isAuthenticated) {
            setPaginatedData({ items: [], totalItems: 0, currentPage: 1, totalPages: 0, limit: itemsPerPage });
            setIsLoadingData(false);
            setError(null);
        }



        
    }, [currentView, isAuthenticated, token, currentPage, itemsPerPage, JSON.stringify(filters), fetchDataInternal]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (isAuthenticated && token && currentView !== "statistik" && currentView !== "admin") {
            intervalId = setInterval(() => {
                fetchDataInternal(currentView, currentPage, itemsPerPage, filters, true);
            }, 60000);
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
            return prevPaginatedData;
        });
        setLastDataUpdateTimestamp(new Date());
    }, []);

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
        refetchData: (view: ViewType, page: number, limitNum: number, newFilters: FetchFilters) => // KORREKT: FetchFilters hier verwenden (für Zeile 218)
            fetchDataInternal(view, page, limitNum, newFilters, false),
        updateSingleItemInCache,
    };
}