// app/components/AdminSection.tsx
"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import CreateUserModal, { NewUserFormData } from './CreateUserModal';
import { useAuth } from '../contexts/AuthContext';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.1 }
  },
};






const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 120, damping: 18} },
};






export default function AdminSection() {
  const { token, user } = useAuth();
  const [showCreateUserModal, setShowCreateUserModal] = useState<boolean>(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

  const handleOpenCreateUserModal = () => {
    setCreateUserError(null); // Fehler/Erfolg zurücksetzen, wenn Modal geöffnet wird
    setCreateUserSuccess(null);
    setShowCreateUserModal(true);
  };





  const handleCloseCreateUserModal = () => {
    setShowCreateUserModal(false);
    // Erfolgs- und Fehlermeldungen können hier optional auch zurückgesetzt werden,
    // aber sie werden beim nächsten Öffnen sowieso zurückgesetzt.
  };




  
  const handleCreateUserSubmit = async (newUserData: NewUserFormData) => {
    if (!token || !user?.isAdmin) {
      setCreateUserError("Nicht autorisiert oder keine Admin-Rechte.");
      throw new Error("Nicht autorisiert oder keine Admin-Rechte.");
    }
    // Fehler und Erfolg hier zurücksetzen, bevor der API-Call startet
    setCreateUserError(null);
    setCreateUserSuccess(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newUserData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Fehler an das Modal weitergeben
        setCreateUserError(result.error || result.details || `Fehler: ${response.status}`);
        throw new Error(result.error || result.details || `Fehler: ${response.status}`);
      }

      // Erfolg an das Modal weitergeben
      setCreateUserSuccess(`Benutzer "${result.username || (newUserData.name + '.' + newUserData.nachname)}" wurde erfolgreich angelegt.`);
      // Das Modal schließt sich jetzt, wenn der Benutzer im Modal auf "Schließen" klickt (nach Erfolgsmeldung)
      // oder automatisch nach einem Timeout, falls gewünscht (kann im Modal implementiert werden).
      // Hier kein automatisches Schließen mehr:
      // setTimeout(() => {
      //   handleCloseCreateUserModal();
      //   setCreateUserSuccess(null);
      // }, 2800);

    } catch (err) {
      // Fehler wurde schon oben gesetzt oder wird vom Modal selbst gesetzt,
      // wenn es von onSubmit geworfen wird.
      // Sicherstellen, dass createUserError gesetzt ist, falls der Fehler nicht vom response.json() kam
      if (!createUserError) {
          const errorMessage = err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.";
          setCreateUserError(errorMessage);
      }
      console.error("AdminSection: Fehler beim Erstellen des Benutzers:", err);
      // Fehler muss nicht erneut geworfen werden, wenn setCreateUserError verwendet wird,
      // da das Modal diesen State als Prop erhält.
    }
  };

  return (
    <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 p-1"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-semibold text-slate-100 mb-2">Benutzerverwaltung</h2>
        <p className="text-slate-400 mb-6">Hier können neue Benutzerkonten angelegt werden.</p>
      </motion.div>

      {/* Globale Erfolgs-/Fehlermeldungen sind nicht mehr primär, da sie im Modal angezeigt werden */}
      {/* Man könnte sie für den Fall behalten, dass das Modal unerwartet geschlossen wird */}
      {/* oder als zusätzliche Bestätigung */}
      {/*
      {createUserSuccess && !showCreateUserModal && (
        <motion.div ... > {createUserSuccess} </motion.div>
      )}
      {createUserError && !showCreateUserModal && (
        <motion.div ... > {`Fehler: ${createUserError}`} </motion.div>
      )}
      */}

      <motion.div variants={itemVariants}>
        <button
          onClick={handleOpenCreateUserModal}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Neuen Nutzer anlegen
        </button>
      </motion.div>

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={handleCloseCreateUserModal}
        onSubmit={handleCreateUserSubmit}
        submissionError={createUserError}   // Prop übergeben
        submissionSuccess={createUserSuccess} // Prop übergeben
      />
    </motion.div>
  );
}