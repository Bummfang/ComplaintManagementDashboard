// app/components/PaginationControls.tsx
"use client";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    setItemsPerPage: (limit: number) => void;
    totalItems: number;
}

export default function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    setItemsPerPage,
    totalItems
}: PaginationControlsProps) {
    





    const baseButtonClass = "px-4 sm:px-5 py-2 text-xs sm:text-sm rounded-full border transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 shadow-sm hover:shadow-md";
    const inactiveButtonClass = "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-sky-700/50 hover:border-sky-600 hover:text-sky-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-700/60 disabled:hover:border-slate-600 disabled:hover:text-slate-300";
    const activeButtonClass = "bg-sky-500 border-sky-400 text-white font-bold shadow-lg cursor-default";
    const ellipsisClass = "px-2 text-slate-500 items-center flex h-full";






    // Wenn es absolut keine Items gibt, zeige die Controls gar nicht an.
    // Oder wenn totalPages 0 ist (was bei 0 Items der Fall sein sollte).
    if (totalItems === 0 && totalPages === 0) { 
        // Optional: Eine Meldung wie "Keine Daten vorhanden" oder einfach nichts.
        // return <div className="mt-10 text-sm text-slate-500 text-center">Keine Einträge vorhanden.</div>;
        return null;
    }







    const pageNumbers = [];
    const maxPagesToShow = 3; 
    const wingSize = Math.floor(maxPagesToShow / 2);
    let startPage = Math.max(1, currentPage - wingSize);
    let endPage = Math.min(totalPages, currentPage + wingSize);





    if (endPage - startPage + 1 < maxPagesToShow) {
        if (currentPage - wingSize < 1) {
            endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        } else if (currentPage + wingSize > totalPages) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }








    const firstItemOnPage = totalItems > 0 ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems) : 0;
    const lastItemOnPage = Math.min(currentPage * itemsPerPage, totalItems);






    
    return (
        <div className="mt-10 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-slate-300 space-y-4 sm:space-y-0">
            {/* Teil 1: Einträge pro Seite & Info - Wird jetzt (fast) immer angezeigt */}
            <div className="flex items-center space-x-3">
                <span className="text-slate-400">Zeige:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-slate-800/70 border border-slate-700 rounded-full px-4 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer appearance-none shadow-sm hover:border-slate-500 transition-colors"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                    title="Einträge pro Seite"
                >
                    {[4, 8, 16, 20, 30, 50].sort((a,b) => a-b).map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
                <span className="text-slate-500 text-xs">
                    {totalItems > 0 ? `(${firstItemOnPage}-${lastItemOnPage} von ${totalItems})` : '(0 Einträge)'}
                </span>
            </div>

            {/* Teil 2: Paginierungsbuttons - Nur anzeigen, wenn mehr als eine Seite */}
            {totalPages > 1 && (
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className={`${baseButtonClass} ${inactiveButtonClass}`}
                        title="Erste Seite"
                    >
                        «
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`${baseButtonClass} ${inactiveButtonClass}`}
                        title="Vorherige Seite"
                    >
                        ‹
                    </button>

                    {startPage > 1 && (
                        <>
                            <button onClick={() => onPageChange(1)} className={`${baseButtonClass} ${inactiveButtonClass}`}>1</button>
                            {startPage > 2 && <span className={ellipsisClass}>...</span>}
                        </>
                    )}

                    {pageNumbers.map(number => (
                        <button
                            key={number}
                            onClick={() => onPageChange(number)}
                            className={`${baseButtonClass} ${currentPage === number ? activeButtonClass : inactiveButtonClass}`}
                        >
                            {number}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                             {endPage < totalPages - 1 && <span className={ellipsisClass}>...</span>}
                            <button onClick={() => onPageChange(totalPages)} className={`${baseButtonClass} ${inactiveButtonClass}`}>{totalPages}</button>
                        </>
                    )}

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className={`${baseButtonClass} ${inactiveButtonClass}`}
                        title="Nächste Seite"
                    >
                        ›
                    </button>
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className={`${baseButtonClass} ${inactiveButtonClass}`}
                        title="Letzte Seite"
                    >
                        »
                    </button>
                </div>
            )}
            {/* Fallback-Anzeige, wenn nur eine Seite da ist, aber der Select trotzdem sichtbar sein soll */}
            {totalPages <= 1 && totalItems > 0 && (
                 <div className="flex items-center space-x-1 sm:space-x-1.5 text-slate-500">
                    {/* Hier könnten leere Platzhalter sein oder eine zentrierte Nachricht,
                        aber da der Select-Teil oben schon die Info "Zeige X von X" gibt,
                        brauchen wir hier vielleicht nichts mehr, wenn totalPages <= 1. 
                        Die Buttons werden durch `totalPages > 1` sowieso ausgeblendet.
                    */}
                 </div>
            )}
        </div>
    );
}