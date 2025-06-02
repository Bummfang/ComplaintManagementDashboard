// app/components/LockScreen.tsx
"use client";

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Transition as MotionTransition, MotionProps } from 'framer-motion';
import { LockClosedIcon as PasswordIcon, PowerIcon, KeyIcon as UnlockIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { COMPANY_NAME } from '../constants';

// BackgroundBlob-Komponente (wie von dir bereitgestellt)
interface BackgroundBlobProps {
    className: string;
    animateProps: MotionProps['animate'];
    transitionProps: MotionTransition;
}
type AnimatableXYProperties = {
    x?: string | number | string[] | number[];
    y?: string | number | string[] | number[];
};
const BackgroundBlob = ({ className, animateProps, transitionProps }: BackgroundBlobProps) => {
    const initialMotionValues: MotionProps['initial'] = { scale: 0.8, opacity: 0, };
    if (typeof animateProps === 'object' && animateProps !== null && !Array.isArray(animateProps)) {
        const target = animateProps as AnimatableXYProperties;
        if (target.x && Array.isArray(target.x) && typeof target.x[0] === 'number') { initialMotionValues.x = target.x[0]; }
        if (target.y && Array.isArray(target.y) && typeof target.y[0] === 'number') { initialMotionValues.y = target.y[0]; }
    }
    return (<motion.div className={`absolute rounded-full filter blur-3xl opacity-10 md:opacity-15 pointer-events-none ${className}`} initial={initialMotionValues} animate={animateProps} transition={transitionProps} />);
};


export default function LockScreen() {
    // console.log("[LockScreen] Component RENDER ATTEMPT.");
    const { user, setIsScreenLocked, token, logout } = useAuth(); // token wird für den API-Aufruf benötigt
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockSuccessAnim, setUnlockSuccessAnim] = useState(false);

    const passwordInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (passwordInputRef.current && !unlockSuccessAnim) {
            passwordInputRef.current.focus();
        }
    }, [unlockSuccessAnim]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (unlockSuccessAnim || isUnlocking) return;

        if (!password.trim()) {
            setError("Bitte geben Sie Ihr Passwort ein.");
            return;
        }
        setIsUnlocking(true); // Beginnt den Entsperr-Vorgang (Button-Spinner etc.)
        setError(null);

        console.log("[LockScreen] Attempting unlock. Calling API /api/auth/verify-password");

        try {
            // ECHTER API-AUFRUF
            const response = await fetch('/api/auth/verify-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Token aus useAuth()
                },
                body: JSON.stringify({ password: password }), // Das eingegebene Passwort senden
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                console.log("[LockScreen] Password verified successfully by API. Starting success animation.");
                setUnlockSuccessAnim(true); // Starte die Schlüssel-Erfolgsanimation

                // Warte, bis die Schlüssel-Animation abgespielt wurde, dann entsperre den Bildschirm
                setTimeout(() => {
                    setIsScreenLocked(false);
                }, 800); // Diese Dauer sollte zur Erfolgsanimation passen (z.B. 0.8s)
            } else {
                console.error("[LockScreen] Password verification failed. API response:", responseData);
                setError(responseData.error || "Das eingegebene Passwort ist nicht korrekt oder ein Fehler ist aufgetreten.");
                setPassword('');
                setIsUnlocking(false); // Entsperr-Vorgang beenden (Spinner weg)
                if (passwordInputRef.current) {
                    passwordInputRef.current.focus(); // Fokus zurück aufs Feld
                }
            }
        } catch (err) {
            console.error("[LockScreen] Network or other error during password verification:", err);
            setError("Ein Netzwerkfehler oder ein anderer Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
            setPassword('');
            setIsUnlocking(false);
            if (passwordInputRef.current) {
                passwordInputRef.current.focus();
            }
        }
        // setIsUnlocking wird jetzt explizit im Erfolgsfall (durch unmount oder timeout) oder im Fehlerfall gehandhabt
    };







    const screenVariants = {
        hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
        visible: { opacity: 1, backdropFilter: 'blur(16px)', transition: { duration: 0.4, ease: "circOut" } },
        exit: {
            opacity: 0,
            backdropFilter: 'blur(0px)',
            transition: { duration: 0.3, ease: "circIn", delay: unlockSuccessAnim ? 0.7 : 0 } // Längere Verzögerung, damit Schlüsselanimation fertig ist
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 40, scale: 0.9 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { delay: 0.15, duration: 0.5, ease: "easeOut" } },
    };

    const keyIconAnimateProps = unlockSuccessAnim
        ? { scale: [1, 1.25, 1], rotate: 360, opacity: 1 }
        : { scale: [1, 1.08, 1], rotate: [0, 4, -4, 0], opacity: 1 };


    const keyIconTransitionProps = unlockSuccessAnim
        ? { duration: 0.8, ease: 'circOut', delay: 0.1 } // Angepasste Erfolgs-Transition
        : {
            scale: { duration: 2.2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror", delay: 0.2 },
            rotate: { duration: 2.2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror", delay: 0.2 }
        };


    const handleLogoutFromLockScreen = () => {
        logout(); 
    };






    
    return (
        <motion.div
            key="lockscreen-overlay-main"
            variants={screenVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-slate-900/75 flex flex-col items-center justify-center z-[1000] p-4"
        >
            <BackgroundBlob className="w-[600px] h-[600px] bg-sky-700/80 -top-1/3 -left-1/3" animateProps={{ x: [-150, 70, -150], y: [-100, 50, -100], rotate: [0, -100, 0], scale: [0.9, 1.2, 0.9] }} transitionProps={{ duration: 40, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
            <BackgroundBlob className="w-[550px] h-[550px] bg-purple-600/80 -bottom-1/3 -right-1/3" animateProps={{ x: [100, -70, 100], y: [80, -50, 80], rotate: [0, 130, 0], scale: [1, 1.1, 1] }} transitionProps={{ duration: 35, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />

            <motion.div
                variants={cardVariants}
                className="w-full max-w-sm md:max-w-md relative z-20 bg-slate-800/60 backdrop-blur-xl p-6 sm:p-10 rounded-2xl shadow-2xl border border-slate-700/70"
            >
                <div className="flex flex-col items-center mb-6 md:mb-8">
                    <motion.div
                        className={`p-3 rounded-full mb-4 w-20 h-20 flex justify-center items-center shadow-inner transition-colors ease-out ${unlockSuccessAnim
                            ? 'bg-green-500/40 shadow-lg shadow-green-500/60 duration-300'
                            : 'bg-sky-500/20 duration-1000'
                            }`}
                        animate={keyIconAnimateProps}
                        transition={keyIconTransitionProps}
                    >
                        <Image
                            src={'/key-solid.svg'}
                            alt='Sperr-Icon'
                            width={48} height={48}
                            className={`transition-colors duration-300 ${unlockSuccessAnim ? 'text-green-300' : 'text-sky-300'}`}
                        />
                    </motion.div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-sky-400">
                        Bildschirm gesperrt
                    </h1>
                    {user && (
                        <p className="text-sm text-slate-400 mt-2">
                            Für: <span className="font-semibold text-slate-200">{user.name} {user.nachname}</span>
                        </p>
                    )}
                </div>

                <AnimatePresence>
                    {error && !unlockSuccessAnim && (
                        <motion.div
                            key="lock-error"
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="mb-4 p-3 bg-red-600/40 text-red-200 border border-red-500/70 rounded-lg text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {!unlockSuccessAnim ? (
                        <motion.form
                            key="lock-input-form"
                            onSubmit={handleSubmit}
                            className="space-y-6"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.3 } }}
                            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                        >
                            <div>
                                <label htmlFor="lockscreen_password_input" className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5">
                                    Passwort zum Entsperren
                                </label>
                                <div className="relative group">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                        <PasswordIcon className="h-5 w-5 text-neutral-400 group-focus-within:text-sky-400 transition-colors" />
                                    </div>
                                    <input
                                        ref={passwordInputRef}
                                        id="lockscreen_password_input"
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                                        disabled={isUnlocking}
                                        className="block w-full rounded-lg border-0 bg-slate-700/50 py-3 pl-11 pr-3 text-neutral-100 shadow-sm ring-1 ring-inset ring-slate-600/80 placeholder:text-neutral-400 focus:bg-slate-700/70 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm transition-all"
                                        placeholder="Ihr Passwort"
                                    />
                                </div>
                            </div>

                            <div>
                                <motion.button
                                    type="submit"
                                    disabled={isUnlocking}
                                    className="flex w-full justify-center items-center rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 px-3 py-3 text-sm font-semibold text-white shadow-md hover:from-sky-600 hover:to-emerald-600 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60 transition-all group"
                                    whileHover={{ scale: isUnlocking ? 1 : 1.03 }}
                                    whileTap={{ scale: isUnlocking ? 1 : 0.98 }}
                                >
                                    {isUnlocking && !unlockSuccessAnim ? (
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <UnlockIcon className="h-5 w-5 mr-2 transform transition-transform group-hover:scale-110" />
                                    )}
                                    {isUnlocking && !unlockSuccessAnim ? 'Prüfe...' : 'Entsperren'}
                                </motion.button>
                            </div>
                            <div>
                                <motion.button
                                    type="button" // Wichtig: type="button", damit das Formular nicht gesendet wird
                                    onClick={handleLogoutFromLockScreen}
                                    disabled={isUnlocking} // Auch deaktivieren, während eine Entsperraktion läuft
                                    className="flex w-full justify-center items-center rounded-lg bg-slate-600/70 hover:bg-slate-500/90 px-3 py-2.5 text-xs font-medium text-slate-200 shadow-sm hover:shadow transition-all group disabled:opacity-60"
                                    whileHover={{ scale: isUnlocking ? 1 : 1.02 }}
                                    whileTap={{ scale: isUnlocking ? 1 : 0.98 }}
                                >
                                    <PowerIcon className="h-4 w-4 mr-2 opacity-80 group-hover:opacity-100 transition-opacity" />
                                    Abmelden
                                </motion.button>
                            </div>
                        </motion.form>
                    ) : (
                        <motion.div
                            key="unlock-success-placeholder"
                            className="h-[136px]"
                        />
                    )}
                </AnimatePresence>
                <p className="mt-8 text-center text-xs text-neutral-500">
                    &copy; {new Date().getFullYear()} {COMPANY_NAME}
                </p>
            </motion.div>
        </motion.div>
    );
}


