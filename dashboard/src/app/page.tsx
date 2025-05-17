// app/page.tsx
"use client"; // Erforderlich für die Verwendung von Hooks wie useState

import { useState } from 'react';
import ContaintTable from "./components/ContaintTable";
import LoginScreen from "./components/LoginScreen"; // Annahme: LoginScreen.tsx befindet sich im components-Ordner

export default function Home() {
  // State, um zu verfolgen, ob der Benutzer eingeloggt ist
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Diese Funktion wird von der LoginScreen-Komponente aufgerufen,
  // wenn der Login-Vorgang erfolgreich war.
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    // Hier könnten Sie z.B. auch ein Token im localStorage speichern,
    // falls Sie eine persistentere Login-Sitzung benötigen.
  };

  // Wenn der Benutzer nicht eingeloggt ist, zeige den LoginScreen
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Wenn der Benutzer eingeloggt ist, zeige die ContaintTable
  return (
    <div className="w-full">
      <ContaintTable />
    </div>
  );
}
