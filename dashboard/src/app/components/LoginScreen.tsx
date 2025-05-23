"use client";

import { useState, FormEvent } from 'react';
import { motion,  AnimatePresence } from 'framer-motion';
import { UserIcon, LockClosedIcon, ArrowRightOnRectangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { LOGIN_APP_NAME, COMPANY_NAME, COMPANY_SUBTITLE, API_ENDPOINTS } from '../constants';







export default function LoginScreen() {
    const [username, setUsernameState] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setLoginSuccess(false);

        console.log("LoginScreen: Attempting login with (AuthContext version):", { username /*, password*/ }); // Passwort aus Log entfernt

        try {
            // API_ENDPOINTS.login anstelle von LOGIN_API_ENDPOINT verwenden
            const response = await fetch(API_ENDPOINTS.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const responseData = await response.json();

            if (response.ok) {
                console.log('LoginScreen: Login API call successful (AuthContext version). Response data:', responseData);
                setLoginSuccess(true);

                setTimeout(() => {
                    login({
                        userId: responseData.userId,
                        username: responseData.username,
                        name: responseData.name,
                        nachname: responseData.nachname,
                        isAdmin: responseData.isAdmin,
                        token: responseData.token,
                    });
                }, 1800);

            } else {
                console.error('LoginScreen: Login API call failed (AuthContext version). Error data:', responseData);
                setError(responseData.error || responseData.details || 'Ein unbekannter Anmeldefehler ist aufgetreten.');
                setIsLoading(false);
            }
        } catch (err) {
            console.error('LoginScreen: Network or fetch error during login (AuthContext version):', err);
            setError('Verbindung zum Server fehlgeschlagen oder Server antwortet nicht.');
            setIsLoading(false);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.98, },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut", when: "beforeChildren", staggerChildren: 0.1, }, },
        exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.4, ease: "easeIn", } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "circOut", }, },
    };

    const errorShakeTransition = {
        x: { duration: 0.4, ease: "easeInOut", },
        opacity: { duration: 0.3 }, y: { duration: 0.3 }
    };



    
    
    const keyIconEntryDelay = (cardVariants.visible.transition.staggerChildren || 0) + 0.1;







    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden relative">
           

            <motion.div
                variants={cardVariants} initial="hidden" animate="visible" exit="exit"
                className="w-full max-w-sm md:max-w-md relative z-10"
            >
                <div className="bg-slate-800/10 backdrop-blur-lg p-6 sm:p-8 md:p-10 rounded-xl shadow-2xl border border-slate-700/60">
                    <motion.div variants={itemVariants} className="flex flex-col items-center mb-6 md:mb-8">
                        <motion.div
                            className={`p-3 rounded-full mb-3 w-16 h-16 sm:w-20 sm:h-20 flex justify-center items-center shadow-inner transition-colors duration-300 ease-out ${loginSuccess ? 'bg-green-600/30 shadow-lg shadow-green-500/40' : 'bg-sky-500/20'}`}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={loginSuccess
                                ? { scale: [1, 1.25, 1], rotate: 360, opacity: 1, }
                                : { scale: [1, 1.12, 1, 1.08, 1], rotate: [0, 7, -4, 6, 0], opacity: 1, }
                            }
                            transition={loginSuccess
                                ? { duration: 0.8, ease: 'circOut', delay: 0.1, }
                                : { opacity: { duration: 0.5, ease: "easeOut", delay: keyIconEntryDelay }, scale: { delay: keyIconEntryDelay, duration: 3.0, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }, rotate: { delay: keyIconEntryDelay, duration: 3.0, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }, }
                            }
                        >
                            <Image src={'/key-solid.svg'} alt='Anmelde Icon' width={40} height={40} className="text-sky-400" />
                        </motion.div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
                            {LOGIN_APP_NAME}
                        </h1>
                        <p className="text-sm font-semibold text-neutral-300 mt-1.5">{COMPANY_NAME}</p>
                    </motion.div>

                    <AnimatePresence>
                        {error && !loginSuccess && (
                            <motion.div
                                key="error-message" initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0, x: [0, -7, 7, -5, 5, -2, 2, 0] }}
                                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                                transition={errorShakeTransition}
                                className="mb-4 p-3 bg-red-600/40 text-red-200 border border-red-500/70 rounded-lg text-sm shadow-md"
                            > {error} </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {!loginSuccess ? (
                            <motion.div key="login-form" exit={{opacity: 0, transition: {duration: 0.2}}}>
                                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                                    <motion.div variants={itemVariants} whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}>
                                        <label htmlFor="username_input" className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5">Benutzername</label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-500" aria-hidden="true" />
                                            </div>
                                            <input
                                                id="username_input" name="username" type="text" autoComplete="username" required
                                                value={username} onChange={(e) => setUsernameState(e.target.value)} disabled={isLoading}
                                                className="block w-full rounded-lg border-0 bg-slate-700/10 py-2.5 sm:py-3 pl-10 sm:pl-11 pr-3 text-neutral-100 shadow-sm ring-1 ring-inset ring-slate-600/80 placeholder:text-neutral-500 focus:bg-slate-700/80 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6 transition-all duration-150 ease-in-out"
                                                placeholder="z.B. max.mustermann"
                                            />
                                        </div>
                                    </motion.div>
                                    <motion.div variants={itemVariants} whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}>
                                        <label htmlFor="password_input" className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5">Passwort</label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                                <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-500" aria-hidden="true" />
                                            </div>
                                            <input
                                                id="password_input" name="password" type="password" autoComplete="current-password" required
                                                value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                                                className="block w-full rounded-lg border-0 bg-slate-700/10 py-2.5 sm:py-3 pl-10 sm:pl-11 pr-3 text-neutral-100 shadow-sm ring-1 ring-inset ring-slate-600/80 placeholder:text-neutral-500 focus:bg-slate-700/80 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6 transition-all duration-150 ease-in-out"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </motion.div>
                                    <motion.div variants={itemVariants}>
                                        <motion.button
                                            type="submit" disabled={isLoading || loginSuccess}
                                            className="flex w-full justify-center items-center rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 px-3 py-2.5 sm:py-3 text-sm duration-300 font-semibold leading-6 text-white shadow-md hover:from-sky-600 hover:to-sky-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all ease-in-out group"
                                            whileHover={{ scale: isLoading || loginSuccess ? 1 : 1.03, boxShadow: isLoading || loginSuccess ? 'none' : "0 8px 20px -3px rgba(2, 132, 199, 0.3), 0 4px 8px -2px rgba(2, 132, 199, 0.25)"}}
                                            whileTap={{ scale: isLoading || loginSuccess ? 1 : 0.98, y: isLoading || loginSuccess ? 0 : 1 }}
                                            transition={{ duration: 0.15, ease: "easeInOut" }}
                                        >
                                            <AnimatePresence mode="wait" initial={false}>
                                                {isLoading ? (
                                                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration: 0.1}} className="flex items-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Anmelden...</motion.span>
                                                ) : (
                                                    <motion.span key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration: 0.1}} className="flex items-center"><ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 transform transition-transform duration-200 ease-in-out group-hover:translate-x-1" />Anmelden</motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    </motion.div>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-message" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20, transition: {duration: 0.2} }}
                                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                                className="mt-6 py-4 text-center"
                            >
                                <div className="inline-flex items-center justify-center p-3 bg-green-600/25 text-green-200 rounded-lg shadow-lg border border-green-500/50">
                                    <CheckCircleIcon className="w-7 h-7 mr-2.5 text-green-400" />
                                    <p className="text-md font-semibold text-green-100">Login erfolgreich!</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.p variants={itemVariants} className="mt-8 text-center text-xs text-neutral-500">
                        {COMPANY_SUBTITLE}<br />&copy; {new Date().getFullYear()} {COMPANY_NAME}. Alle Rechte vorbehalten.
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
}