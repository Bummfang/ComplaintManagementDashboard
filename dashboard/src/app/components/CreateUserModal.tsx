// app/components/CreateUserModal.tsx
"use client";

import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserCircleIcon, LockClosedIcon, ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'; // CheckCircleIcon für Erfolg







export interface NewUserFormData {
  name: string;
  nachname: string;
  password_hash: string;
  isAdmin: boolean;
}







interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: NewUserFormData) => Promise<void>;
  // NEU: Props für Feedback-Nachrichten
  submissionError: string | null;
  submissionSuccess: string | null;
}






const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, y: 30, transition: { duration: 0.2, ease: "easeIn" } },
};





const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: {duration: 0.2} },
  exit: { opacity: 0, transition: {duration: 0.25, delay: 0.05} },
};






export default function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
  submissionError,   // NEU
  submissionSuccess, // NEU
}: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [nachname, setNachname] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);






  useEffect(() => {
    if (isOpen) {
      setName('');
      setNachname('');
      setPassword('');
      setIsAdmin(false);
      setValidationError(null); // Lokalen Validierungsfehler zurücksetzen
      // submissionError und submissionSuccess werden von der Parent-Komponente gesteuert
      setIsSubmitting(false);
    }
  }, [isOpen]);






  
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null); // Alten Validierungsfehler löschen

    if (!name.trim() || !nachname.trim() || !password.trim()) {
      setValidationError("Vorname, Nachname und Passwort sind Pflichtfelder.");
      return;
    }
    if (password.length < 6) {
      setValidationError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ name, nachname, password_hash: password, isAdmin });
      // Erfolgsbehandlung (z.B. Modal schließen) wird von AdminSection übernommen
      // nachdem submissionSuccess gesetzt wurde
    } catch (err) {
      console.log(err);
    } finally {
      setIsSubmitting(false);
    }
  };





  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop-create-user"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose} // Erlaube Schließen durch Klick auf Backdrop, außer bei Erfolg/Fehler
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[60] p-4"
        >
          <motion.div
            key="modal-create-user"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md relative border border-slate-700/80"
          >
            <button
              onClick={onClose}
              disabled={isSubmitting || !!submissionSuccess} // Deaktivieren bei Erfolg, um versehentliches Schließen zu verhindern
              className="absolute top-4 right-4 text-slate-500 hover:text-sky-400 p-1 rounded-full transition-colors disabled:opacity-50"
              aria-label="Dialog schließen"
            >
              <XMarkIcon className="w-7 h-7" />
            </button>

            <h2 className="text-2xl sm:text-3xl font-semibold text-sky-400 mb-6 text-center">
              Neuen Nutzer registrieren
            </h2>

            {/* Client-seitiger Validierungsfehler */}
            {validationError && !submissionError && !submissionSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 bg-yellow-500/20 text-yellow-200 border border-yellow-500/50 rounded-md text-sm text-center shadow-md"
              >
                {validationError}
              </motion.div>
            )}

            {/* Fehler von der API (submissionError) */}
            {submissionError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 bg-red-500/20 text-red-100 border border-red-500/50 rounded-md text-sm text-center shadow-md"
              >
                <p className="font-medium">Fehler beim Erstellen:</p>
                <p className="text-xs">{submissionError}</p>
              </motion.div>
            )}

            {/* Erfolgsmeldung von der API (submissionSuccess) */}
            {submissionSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-4 bg-green-500/20 text-green-100 border border-green-500/50 rounded-md text-sm text-center shadow-md flex flex-col items-center"
              >
                <CheckCircleIcon className="w-10 h-10 text-green-400 mb-2" />
                <p className="font-medium text-base">{submissionSuccess}</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-md transition-colors"
                >
                    Schließen
                </button>
              </motion.div>
            )}

            {/* Formular nur anzeigen, wenn keine Erfolgsmeldung da ist */}
            {!submissionSuccess && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <div>
                    <label htmlFor="new-name" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                      Vorname <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                            <UserCircleIcon className="h-5 w-5 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                            id="new-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                            required disabled={isSubmitting}
                            className="block w-full rounded-lg border-0 bg-slate-700/60 py-2.5 sm:py-3 pl-11 pr-3 text-slate-100 shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-500 focus:bg-slate-700 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm transition-all"
                            placeholder="Max"
                        />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="new-nachname" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                      Nachname <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                            <UserCircleIcon className="h-5 w-5 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                            id="new-nachname" type="text" value={nachname} onChange={(e) => setNachname(e.target.value)}
                            required disabled={isSubmitting}
                            className="block w-full rounded-lg border-0 bg-slate-700/60 py-2.5 sm:py-3 pl-11 pr-3 text-slate-100 shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-500 focus:bg-slate-700 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm transition-all"
                            placeholder="Mustermann"
                        />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                    Passwort <span className="text-red-400">*</span>
                  </label>
                  <div className="relative group">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <LockClosedIcon className="h-5 w-5 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                    </div>
                    <input
                      id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      required disabled={isSubmitting}
                      className="block w-full rounded-lg border-0 bg-slate-700/60 py-2.5 sm:py-3 pl-11 pr-3 text-slate-100 shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-500 focus:bg-slate-700 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm transition-all"
                      placeholder="Mindestens 6 Zeichen"
                    />
                  </div>
                </div>

                <div className="flex items-center pt-1">
                  <input
                    id="new-isAdmin" type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-slate-500 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-800 bg-slate-700 cursor-pointer"
                  />
                  <label htmlFor="new-isAdmin" className="ml-2.5 text-sm text-slate-200 cursor-pointer flex items-center">
                    Ist Administrator?
                    <ShieldCheckIcon className={`h-5 w-5 ml-1.5 ${isAdmin ? 'text-emerald-400' : 'text-slate-500'}`} />
                  </label>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center rounded-lg bg-sky-600 px-3.5 py-3 text-sm font-semibold text-white shadow-md hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all group"
                  whileHover={{ scale: isSubmitting ? 1 : 1.02, transition: {type: 'spring', stiffness: 400, damping:15} }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Wird erstellt...
                    </>
                  ) : (
                    <>
                      <UserCircleIcon className="h-5 w-5 mr-2 -ml-1 opacity-80 group-hover:opacity-100 transition-opacity"/>
                      Nutzer erstellen
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}