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
    // Keine Paginierung anzeigen, wenn nicht nötig (z.B. nur eine Seite)
    console.log("[PaginationControls] Props received:", { currentPage, totalPages, itemsPerPage, totalItems });
    if (totalPages <= 1 && totalItems <= itemsPerPage) { // Auch prüfen, ob überhaupt mehr Items als pro Seite angezeigt werden
        console.log("[PaginationControls] Bedingung zum Verstecken der vollen Controls ist WAHR.");
        if (totalItems > 0) { // Zeige Info nur, wenn überhaupt Items da sind
             return (
                <div className="mt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-400 space-y-3 sm:space-y-0">
                    <div>Zeige {totalItems} von {totalItems} Einträgen.</div>
                </div>
            );
        }
        return null;
    }

 console.log("[PaginationControls] Bedingung zum Verstecken der vollen Controls ist FALSCH. Rendere volle Controls.");
    const pageNumbers = [];
    const maxPagesToShow = 5; // Wie viele Seitenzahlen maximal direkt angezeigt werden
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Korrektur, falls am Ende nicht genug Seiten für maxPagesToShow sind
    if (totalPages > maxPagesToShow && (endPage - startPage + 1 < maxPagesToShow)) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    const firstItemOnPage = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const lastItemOnPage = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-slate-300 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
                <span>Zeige:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 cursor-pointer appearance-none shadow-sm"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                    title="Einträge pro Seite"
                >
                    {[10, 20, 30, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
                <span className="text-slate-400">
                    {totalItems > 0 ? `(${firstItemOnPage}-${lastItemOnPage} von ${totalItems})` : '(0 Einträge)'}
                </span>
            </div>
            {totalPages > 1 && ( // Buttons nur zeigen, wenn es mehr als eine Seite gibt
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 border border-slate-600 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Erste Seite"
                    >
                        « Erste
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 border border-slate-600 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Vorherige Seite"
                    >
                        ‹ Zurück
                    </button>

                    {startPage > 1 && (
                        <>
                            <button onClick={() => onPageChange(1)} className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 border border-slate-600 rounded-md hover:bg-slate-700">1</button>
                            {startPage > 2 && <span className="px-1.5 sm:px-2 text-slate-500">...</span>}
                        </>
                    )}

                    {pageNumbers.map(number => (
                        <button
                            key={number}
                            onClick={() => onPageChange(number)}
                            className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 border rounded-md transition-colors ${currentPage === number ? 'bg-sky-600 border-sky-500 text-white font-semibold shadow-md' : 'border-slate-600 hover:bg-slate-700'}`}
                        >
                            {number}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                             {endPage < totalPages - 1 && <span className="px-1.5 sm:px-2 text-slate-500">...</span>}
                            <button onClick={() => onPageChange(totalPages)} className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 border border-slate-600 rounded-md hover:bg-slate-700">{totalPages}</button>
                        </>
                    )}

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 border border-slate-600 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Nächste Seite"
                    >
                        Weiter ›
                    </button>
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 border border-slate-600 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Letzte Seite"
                    >
                        Letzte »
                    </button>
                </div>
            )}
        </div>
    );
}