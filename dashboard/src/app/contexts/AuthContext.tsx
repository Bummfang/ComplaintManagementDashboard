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

const AUTH_TOKEN_KEY = 'authToken'; // Schlüssel für das Auth-Token im localStorage
const SCREEN_LOCKED_KEY = 'screenLocked'; // Schlüssel für den Sperrstatus im localStorage

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    
    // Initialen Sperrzustand aus localStorage lesen, aber nur wenn auch ein Token da war/ist.
    const [isScreenLocked, setIsScreenLockedState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
            const storedLockState = localStorage.getItem(SCREEN_LOCKED_KEY);
            // Der Bildschirm ist nur dann initial gesperrt, wenn ein Token existiert
            // UND der Sperrstatus explizit auf 'true' gesetzt war.
            return !!storedToken && storedLockState === 'true';
        }
        return false;
    });

    const performLogout = useCallback(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(SCREEN_LOCKED_KEY); // Sperrstatus beim Logout entfernen
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        setIsScreenLockedState(false); // Bildschirm beim Logout entsperren
        setIsLoadingAuth(false); // Auth-Prozess ist hier beendet
        // console.log("AuthContext: User logged out, token & lock state removed.");
    }, []);

    const verifyTokenAndInitializeAuth = useCallback(async () => {
        // console.log("AuthContext: Initializing auth...");
        setIsLoadingAuth(true); // Am Anfang des Initialisierungsprozesses
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
        const storedLockState = typeof window !== 'undefined' ? localStorage.getItem(SCREEN_LOCKED_KEY) : null;

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
                        // Wichtig: Sperrstatus basierend auf localStorage setzen, NACHDEM Token als gültig bestätigt wurde.
                        setIsScreenLockedState(storedLockState === 'true'); 
                        // console.log("AuthContext: Token verified. User authenticated. Screen initially locked:", storedLockState === 'true');
                    } else {
                        // console.log("AuthContext: Token verification response indicates invalid token or no user data.");
                        performLogout(); 
                    }
                } else {
                    // console.log(`AuthContext: Token verification request failed with status: ${response.status}.`);
                    performLogout(); 
                }
            } catch (error) {
                // console.error("AuthContext: Error during token verification request:", error);
                performLogout(); 
            }
        } else {
            // Kein Token gefunden, daher nicht eingeloggt und Bildschirm nicht gesperrt.
            setIsScreenLockedState(false); 
            // console.log("AuthContext: No token found. User not authenticated.");
        }
        setIsLoadingAuth(false); // Auth-Prüfung in allen Fällen hier abschließen
    }, [performLogout]);

    useEffect(() => {
        verifyTokenAndInitializeAuth();
    }, [verifyTokenAndInitializeAuth]);

    const login = (responseDataFromLoginApi: { userId: number; username: string; name?: string; nachname?: string; isAdmin: boolean; token: string }) => {
        localStorage.setItem(AUTH_TOKEN_KEY, responseDataFromLoginApi.token);
        // Nach einem frischen Login ist der Bildschirm nicht gesperrt.
        localStorage.removeItem(SCREEN_LOCKED_KEY); 
        
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
        setIsScreenLockedState(false); // Explizit auf false setzen
        setIsLoadingAuth(false);
        // console.log("AuthContext: User logged in. Screen unlocked.");
    };

    const setIsScreenLocked = useCallback((locked: boolean) => {
        // console.log("[AuthContext] setIsScreenLocked CALLED with:", locked);
        setIsScreenLockedState(locked);
        if (typeof window !== 'undefined') {
            if (locked) {
                localStorage.setItem(SCREEN_LOCKED_KEY, 'true');
                // console.log("[AuthContext] Screen locked, localStorage set.");
            } else {
                localStorage.removeItem(SCREEN_LOCKED_KEY);
                // console.log("[AuthContext] Screen unlocked, localStorage cleared.");
            }
        }
    }, []); // Leeres Dependency Array, da setIsScreenLockedState stabil ist

    // useEffect(() => {
    //     // console.log("[AuthContext] isScreenLocked state CHANGED TO:", isScreenLocked);
    // }, [isScreenLocked]); // Dieser Log kann zum Debuggen nützlich sein

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