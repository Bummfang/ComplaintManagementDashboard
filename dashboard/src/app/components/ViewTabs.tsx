// app/components/ViewTabs.tsx
"use client";

import { ViewType } from '../types'; // Pfad anpassen
import { VIEW_TITLES } from '../constants'; // Pfad anpassen
import { motion } from 'framer-motion'; 

interface ViewTabsProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export default function ViewTabs({ currentView, setCurrentView }: ViewTabsProps) {
  // Funktion zur korrekten Anzeige des Tab-Titels
  const getTabTitle = (viewKey: ViewType): string => {
    const fullTitle = VIEW_TITLES[viewKey];
    if (viewKey === "statistik") { // Spezifische Behandlung für den Schlüssel "statistik"
      return "Statistik"; 
    }
    if (fullTitle === "Anregungsübersicht") {
      return "Anregungen"; 
    }
    // Standardbehandlung, entfernt "übersicht" oder gibt den vollen Titel zurück, falls "übersicht" nicht enthalten ist.
    return fullTitle.includes("übersicht") ? fullTitle.replace("übersicht", "") : fullTitle; 
  };

  return (
    <div className="mb-6 flex flex-wrap space-x-1 border-b border-blue-800 pb-px relative">
      {/* Die Buttons für jeden Ansichtstyp werden hier gerendert */}
      {(Object.keys(VIEW_TITLES) as ViewType[]).map((viewKey) => (
        <button
          key={viewKey}
          onClick={() => setCurrentView(viewKey)}
          className={`py-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 relative
            ${
              currentView === viewKey
                ? 'text-blue-400' // Aktiver Tab Textfarbe
                : 'text-neutral-400 hover:text-blue-300' // Inaktiver Tab Textfarbe und Hover-Effekt
            }`}
        >
          {/* Der Titel des Tabs, angepasst für korrekte Anzeige */}
          {getTabTitle(viewKey)}

          {/* Animierter Indikator für den aktiven Tab */}
          {currentView === viewKey && (
            <motion.div
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-blue-400" // Indikatorfarbe
              layoutId="activeTabIndicator" 
              initial={false} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
            />
          )}
        </button>
      ))}
    </div>
  );
}
