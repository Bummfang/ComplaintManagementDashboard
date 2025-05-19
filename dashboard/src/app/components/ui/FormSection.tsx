// app/components/ui/FormSection.tsx
"use client";

import { motion } from 'framer-motion';
import React, { ReactNode } from 'react';

interface FormSectionProps {
    title?: string;
    icon?: React.ElementType; // Typ für Icon-Komponenten
    children: ReactNode;
    htmlFor?: string; // Für die Verknüpfung des Labels mit einem Formularelement
    required?: boolean; // Zeigt an, ob das Feld/die Sektion als erforderlich markiert werden soll
    className?: string; // Zusätzliche Klassen für das motion.div
}

// Framer Motion Varianten für das Einblenden der Sektionsinhalte
// Diese waren ursprünglich in DataItemCard definiert.
const contentItemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.9 }, // Leichte Anpassung für sanfteren Effekt
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 160, damping: 20 } }
};

const FormSection: React.FC<FormSectionProps> = ({
    title,
    icon: Icon,
    children,
    htmlFor,
    required,
    className
}) => {
    return (
        <motion.div
            variants={contentItemVariants} // Animation beim Erscheinen
            className={`mb-5 last-of-type:mb-0 ${className || ''}`}
        >
            {title && (
                <div className="flex items-center mb-2">
                    {Icon && <Icon size={18} className="mr-2 text-slate-400 flex-shrink-0" />}
                    <label
                        htmlFor={htmlFor}
                        className="block text-sm font-semibold text-slate-200"
                    >
                        {title}
                        {required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                </div>
            )}
            {/* Optionaler Einzug, wenn ein Titel vorhanden ist, um die Kind-Elemente visuell zu gruppieren */}
            <div className={`${title ? 'pl-1' : ''}`}>
                {children}
            </div>
        </motion.div>
    );
};

export default FormSection;
