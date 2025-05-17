// app/components/StatisticsView.tsx
"use client";

import { motion } from 'framer-motion';
import { BarChart3, FileText, CalendarRange, FileSpreadsheet, Presentation } from 'lucide-react';

// Animationsvarianten für die Sektionen
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: "easeOut" } 
  },
};

// Animationsvarianten für die einzelnen Kacheln/Elemente innerhalb der Sektionen
const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
  },
};

// Platzhalter-Komponente für ein Diagramm
const ChartPlaceholder = ({ title }: { title: string }) => (
  <motion.div 
    variants={itemVariants}
    className="bg-slate-800/50 backdrop-blur-md p-6 rounded-xl shadow-lg border border-slate-700/50 flex flex-col items-center justify-center min-h-[250px] h-full"
  >
    <BarChart3 size={48} className="text-sky-500 mb-4" />
    <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
    <p className="text-sm text-slate-400 text-center">Diagramm-Platzhalter</p>
    <p className="text-xs text-slate-500 mt-1">(Daten werden hier visualisiert)</p>
  </motion.div>
);

// Kachel für Aktionen wie Berichterstellung oder Export
const ActionCard = ({ title, icon: Icon, actionText, onActionClick }: { title: string, icon: React.ElementType, actionText: string, onActionClick?: () => void }) => (
    <motion.div
        variants={itemVariants}
        className="bg-slate-800/50 backdrop-blur-md p-6 rounded-xl shadow-lg border border-slate-700/50 flex flex-col items-center text-center h-full"
        whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}
    >
        <Icon size={40} className="text-emerald-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-200 mb-3">{title}</h3>
        <button
            onClick={onActionClick}
            className="mt-auto bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-150 ease-in-out text-sm shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
            {actionText}
        </button>
    </motion.div>
);


export default function StatisticsView() {
  // Dummy-Handler für Aktionen, die noch nicht implementiert sind
  const handleComingSoon = () => {
    alert("Diese Funktion ist bald verfügbar (Coming Soon).");
  };

  return (
    <motion.div 
      className="space-y-10 py-4" // Etwas Padding oben/unten für den Gesamtcontainer
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.2 } } }} // Stagger-Animation für die Sektionen
    >
      {/* Sektion für Periodische Berichte */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-6 px-1"> {/* Kleiner horizontaler Padding für die Überschrift */}
          <CalendarRange size={28} className="text-sky-400 mr-3 flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-slate-100">Periodische Berichte</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ChartPlaceholder title="Wochenbericht" />
          <ChartPlaceholder title="Monatsbericht" />
          <ChartPlaceholder title="Quartalsbericht" />
          <ChartPlaceholder title="Jahresbericht" />
        </div>
      </motion.section>

      {/* Sektion für Aktionen: Präsentationsbericht und Excel-Export */}
      <motion.section variants={sectionVariants}>
         <div className="flex items-center mb-6 px-1"> {/* Kleiner horizontaler Padding */}
            <FileText size={28} className="text-sky-400 mr-3 flex-shrink-0" />
            <h2 className="text-2xl font-semibold text-slate-100">Berichte & Export</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ActionCard 
                title="Präsentationsbericht"
                icon={Presentation}
                actionText="Bericht erstellen"
                onActionClick={handleComingSoon}
            />
            <ActionCard 
                title="Excel-Export (Quartal)"
                icon={FileSpreadsheet}
                actionText="Daten exportieren"
                onActionClick={handleComingSoon}
            />
        </div>
      </motion.section>

      {/* Beispiel für weitere spezifische Diagramme */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center mb-6 px-1"> {/* Kleiner horizontaler Padding */}
            <BarChart3 size={28} className="text-sky-400 mr-3 flex-shrink-0" />
            <h2 className="text-2xl font-semibold text-slate-100">Detail-Statistiken (Beispiele)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartPlaceholder title="Beschwerden nach Grund" />
            <ChartPlaceholder title="Bearbeitungszeiten" />
        </div>
      </motion.section>

    </motion.div>
  );
}
