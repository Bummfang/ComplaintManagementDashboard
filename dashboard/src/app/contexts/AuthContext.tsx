// src/app/contexts/AuthContext.tsx
"use client"; // Diese Direktive ist wichtig für Client-Komponenten in Next.js App Router

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// useRouter kann nützlich sein für Redirects, z.B. nach dem Logout.
// import { useRouter } from 'next/navigation';

/**
 * Definiert die Struktur der Benutzerdaten, die im Context gespeichert werden.
 * Diese Struktur sollte den Daten entsprechen, die von deinen API-Endpunkten
 * /api/login (in der Antwort) und /api/verify-token (im 'user'-Objekt der Antwort) zurückgegeben werden.
 */




export interface User {
  userId: number;
  username: string;
  isAdmin: boolean;
  name?: string;      // Optional, falls vom Login-Endpunkt geliefert
  nachname?: string;  // Optional, falls vom Login-Endpunkt geliefert
}

/**
 * Definiert den Typ für den Wert, den der AuthContext bereitstellt.
 */





interface AuthContextType {
  isAuthenticated: boolean;    // Ist der Benutzer aktuell authentifiziert?
  user: User | null;           // Die Daten des angemeldeten Benutzers oder null.
  token: string | null;        // Das JWT oder null.
  isLoadingAuth: boolean;      // Zeigt an, ob der initiale Auth-Status noch geladen/geprüft wird.
  login: (responseDataFromLoginApi: { userId: number; username: string; name?: string; nachname?: string; isAdmin: boolean; token: string }) => void; // Funktion zum Anmelden.
  logout: () => void;          // Funktion zum Abmelden.
}




const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); 
  const performLogout = useCallback(() => {
    localStorage.removeItem('authToken'); 
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLoadingAuth(false); 
    console.log("AuthContext: User logged out, token removed from localStorage.");
   
  }, [/* router */]);

  /**
   * Prüft beim ersten Laden der Anwendung, ob ein gültiges Token im localStorage vorhanden ist.
   */



  const verifyTokenAndInitializeAuth = useCallback(async () => {
    console.log("AuthContext: Initializing auth - attempting to verify token from localStorage...");
    setIsLoadingAuth(true);
    const storedToken = localStorage.getItem('authToken');

    if (storedToken) {
      try {
        // Sende das Token an deinen Verifizierungs-Endpunkt (/api/verify-token)
        const response = await fetch('/api/verify-token', {
            method: 'POST', // Muss zur Methode deines Endpunkts passen
            headers: {
                'Authorization': `Bearer ${storedToken}`, // Token im Header senden
            }
        });

        if (response.ok) {
            const data = await response.json(); // Erwartet { isValid: true, user: User }
            if (data.isValid && data.user) {
                // Token ist gültig, Benutzerdaten und Authentifizierungsstatus setzen
                setUser(data.user);
                setToken(storedToken);
                setIsAuthenticated(true);
                console.log("AuthContext: Token successfully verified. User authenticated:", data.user);
            } else {
                // Server meldet Token als ungültig oder liefert keine Benutzerdaten
                console.log("AuthContext: Token verification response indicates invalid token or no user data. Performing logout.");
                performLogout(); // Token entfernen und Status zurücksetzen
            }
        } else {
            // Anfrage an /api/verify-token fehlgeschlagen (z.B. 401 bei abgelaufenem Token)
            console.log(`AuthContext: Token verification request failed with status: ${response.status}. Performing logout.`);
            performLogout(); // Token entfernen und Status zurücksetzen
        }
      } catch (error) {
        // Netzwerkfehler oder anderer Fehler bei der Anfrage
        console.error("AuthContext: Error during token verification request:", error);
        performLogout(); // Bei Fehlern ebenfalls ausloggen
      }
    } else {
        // Kein Token im localStorage gefunden
        console.log("AuthContext: No token found in localStorage. User is not authenticated.");
        // Kein Logout nötig, da nicht eingeloggt. Ladevorgang ist aber abgeschlossen.
    }
    setIsLoadingAuth(false); // Auth-Prüfung ist abgeschlossen
  }, [performLogout]); // performLogout als Abhängigkeit


  // useEffect-Hook, um verifyTokenAndInitializeAuth beim ersten Mounten der Komponente aufzurufen.
  useEffect(() => {
    verifyTokenAndInitializeAuth();
  }, [verifyTokenAndInitializeAuth]); // Die Abhängigkeit stellt sicher, dass es nur einmal korrekt initialisiert wird.

  /**
   * Funktion zum Anmelden des Benutzers nach erfolgreicher API-Antwort vom Login.
   * Speichert das Token und die Benutzerdaten.
   * @param responseDataFromLoginApi Die Daten, die vom /api/login Endpunkt zurückgegeben wurden (inkl. Token).
   */
  const login = (responseDataFromLoginApi: { userId: number; username: string; name?: string; nachname?: string; isAdmin: boolean; token: string }) => {
    localStorage.setItem('authToken', responseDataFromLoginApi.token); // Token im Browser-Speicher sichern

    // Benutzerobjekt für den Context-State erstellen
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
    setIsLoadingAuth(false); // Nach einem expliziten Login ist der Ladezustand definitiv abgeschlossen.
    console.log("AuthContext: User logged in. Token stored in localStorage. User data:", contextUser);
  };




  // Stellt den Context-Wert (Zustände und Funktionen) für alle Kind-Komponenten bereit.
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, isLoadingAuth, login, logout: performLogout }}>
      {children}
    </AuthContext.Provider>
  );
};





/**
 * Ein benutzerdefinierter Hook, um den AuthContext einfacher in Komponenten verwenden zu können.
 * Stellt sicher, dass der Hook innerhalb eines AuthProviders verwendet wird.
 */



export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider. Make sure to wrap your component tree with <AuthProvider>.');
  }
  return context;
};
