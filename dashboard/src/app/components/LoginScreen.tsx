"use client";

import { useState, FormEvent } from 'react';
import { motion, Transition as MotionTransition, MotionProps, AnimatePresence } from 'framer-motion';
import { UserIcon, LockClosedIcon, ArrowRightOnRectangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'; // CheckCircleIcon hinzugefügt
import { useAuth } from '../contexts/AuthContext'; // Passe den Pfad ggf. an
import { LOGIN_APP_NAME, COMPANY_NAME, COMPANY_SUBTITLE, LOGIN_API_ENDPOINT } from '../constants'; // Passe den Pfad ggf. an

interface LoginScreenProps {
  // keine Props mehr zwingend erforderlich
}

// --- BackgroundBlob Komponente (unverändert) ---
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
  const initialMotionValues: MotionProps['initial'] = {
    scale: 0.8,
    opacity: 0,
  };
  if (typeof animateProps === 'object' && animateProps !== null && !Array.isArray(animateProps)) {
    const target = animateProps as AnimatableXYProperties;
    if (target.x && Array.isArray(target.x) && typeof target.x[0] === 'number') {
      initialMotionValues.x = target.x[0];
    }
    if (target.y && Array.isArray(target.y) && typeof target.y[0] === 'number') {
      initialMotionValues.y = target.y[0];
    }
  }
  return (
    <motion.div
      className={`absolute rounded-full filter blur-3xl opacity-30 pointer-events-none ${className}`}
      initial={initialMotionValues}
      animate={animateProps}
      transition={transitionProps}
    />
  );
};
// --- Ende BackgroundBlob ---

