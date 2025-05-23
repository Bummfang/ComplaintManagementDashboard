// src/app/contexts/AuthContext.tsx
"use client"; 

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface User {
    userId: number;
    username: string;
    isAdmin: boolean;
    name?: string;
    nachname?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    isLoadingAuth: boolean;
    login: (responseDataFromLoginApi: { userId: number; username: string; name?: string; nachname?: string; isAdmin: boolean; token: string }) => void;
    logout: () => void;
    isScreenLocked: boolean;
    setIsScreenLocked: (locked: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'authToken';
const SCREEN_LOCKED_KEY = 'screenLocked';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    // Initialisiere isScreenLocked IMMER mit false für SSR-Konsistenz
    const [isScreenLocked, setIsScreenLockedState] = useState<boolean>(false); 

    const performLogout = useCallback(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(SCREEN_LOCKED_KEY);
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        setIsScreenLockedState(false);
        setIsLoadingAuth(false);
        // console.log("AuthContext: User logged out, token & lock state removed.");
    }, []);

    const verifyTokenAndInitializeAuth = useCallback(async () => {
        // console.log("AuthContext: Initializing auth...");
        setIsLoadingAuth(true);
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
        
        if (storedToken) {
            try {
                const response = await fetch('/api/verify-token', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${storedToken}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.isValid && data.user) {
                        setUser(data.user);
                        setToken(storedToken);
                        setIsAuthenticated(true);
                        // WICHTIG: Initiales Setzen von isScreenLockedState basierend auf localStorage
                        // erfolgt jetzt in einem separaten useEffect, um Hydrierungsfehler zu vermeiden.
                        // console.log("AuthContext: Token verified. User authenticated.");
                    } else {
                        performLogout(); 
                    }
                } else {
                    performLogout(); 
                }
            } catch (error) {
                console.error("AuthContext: Error during token verification request:", error);
                performLogout(); 
            }
        }
        // else: Kein Token gefunden, Auth-Status bleibt initial false (oder wird durch performLogout gesetzt)
        setIsLoadingAuth(false); 
    }, [performLogout]);

    useEffect(() => {
        verifyTokenAndInitializeAuth();
    }, [verifyTokenAndInitializeAuth]);

    // NEUER useEffect: Setzt den Sperrstatus clientseitig nach der initialen Auth-Prüfung
    useEffect(() => {
        // Dieser Effekt läuft nur auf dem Client und erst, wenn isLoadingAuth abgeschlossen ist.
        if (!isLoadingAuth && isAuthenticated && typeof window !== 'undefined') { 
            const storedLockState = localStorage.getItem(SCREEN_LOCKED_KEY);
            if (storedLockState === 'true') {
                // console.log("[AuthContext] Client-side effect: Setting screen to locked based on localStorage.");
                setIsScreenLockedState(true);
            } else {
                // Sicherstellen, dass es false ist, falls localStorage nichts enthält oder ungültig ist
                 setIsScreenLockedState(false);
            }
        } else if (!isLoadingAuth && !isAuthenticated && typeof window !== 'undefined') {
            // Wenn nicht authentifiziert, sicherstellen, dass der Sperrstatus entfernt und im State false ist
            localStorage.removeItem(SCREEN_LOCKED_KEY);
            setIsScreenLockedState(false);
        }
    }, [isLoadingAuth, isAuthenticated]); // Abhängig von isLoadingAuth und isAuthenticated

    const login = (responseDataFromLoginApi: { userId: number; username: string; name?: string; nachname?: string; isAdmin: boolean; token: string }) => {
        localStorage.setItem(AUTH_TOKEN_KEY, responseDataFromLoginApi.token);
        localStorage.removeItem(SCREEN_LOCKED_KEY); // Nach Login ist Bildschirm nicht gesperrt
        
        const contextUser: User = {
            userId: responseDataFromLoginApi.userId,
            username: responseDataFromLoginApi.username,
            isAdmin: responseDataFromLoginApi.isAdmin,
            name: responseDataFromLoginApi.name,
            nachname: responseDataFromLoginApi.nachname,
        };
        setUser(contextUser);
        setToken(responseDataFromLoginApi.token);
        setIsAuthenticated(true);
        setIsScreenLockedState(false); 
        setIsLoadingAuth(false);
        // console.log("AuthContext: User logged in. Screen unlocked.");
    };

    const setIsScreenLocked = useCallback((locked: boolean) => {
        // console.log("[AuthContext] setIsScreenLocked CALLED with:", locked);
        setIsScreenLockedState(locked);
        if (typeof window !== 'undefined') {
            if (locked) {
                localStorage.setItem(SCREEN_LOCKED_KEY, 'true');
            } else {
                localStorage.removeItem(SCREEN_LOCKED_KEY);
            }
        }
    }, []);

    // useEffect(() => {
    //     // console.log("[AuthContext] isScreenLocked state CHANGED TO:", isScreenLocked);
    // }, [isScreenLocked]);

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            token, 
            isLoadingAuth, 
            login, 
            logout: performLogout, 
            isScreenLocked, 
            setIsScreenLocked 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider. Make sure to wrap your component tree with <AuthProvider>.');
    }
    return context;
};