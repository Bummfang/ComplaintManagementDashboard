// app/components/LoadingScreen.tsx
"use client"; // Erforderlich für Framer Motion Hooks

import { motion, Transition as MotionTransition, MotionProps} from 'framer-motion';

// --- BackgroundBlob Komponente (Kann auch in eine separate UI-Datei ausgelagert werden) ---
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
  // Sicherstellen, dass animateProps ein Objekt ist, bevor auf x und y zugegriffen wird
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


const LoadingScreen = () => {
  const screenVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.2, // Elemente nacheinander einblenden
      },
    },
    exit: { // Sanftes Ausblenden, wenn die Komponente entfernt wird
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5, // Etwas längere Dauer für einen weicheren Effekt
        ease: "circOut",
      },
    },
  };

  // Varianten für den SVG Spinner Wrapper (pulsierende Skalierung/Opazität)
  const spinnerWrapperVariants = {
    initial: { scale: 0.9, opacity: 0.7 },
    animate: {
      scale: [0.95, 1.05, 0.95],
      opacity: [0.7, 1, 0.7],
      transition: {
        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
      },
    },
  };

  // Varianten für die animierten Punkte
  const dotVariants = (delay: number) => ({
    initial: { opacity: 0.3, y: 0 },
    animate: {
      opacity: [0.3, 1, 0.3],
      y: [0, -3, 0],
      transition: {
        duration: 1.0, // Dauer für einen Zyklus der Punkt-Animation
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay, // Individueller Delay für jeden Punkt
      },
    },
  });

  const loadingText = "Anwendung wird geladen";

  return (
    <motion.div
      key="loading-screen" // Wichtig für AnimatePresence, falls es in page.tsx verwendet wird
      className="min-h-screen w-full font-sans flex flex-col justify-center items-center bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white relative overflow-hidden"
      variants={screenVariants}
      initial="hidden"
      animate="visible"
      exit="exit" // Definiert das Verhalten beim Verlassen
    >
      {/* Hintergrund Blobs */}
      <BackgroundBlob
        className="w-[550px] h-[550px] bg-sky-700/80 -top-52 -left-60"
        animateProps={{ x: [-130, 60, -130], y: [-90, 40, -90], rotate: [0, -110, 0], scale: [0.9, 1.1, 0.9], opacity: [0.1, 0.25, 0.1]}}
        transitionProps={{ duration: 32, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <BackgroundBlob
        className="w-[500px] h-[500px] bg-emerald-600/70 -bottom-52 -right-52"
        animateProps={{ x: [90, -60, 90], y: [70, -40, 70], rotate: [0, 140, 0], scale: [1, 1.15, 1], opacity: [0.12, 0.3, 0.12]}}
        transitionProps={{ duration: 29, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <BackgroundBlob
        className="w-[400px] h-[400px] bg-purple-500/60 top-1/2 left-1/2 transform -translate-x-1/3 -translate-y-1/3" // Etwas versetzt
        animateProps={{ scale: [1, 1.08, 1], opacity: [0.08, 0.18, 0.08], x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
        transitionProps={{ duration: 25, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />

      <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center p-4">
        {/* Animierter SVG Spinner */}
        <motion.div
          variants={spinnerWrapperVariants}
          initial="initial" // Explizit setzen, falls itemVariants anders sind
          animate="animate"
          className="mb-7" // Etwas mehr Abstand
        >
          <svg className="animate-spin h-12 w-12 sm:h-16 sm:w-16 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5"></circle> {/* StrokeWidth angepasst */}
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </motion.div>

        {/* Ladetext mit animierten Punkten */}
        <motion.div variants={itemVariants} className="flex items-baseline"> {/* items-baseline für saubere Punkt-Ausrichtung */}
          <h2 className="text-xl sm:text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-emerald-300 to-purple-300">
            {loadingText}
          </h2>
          {/* Container für die Punkte, um AnimatePresence korrekt zu nutzen, falls sie ein/ausgeblendet werden sollen. Hier für Daueranimation. */}
          <div className="flex">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={`dot-${i}`}
                variants={dotVariants(i * 0.2)} // Übergibt den individuellen Delay
                initial="initial"
                animate="animate"
                className="text-xl sm:text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-emerald-300 to-purple-300 ml-0.5"
              >
                .
              </motion.span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;