export default function LoginScreen(/* props: LoginScreenProps */) {
  const [username, setUsernameState] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false); // Neuer State für Erfolgs-Feedback
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setLoginSuccess(false); // Zurücksetzen bei jedem neuen Versuch

    console.log("LoginScreen: Attempting login with (AuthContext version):", { username, password });

    try {
      const response = await fetch(LOGIN_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('LoginScreen: Login API call successful (AuthContext version). Response data:', responseData);
        setLoginSuccess(true); // Erfolgsstatus setzen

        // NEU: Verzögerung vor dem Aufruf der login() Funktion, um Animationen Zeit zu geben
        setTimeout(() => {
          login({ // AuthContext informieren
            userId: responseData.userId,
            username: responseData.username,
            name: responseData.name,
            nachname: responseData.nachname,
            isAdmin: responseData.isAdmin,
            token: responseData.token,
          });
          // setIsLoading(false) wird im finally-Block gehandhabt, aber der Button ist durch loginSuccess eh deaktiviert.
        }, 1800); // Verzögerung von 1.8 Sekunden (kann angepasst werden)

      } else {
        console.error('LoginScreen: Login API call failed (AuthContext version). Error data:', responseData);
        setError(responseData.error || responseData.details || 'Ein unbekannter Anmeldefehler ist aufgetreten.');
        setIsLoading(false); // Ladezustand bei Fehler direkt beenden
      }
    } catch (err) {
      console.error('LoginScreen: Network or fetch error during login (AuthContext version):', err);
      setError('Verbindung zum Server fehlgeschlagen oder Server antwortet nicht.');
      setIsLoading(false); // Ladezustand bei Fehler direkt beenden
    } finally {
      // setIsLoading(false) wird nun bei Fehler direkt gesetzt oder nach der Verzögerung bei Erfolg implizit durch den Komponentenwechsel.
      // Wenn der Login erfolgreich ist und die Verzögerung läuft, bleibt isLoading true, was ok ist, da der Button durch loginSuccess gesperrt ist.
      // Wenn die Komponente vor Ablauf des Timeouts unmounted wird (was sie wird), ist das auch ok.
      // Für den Fall, dass die Komponente NICHT unmounted würde, müsste setIsLoading hier nochmals aufgerufen werden.
      // Da aber ein Komponentenwechsel stattfindet, ist es hier weniger kritisch.
      // Um ganz sicher zu sein, könnte man es im Timeout auch noch setzen, aber der Button ist eh disabled.
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
    exit: {
        opacity: 0,
        y: -30,
        scale: 0.95,
        transition: {
            duration: 0.4, // Exit-Animation etwas verlängert, um die Erfolgsnachricht besser zu sehen
            ease: "easeIn",
        }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "circOut",
      },
    },
  };

  const errorShakeTransition = {
    x: {
      duration: 0.4,
      ease: "easeInOut",
    },
    opacity: { duration: 0.3 },
    y: { duration: 0.3 }
  };

  // Stagger-Delay für das Schlüssel-Icon, basierend auf cardVariants
  const keyIconEntryDelay = (cardVariants.visible.transition.staggerChildren || 0) + 0.1;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Blobs */}
      <BackgroundBlob
        className="w-[500px] h-[500px] bg-purple-600 -top-40 -left-40"
        animateProps={{ x: [-100, 50, -100], y: [-80, 30, -80], rotate: [0, 120, 0], scale: [0.9, 1.1, 0.9], opacity: [0.15, 0.35, 0.15]}}
        transitionProps={{ duration: 25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <BackgroundBlob
        className="w-[450px] h-[450px] bg-sky-600 -bottom-32 -right-32"
        animateProps={{ x: [80, -60, 80], y: [60, -40, 60], rotate: [0, -150, 0], scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2]}}
        transitionProps={{ duration: 30, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <BackgroundBlob
        className="w-[400px] h-[400px] bg-emerald-500 top-1/4 left-1/2 transform -translate-x-1/3 -translate-y-1/3"
        animateProps={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.15, 0.95, 1], opacity: [0.1, 0.25, 0.1]}}
        transitionProps={{ duration: 28, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />

      {/* Login Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-sm md:max-w-md relative z-10"
      >
        <div className="bg-slate-800/10 backdrop-blur-lg p-6 sm:p-8 md:p-10 rounded-xl shadow-2xl border border-slate-700/60">
          {/* Header Sektion */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-6 md:mb-8">
            {/* Schlüssel Icon mit konditionaler Animation */}
            <motion.div
              className={`p-3 rounded-full mb-3 w-16 h-16 sm:w-20 sm:h-20 flex justify-center items-center shadow-inner transition-colors duration-300 ease-out ${loginSuccess ? 'bg-green-600/30 shadow-lg shadow-green-500/40' : 'bg-sky-500/20'}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={loginSuccess
                ? { // Erfolgsanimation
                    scale: [1, 1.25, 1], // Etwas stärkeres Pulsieren für Erfolg
                    rotate: 360,    // Einmal drehen
                    opacity: 1,
                  }
                : { // Standard rhythmische Animation
                    scale: [1, 1.12, 1, 1.08, 1],
                    rotate: [0, 7, -4, 6, 0],
                    opacity: 1,
                  }
              }
              transition={loginSuccess
                ? { // Übergang für Erfolgsanimation
                    duration: 0.8, // Dauer der Erfolgsanimation
                    ease: 'circOut',
                    delay: 0.1, // Kleine Verzögerung, um den Farbwechsel zuerst sichtbar zu machen
                  }
                : { // Übergänge für initiales Erscheinen und rhythmische Animation
                    opacity: { duration: 0.5, ease: "easeOut", delay: keyIconEntryDelay },
                    scale: { delay: keyIconEntryDelay, duration: 3.0, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
                    rotate: { delay: keyIconEntryDelay, duration: 3.0, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
                  }
              }
            >
              <img src={'/key-solid.svg'} alt='Anmelde Icon' className="h-8 w-8 sm:h-10 sm:w-10 text-sky-400" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
              {LOGIN_APP_NAME}
            </h1>
            <p className="text-sm font-semibold text-neutral-300 mt-1.5">{COMPANY_NAME}</p>
          </motion.div>

          {/* Fehlermeldung (Shake-Animation) */}
          <AnimatePresence>
            {error && !loginSuccess && ( // Fehler nur anzeigen, wenn kein Erfolg
              <motion.div
                key="error-message"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0, x: [0, -7, 7, -5, 5, -2, 2, 0] }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                transition={errorShakeTransition}
                className="mb-4 p-3 bg-red-600/40 text-red-200 border border-red-500/70 rounded-lg text-sm shadow-md"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Formular oder Erfolgsmeldung */}
          <AnimatePresence mode="wait">
            {!loginSuccess ? (
              <motion.div key="login-form" exit={{opacity: 0, transition: {duration: 0.2}}}> {/* Key und sanfter Exit für das Formular */}
                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                  {/* Benutzername */}
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
                  {/* Passwort */}
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
                  {/* Submit Button */}
                  <motion.div variants={itemVariants}>
                    <motion.button
                      type="submit" disabled={isLoading || loginSuccess} // Button auch bei Erfolg deaktivieren
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
                key="success-message"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: {duration: 0.2} }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }} // Delay, damit das Formular zuerst ausblendet
                className="mt-6 py-4 text-center"
              >
                <div className="inline-flex items-center justify-center p-3 bg-green-600/25 text-green-200 rounded-lg shadow-lg border border-green-500/50">
                  <CheckCircleIcon className="w-7 h-7 mr-2.5 text-green-400" />
                  <p className="text-md font-semibold text-green-100">Login erfolgreich!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.p variants={itemVariants} className="mt-8 text-center text-xs text-neutral-500">
            {COMPANY_SUBTITLE}<br />&copy; {new Date().getFullYear()} {COMPANY_NAME}. Alle Rechte vorbehalten.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
