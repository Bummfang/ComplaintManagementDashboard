// app/components/ViewTabs.tsx
"use client";

import { ViewType } from '../types';
import { VIEW_TITLES } from '../constants';
import { motion } from 'framer-motion';
import { User as AuthUser } from '../contexts/AuthContext'; // Import User-Typ aus AuthContext

interface ViewTabsProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  user: AuthUser | null; // NEU: Benutzerobjekt für Admin-Check
}

export default function ViewTabs({ currentView, setCurrentView, user }: ViewTabsProps) {
  const getTabTitle = (viewKey: ViewType): string => {
    const fullTitle = VIEW_TITLES[viewKey];
    if (viewKey === "statistik") {
      return "Statistik";
    }
    if (viewKey === "admin") { // NEU
      return "Admin";
    }
    if (fullTitle && fullTitle.includes("übersicht")) {
      return fullTitle.replace("übersicht", "").trim();
    }
    return fullTitle || viewKey.charAt(0).toUpperCase() + viewKey.slice(1); // Fallback
  };

  const availableViews = (Object.keys(VIEW_TITLES) as ViewType[]).filter(viewKey => {
    if (viewKey === "admin") {
      return user?.isAdmin; // Admin-Tab nur anzeigen, wenn der User Admin ist
    }
    return true;
  });

  return (
    <div className="mb-6 flex flex-wrap space-x-1 border-b border-sky-800 pb-px relative">
      {availableViews.map((viewKey) => (
        <button
          key={viewKey}
          onClick={() => setCurrentView(viewKey)}
          className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-opacity-75 relative
            ${currentView === viewKey
              ? 'text-sky-400'
              : 'text-neutral-400 hover:text-sky-300'
            }`}
        >
          {getTabTitle(viewKey)}
          {currentView === viewKey && (
            <motion.div
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-400"
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