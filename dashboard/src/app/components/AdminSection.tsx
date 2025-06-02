// app/components/AdminSection.tsx
"use client";

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
    UserCircleIcon, 
    LockClosedIcon, 
    ShieldCheckIcon, 
    CheckCircleIcon, 
    ExclamationTriangleIcon,
    TrashIcon,
    UserPlusIcon,
    XCircleIcon 
} from '@heroicons/react/24/outline';







// Schnittstelle für die Daten eines Benutzers in der Liste
interface UserListItem {
    id: number;
    name: string;
    nachname: string;
    username: string;
    ist_admin: boolean;
}







// Schnittstelle für die Daten, die zum Erstellen eines neuen Benutzers gesendet werden
export interface NewUserFormData {
    name: string;
    nachname: string;
    password_hash: string;
    isAdmin: boolean;
}






// Framer Motion Varianten
const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.15 }
    },
};






const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 120, damping: 18 } },
};









const feedbackMessageVariants = {
    hidden: { opacity: 0, y: -10, height: 0 },
    visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -5, height: 0, transition: { duration: 0.2, ease: "easeIn" } }
};







export default function AdminSection() {
    const { token, user: adminUser } = useAuth();
    // States für das "Benutzer erstellen"-Formular
    const [name, setName] = useState('');
    const [nachname, setNachname] = useState('');
    const [password, setPassword] = useState('');
    const [isAdminForm, setIsAdminForm] = useState(false); // Umbenannt von isAdmin, um Konflikt zu vermeiden
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
    const [usersList, setUsersList] = useState<UserListItem[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
    const [userListError, setUserListError] = useState<string | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState<number | null>(null);
    const fetchUsers = useCallback(async () => {
        if (!token || !adminUser?.isAdmin) {
            setUserListError("Keine Berechtigung zum Laden der Benutzerliste.");
            setIsLoadingUsers(false);
            setUsersList([]);
            return;
        }
        setIsLoadingUsers(true);
        setUserListError(null);
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({error: "Unbekannter Fehler"}));
                throw new Error(errData.error || `Fehler ${response.status}`);
            }
            const data: UserListItem[] = await response.json();
            setUsersList(data);
        } catch (err) {
            setUserListError(err instanceof Error ? err.message : "Unbekannter Fehler.");
        } finally {
            setIsLoadingUsers(false);
        }
    }, [token, adminUser?.isAdmin]);

    useEffect(() => {
        if (adminUser?.isAdmin) {
             fetchUsers();
        } else {
            setIsLoadingUsers(false);
            setUsersList([]);
            setUserListError("Keine Admin-Berechtigung für diese Sektion.");
        }
    }, [fetchUsers, adminUser?.isAdmin]);
    
    useEffect(() => {
        let timerId: NodeJS.Timeout;
        if (submissionSuccess && !submissionError) {
            setName(''); setNachname(''); setPassword(''); setIsAdminForm(false); setValidationError(null);
            timerId = setTimeout(() => {
                fetchUsers(); 
                setSubmissionSuccess(null); 
            }, 2500); 
        }
        return () => clearTimeout(timerId);
    }, [submissionSuccess, submissionError, fetchUsers]);

    const handleCreateUserFormSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setValidationError(null); setSubmissionError(null); setSubmissionSuccess(null);

        if (!name.trim() || !nachname.trim() || !password.trim()) {
            setValidationError("Vorname, Nachname und Passwort sind Pflichtfelder."); return;
        }
        if (password.length < 6) {
            setValidationError("Das Passwort muss mindestens 6 Zeichen lang sein."); return;
        }

        setIsSubmittingCreate(true);
        const newUserData: NewUserFormData = { 
            name: name.trim(), 
            nachname: nachname.trim(), 
            password_hash: password, // Backend erwartet Klartext hier und hasht es dann
            isAdmin: isAdminForm 
        };

        if (!token || !adminUser?.isAdmin) {
            setSubmissionError("Nicht autorisiert oder keine Admin-Rechte.");
            setIsSubmittingCreate(false); return; 
        }

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
                setSubmissionError(result.error || result.details || `Fehler beim Erstellen: ${response.status}`);
            } else {
                setSubmissionSuccess(`Benutzer "${result.username || (newUserData.name + '.' + newUserData.nachname)}" wurde erfolgreich angelegt.`);
                // Formularfelder werden durch den useEffect auf submissionSuccess oben zurückgesetzt
            }
        } catch (err) {
            if (!submissionError) { // Nur setzen, falls nicht schon durch response.ok=false ein API-Fehler gesetzt wurde
                 const errorMessage = err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.";
                 setSubmissionError(errorMessage);
            }
            console.error("AdminSection: Fehler beim Erstellen des Benutzers:", err);
        } finally {
            setIsSubmittingCreate(false);
        }
    };
    








    const handleDeleteUser = async (userIdToDelete: number, usernameToDelete: string) => {
        if (!token || !adminUser?.isAdmin) {
            setSubmissionError("Keine Berechtigung zum Löschen."); return;
        }
        if (adminUser.userId === userIdToDelete) {
            setSubmissionError("Sie können Ihren eigenen Account nicht löschen."); return;
        }
        
        if (window.confirm(`Sind Sie sicher, dass Sie den Benutzer "${usernameToDelete}" (ID: ${userIdToDelete}) wirklich löschen möchten?\nDiese Aktion kann nicht rückgängig gemacht werden und setzt die Zuweisung dieses Bearbeiters bei allen Fällen zurück.`)) {
            setIsDeletingUser(userIdToDelete); 
            setSubmissionError(null); setSubmissionSuccess(null); 
            
            try {
                const response = await fetch(`/api/admin/users/${userIdToDelete}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || result.details || `Fehler ${response.status}`);
                }
                setSubmissionSuccess(result.message || `Benutzer "${usernameToDelete}" erfolgreich gelöscht.`);
                fetchUsers(); 
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler.";
                setSubmissionError(`Fehler beim Löschen von ${usernameToDelete}: ${errorMessage}`);
                console.error(`Fehler beim Löschen von User ID ${userIdToDelete}:`, err);
            } finally {
                setIsDeletingUser(null); 
            }
        }
    };









    if (!adminUser?.isAdmin && !isLoadingUsers) {
        return (
            <motion.div className="text-center py-10 text-red-400" initial={{opacity:0}} animate={{opacity:1}}>
                <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4"/>
                Keine Berechtigung für den Admin-Bereich.
            </motion.div>
        );
    }








    return (
        <motion.div
            variants={sectionVariants} initial="hidden" animate="visible"
            className="space-y-10 p-1 md:p-4"
        >
            <motion.div 
                variants={itemVariants} 
                className="bg-slate-800/60 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-2xl border border-slate-700/60"
            >
                <div className="flex items-center mb-6 border-b border-slate-700 pb-4">
                    <UserPlusIcon className="w-7 h-7 text-sky-400 mr-3 flex-shrink-0"/>
                    <h2 className="text-xl lg:text-2xl font-semibold text-slate-100">Neuen Benutzer anlegen</h2>
                </div>
                
                <AnimatePresence mode="wait">
                    {validationError && (
                        <motion.div key="val-error" variants={feedbackMessageVariants} initial="hidden" animate="visible" exit="exit"
                            className="mb-5 p-3 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 rounded-md text-sm text-center shadow-sm flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" /> {validationError}
                        </motion.div>
                    )}
                    {submissionError && (
                        <motion.div key="sub-error" variants={feedbackMessageVariants} initial="hidden" animate="visible" exit="exit"
                            className="mb-5 p-3 bg-red-600/30 text-red-200 border border-red-500/60 rounded-md text-sm text-center shadow-sm flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" /> {submissionError}
                        </motion.div>
                    )}
                    {submissionSuccess && (
                        <motion.div key="sub-success" variants={feedbackMessageVariants} initial="hidden" animate="visible" exit="exit"
                            className="mb-5 p-4 bg-green-500/30 text-green-200 border border-green-500/60 rounded-md text-sm text-center shadow-sm flex flex-col items-center gap-2">
                            <CheckCircleIcon className="w-8 h-8 text-green-400" />
                            <p className="font-medium">{submissionSuccess}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleCreateUserFormSubmit} className="space-y-5">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <div>
                            <label htmlFor="admin-new-name" className="block text-sm font-medium text-slate-300 mb-1.5">Vorname <span className="text-red-400">*</span></label>
                            <div className="relative group">
                                <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                                <input id="admin-new-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmittingCreate} className="block w-full rounded-lg border-0 bg-slate-700/70 py-2.5 sm:py-3 pl-10 pr-3 text-slate-100 shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-400/80 focus:bg-slate-700 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm transition-all" placeholder="Max"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="admin-new-nachname" className="block text-sm font-medium text-slate-300 mb-1.5">Nachname <span className="text-red-400">*</span></label>
                            <div className="relative group">
                                <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                                <input id="admin-new-nachname" type="text" value={nachname} onChange={(e) => setNachname(e.target.value)} required disabled={isSubmittingCreate} className="block w-full rounded-lg border-0 bg-slate-700/70 py-2.5 sm:py-3 pl-10 pr-3 text-slate-100 shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-400/80 focus:bg-slate-700 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm transition-all" placeholder="Mustermann"/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="admin-new-password" className="block text-sm font-medium text-slate-300 mb-1.5">Passwort <span className="text-red-400">*</span></label>
                         <div className="relative group">
                            <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                            <input id="admin-new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isSubmittingCreate} className="block w-full rounded-lg border-0 bg-slate-700/70 py-2.5 sm:py-3 pl-10 pr-3 text-slate-100 shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-400/80 focus:bg-slate-700 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm transition-all" placeholder="Mindestens 6 Zeichen"/>
                        </div>
                    </div>
                    <div className="flex items-center pt-1">
                        <input id="admin-new-isAdmin" type="checkbox" checked={isAdminForm} onChange={(e) => setIsAdminForm(e.target.checked)} disabled={isSubmittingCreate} className="h-4 w-4 rounded border-slate-500 text-sky-500 focus:ring-1 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 bg-slate-700 cursor-pointer"/>
                        <label htmlFor="admin-new-isAdmin" className="ml-2.5 text-sm text-slate-200 cursor-pointer flex items-center">
                            Ist Administrator?
                            <ShieldCheckIcon className={`h-5 w-5 ml-1.5 transition-colors ${isAdminForm ? 'text-emerald-400' : 'text-slate-500'}`} />
                        </label>
                    </div>
                    <motion.button type="submit" disabled={isSubmittingCreate} className="w-full flex justify-center items-center rounded-lg bg-emerald-600 px-3.5 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all group" whileHover={{ scale: isSubmittingCreate ? 1 : 1.02 }} whileTap={{ scale: isSubmittingCreate ? 1 : 0.98 }}>
                        {isSubmittingCreate ? ( <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Wird erstellt... </> ) : ( <> <UserPlusIcon className="h-5 w-5 mr-2 -ml-1 opacity-90 group-hover:opacity-100 transition-opacity"/> Nutzer erstellen </>)}
                    </motion.button>
                </form>
            </motion.div>
            








            
            <motion.div 
                variants={itemVariants}
                className="bg-slate-800/60 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-xl border border-slate-700/60"
            >
                <div className="flex items-center mb-6 border-b border-slate-700 pb-4">
                     <UserCircleIcon className="w-7 h-7 text-sky-400 mr-3 flex-shrink-0"/>
                    <h2 className="text-xl lg:text-2xl font-semibold text-slate-100">Existierende Benutzer</h2>
                </div>
                {isLoadingUsers && <p className="text-slate-400 py-4 text-center animate-pulse">Lade Benutzerliste...</p>}
                {userListError && 
                    <div className="p-3 bg-red-600/30 text-red-200 border border-red-500/60 rounded-md text-sm text-center shadow-sm flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" /> {userListError}
                    </div>
                }
                {!isLoadingUsers && !userListError && usersList.length === 0 && (
                    <p className="text-slate-500 py-4 text-center">Keine Benutzer im System gefunden.</p>
                )}
                {!isLoadingUsers && !userListError && usersList.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-700/80 shadow-inner">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-sky-300 uppercase bg-slate-700/80">
                                <tr>
                                    <th scope="col" className="px-4 py-3 sm:px-6 whitespace-nowrap">ID</th>
                                    <th scope="col" className="px-4 py-3 sm:px-6 whitespace-nowrap">Username</th>
                                    <th scope="col" className="px-4 py-3 sm:px-6 whitespace-nowrap">Vorname</th>
                                    <th scope="col" className="px-4 py-3 sm:px-6 whitespace-nowrap">Nachname</th>
                                    <th scope="col" className="px-4 py-3 sm:px-6 text-center whitespace-nowrap">Admin</th>
                                    <th scope="col" className="px-4 py-3 sm:px-6 text-center whitespace-nowrap">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersList.map((userItem) => (
                                    <tr key={userItem.id} className="border-b border-slate-700 hover:bg-slate-750/60 transition-colors duration-150">
                                        <td className="px-4 py-3 sm:px-6 font-medium text-slate-100">{userItem.id}</td>
                                        <td className="px-4 py-3 sm:px-6">{userItem.username}</td>
                                        <td className="px-4 py-3 sm:px-6">{userItem.name}</td>
                                        <td className="px-4 py-3 sm:px-6">{userItem.nachname}</td>
                                        <td className="px-4 py-3 sm:px-6 text-center">
                                            {userItem.ist_admin ? 
                                                <CheckCircleIcon className="w-5 h-5 text-green-400 inline-block" title="Ja"/> :
                                                <XCircleIcon className="w-5 h-5 text-red-400 inline-block" title="Nein" />
                                            }
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 text-center">
                                            <button 
                                                onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                                                disabled={adminUser?.userId === userItem.id || isSubmittingCreate || isDeletingUser === userItem.id} 
                                                title={adminUser?.userId === userItem.id ? "Eigener Account kann nicht gelöscht werden" : `Benutzer ${userItem.username} löschen`}
                                                className="text-red-500 hover:text-red-400 disabled:text-slate-600 disabled:hover:text-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1 rounded-md hover:bg-red-500/10 focus-visible:ring-1 focus-visible:ring-red-500"
                                            >
                                                {isDeletingUser === userItem.id ? (
                                                    <svg className="animate-spin h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <TrashIcon className="w-5 h-5" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}