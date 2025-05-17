// app/page.tsx
"use client"; // Erforderlich für die Verwendung von Hooks

// Importiere den useAuth-Hook aus deinem AuthContext
// Stelle sicher, dass der Pfad zu deiner AuthContext.tsx-Datei korrekt ist.
// Wenn AuthContext.tsx in app/contexts/AuthContext.tsx liegt, ist dieser Pfad korrekt.
import { useAuth } from './contexts/AuthContext';

import ContaintTable from "./components/ContaintTable"; // Pfad zu deiner ContaintTable Komponente
import LoginScreen from "./components/LoginScreen";   // Pfad zu deiner LoginScreen Komponente

// Optional: Eine einfache Ladekomponente
const LoadingScreen = () => (
  <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gray-900 text-white">
    {/* Hier könntest du einen animierten Spinner einfügen */}
    <svg className="animate-spin h-10 w-10 text-sky-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-xl">Anwendung wird geladen...</p>
  </div>
);

export default function Home() {
  // Hole den Authentifizierungsstatus und den Ladezustand aus dem AuthContext
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // Logge den Status, um das Debugging zu erleichtern
  console.log("Home (page.tsx): isLoadingAuth =", isLoadingAuth, ", isAuthenticated =", isAuthenticated);

  // Während der AuthContext den initialen Status prüft (z.B. Token-Verifizierung),
  // zeige eine Ladeanzeige an. Das verhindert, dass kurz der LoginScreen aufblitzt,
  // bevor der Benutzer als eingeloggt erkannt wird.
  if (isLoadingAuth) {
    console.log("Home (page.tsx): Showing LoadingScreen");
    return <LoadingScreen />;
  }

  // Wenn die Auth-Prüfung abgeschlossen ist:
  // Wenn der Benutzer authentifiziert ist, zeige die ContaintTable.
  if (isAuthenticated) {
    console.log("Home (page.tsx): User is authenticated, showing ContaintTable");
    return (
      <div className="w-full">
        <ContaintTable />
      </div>
    );
  }

  // Wenn der Benutzer nicht authentifiziert ist, zeige den LoginScreen.
  // Die onLoginSuccess-Prop wird hier nicht mehr benötigt.
  console.log("Home (page.tsx): User is NOT authenticated, showing LoginScreen");
  return <LoginScreen />;
}
