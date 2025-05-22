// app/page.tsx
"use client"; // Erforderlich für die Verwendung von Hooks

import { useAuth } from './contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion'; // Importiere AnimatePresence und motion

// Importiere deine Komponenten
import ContaintTable from "./components/ContaintTable";
import LoginScreen from "./components/LoginScreen";
import LoadingScreen from "./components/LoadingScreen"; // Importiere den neuen LoadingScreen

export default function Home() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  console.log("Home (page.tsx): isLoadingAuth =", isLoadingAuth, ", isAuthenticated =", isAuthenticated);
  const mainContentVariants = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.98, y: -10, transition: { duration: 0.3, ease: "easeIn" } },
  };



  


  return (
    <AnimatePresence mode="wait">
      {/*
        `mode="wait"` stellt sicher, dass die ausgehende Komponente ihre `exit`-Animation
        beendet, bevor die neue Komponente ihre `initial`/`animate`-Animation startet.
      */}

      {isLoadingAuth && (
        // Der LoadingScreen hat bereits eine 'key' und 'exit' Animation in seiner Definition.
        // Wenn nicht, müsste hier <motion.div key="loading" variants={...}><LoadingScreen /></motion.div> stehen.
        // Da LoadingScreen selbst eine motion.div als Wurzel hat, reicht der key hier.
        <LoadingScreen key="loadingScreen" />
      )}

      {!isLoadingAuth && isAuthenticated && (
        <motion.div
          key="contentTable" // Eindeutiger Key für AnimatePresence
          className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f]" // Hintergrund passend zum Rest
          variants={mainContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <ContaintTable />
        </motion.div>
      )}

      {!isLoadingAuth && !isAuthenticated && (
        // Der LoginScreen hat bereits eine 'key' (implizit durch motion.div als Wurzel)
        // und 'exit' Animation in seiner Definition (über cardVariants).
        // Ein expliziter Key hier ist dennoch gute Praxis für AnimatePresence.
        <LoginScreen key="loginScreen" />
      )}
    </AnimatePresence>
  );
}
