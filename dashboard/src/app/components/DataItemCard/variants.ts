// app/components/DataItemCard/variants.ts
"use client";

import { Variants } from 'framer-motion';




/**
 * Variants for the main card container.
 * Controls the initial appearance, animation into view, and exit animation.
 */
export const cardContainerVariants: Variants = {
    hidden: { opacity: 0, y: 50, scale: 0.95, rotateX: -15, transformPerspective: 1000 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        transition: {
            type: "spring",
            stiffness: 120,
            damping: 20,
            staggerChildren: 0.07, // Stagger animation of child elements
            delayChildren: 0.1,   // Delay before children start animating
        }
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        y: 30,
        transition: { duration: 0.25, ease: "easeOut" }
    }
};




/**
 * Variants for individual content items within the card (e.g., text fields, sections).
 * Controls how each item animates into view.
 */
export const contentItemVariants: Variants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 180, damping: 22 }
    }
};






/**
 * Variants for the card flip animation (front to back and back to front).
 * Controls the rotation and opacity during the flip.
 */
export const flipCardVariants: Variants = {
    initial: (isFlipped: boolean) => ({
        rotateY: isFlipped ? 180 : 0, // Initial rotation based on flipped state
    }),
    animate: (isFlipped: boolean) => ({
        rotateY: isFlipped ? 180 : 0,
        transition: { duration: 0.5, ease: "easeInOut" },
    }),
    // No explicit exit variant needed here if flip is controlled by conditional rendering and AnimatePresence
};







/**
 * Variants for the content within a flipping card (e.g., front face, back face).
 * This ensures that the content correctly appears/disappears during the flip.
 * One side rotates from 0 to -90 (disappears), the other from 90 to 0 (appears).
 */
export const flipContentVariantsFront: Variants = {
    initial: { opacity: 1, rotateY: 0 }, // Start visible
    exit: { opacity: 0, rotateY: -90, transition: { duration: 0.25, ease: "easeIn" } }, // Rotate out
    animate: { opacity: 1, rotateY: 0, transition: { duration: 0.25, ease: "easeOut", delay: 0.25 } } // Rotate in (if re-entering)
};






export const flipContentVariantsBack: Variants = {
    initial: { opacity: 0, rotateY: 90 }, // Start rotated and hidden
    animate: { opacity: 1, rotateY: 0, transition: { duration: 0.25, ease: "easeOut", delay: 0.25 } }, // Rotate in
    exit: { opacity: 0, rotateY: 90, transition: { duration: 0.25, ease: "easeIn" } }, // Rotate out further
};





/**
 * Variants for error messages or validation feedback.
 */
export const feedbackMessageVariants: Variants = {
    hidden: { opacity: 0, y: -10, height: 0 },
    visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -5, height: 0, transition: { duration: 0.2, ease: "easeIn" } }
};





/**
 * Hover and tap animations for interactive elements like buttons.
 */
export const buttonHoverTapVariants = {
    hover: { scale: 1.05, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } },
    tap: { scale: 0.97, y: 0 }
};






export const iconButtonHoverTapVariants = {
    hover: { scale: 1.15, transition: { type: "spring", stiffness: 300, damping: 10 } },
    tap: { scale: 0.9 }
};

