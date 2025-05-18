import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Deine Schriftart-Importe
import "./globals.css";

// Importiere den AuthProvider aus deiner AuthContext-Datei
// Dieser Pfad nimmt an, dass AuthContext.tsx in app/contexts/AuthContext.tsx liegt.
// Passe ihn an, falls deine Ordnerstruktur anders ist.
import { AuthProvider } from "./contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gorn Entwicklungsserver 49", // Du kannst dies später anpassen
  description: "Beschwerdemanagement Verwaltung Cottbusverkehr", // Du kannst dies später anpassen
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* AuthProvider um die {children} gelegt */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
