// app/components/LoginScreen.tsx
"use client";

import { useState, FormEvent } from 'react';
import { motion, Transition as MotionTransition, MotionProps } from 'framer-motion';
import { UserIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

// Importiere den useAuth-Hook
import { useAuth } from '../contexts/AuthContext'; // Passe den Pfad ggf. an

// Importiere deine Konstanten
// Stelle sicher, dass LOGIN_API_ENDPOINT auf '/api/login' zeigt
import { LOGIN_APP_NAME, COMPANY_NAME, COMPANY_SUBTITLE, LOGIN_API_ENDPOINT } from '../constants'; // Passe den Pfad ggf. an

// LoginScreenProps wird nicht mehr benötigt oder kann leer sein, da onLoginSuccess entfernt wurde
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

// Die Komponente nimmt keine onLoginSuccess Prop mehr entgegen
export default function LoginScreen(/* props: LoginScreenProps */) {
  const [username, setUsernameState] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hole die login-Funktion aus dem AuthContext
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log("LoginScreen: Attempting login with (AuthContext version):", { username, password });

    try {
      // Stelle sicher, dass LOGIN_API_ENDPOINT auf deine korrekte Login-Route zeigt (z.B. '/api/login')
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

        // Rufe die login-Funktion aus dem AuthContext auf.
        // responseData sollte { userId, username, name?, nachname?, isAdmin, token } enthalten.
        login({
            userId: responseData.userId,
            username: responseData.username,
            name: responseData.name,
            nachname: responseData.nachname,
            isAdmin: responseData.isAdmin,
            token: responseData.token,
        });
        // Die Weiterleitung zur ContaintTable wird von app/page.tsx gehandhabt.
      } else {
        console.error('LoginScreen: Login API call failed (AuthContext version). Error data:', responseData);
        setError(responseData.error || responseData.details || 'Ein unbekannter Anmeldefehler ist aufgetreten.');
      }
    } catch (err) {
      console.error('LoginScreen: Network or fetch error during login (AuthContext version):', err);
      setError('Verbindung zum Server fehlgeschlagen oder Server antwortet nicht.');
    } finally {
      setIsLoading(false);
    }
  };

  // cardVariants und itemVariants (unverändert)
  const cardVariants = { /* ... */ };
  const itemVariants = { /* ... */ };

  // JSX-Struktur (unverändert)
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden relative">
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
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm md:max-w-md relative z-10"
      >
        <div className="bg-slate-800/10 backdrop-blur-lg p-6 sm:p-8 md:p-10 rounded-xl shadow-2xl border border-slate-700/60">
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-6 md:mb-8">
            <div className="p-3 bg-sky-500/20 rounded-full mb-3 w-16 h-16 sm:w-20 sm:h-20 flex justify-center items-center shadow-inner">
              <img src={'/key-solid.svg'} alt='Anmelde Icon' className="h-8 w-8 sm:h-10 sm:w-10 text-sky-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
              {LOGIN_APP_NAME}
            </h1>
            <p className="text-sm font-semibold text-neutral-300 mt-1.5">{COMPANY_NAME}</p>
          </motion.div>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mb-4 p-3 bg-red-600/40 text-red-200 border border-red-500/70 rounded-lg text-sm shadow-md"
            >
              {error}
            </motion.div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <motion.div variants={itemVariants}>
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
            <motion.div variants={itemVariants}>
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
              <button
                type="submit" disabled={isLoading}
                className="flex w-full justify-center items-center rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 px-3 py-2.5 sm:py-3 text-sm duration-300 font-semibold leading-6 text-white shadow-md hover:from-sky-600 hover:to-sky-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all ease-in-out group"
              >
                {isLoading ? (
                  <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Anmelden...</>
                ) : (
                  <><ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 transform transition-transform duration-200 ease-in-out group-hover:translate-x-1" />Anmelden</>
                )}
              </button>
            </motion.div>
          </form>
        </div>
        <motion.p variants={itemVariants} className="mt-8 text-center text-xs text-neutral-500">
          {COMPANY_SUBTITLE}<br />&copy; {new Date().getFullYear()} {COMPANY_NAME}. Alle Rechte vorbehalten.
        </motion.p>
      </motion.div>
    </div>
  );
}
