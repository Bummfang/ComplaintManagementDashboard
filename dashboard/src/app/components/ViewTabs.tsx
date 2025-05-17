// app/components/ViewTabs.tsx
"use client";

import { ViewType } from '../types'; // Pfad anpassen
import { VIEW_TITLES } from '../constants'; // Pfad anpassen

interface ViewTabsProps {
    currentView: ViewType;
    setCurrentView: (view: ViewType) => void;
}

export default function ViewTabs({ currentView, setCurrentView }: ViewTabsProps) {
    return (
        <div className="mb-6 flex flex-wrap space-x-1 border-b border-[#20202A] pb-px">
            {(Object.keys(VIEW_TITLES) as ViewType[]).map((viewKey) => (
                <button
                    key={viewKey}
                    onClick={() => setCurrentView(viewKey)}
                    className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${currentView === viewKey
                            ? 'border-b-2 border-blue-500 text-blue-400'
                            : 'border-b-2 border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-500'
                        }`}
                >
                    {VIEW_TITLES[viewKey].replace("übersicht", "")}
                </button>
            ))}
        </div>
    );
}