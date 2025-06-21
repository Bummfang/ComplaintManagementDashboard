// app/api/reports/generate/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';
// HINWEIS: Stelle sicher, dass 'zod' installiert ist (npm install zod)
import { z } from 'zod';
import { exec } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

// =================================================================================
//  1. DEFINITION & VALIDIERUNG DER EINGANGSDATEN
// =================================================================================

const reportComponentIdSchema = z.enum(['summary', 'timeline', 'reason_pie', 'hotspot_bars', 'details_table', 'no_incident_proof', 'feedback_type_pie', 'multi_year_overview', 'comparison_yoy']);

const reportConfigSchema = z.object({
    title: z.string().min(1, "Titel darf nicht leer sein."),
    dateRange: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
    }),
    filters: z.object({
        linie: z.string().optional(),
        haltestelle: z.string().optional(),
        reason: z.string().optional(),
    }),
    layout: z.array(reportComponentIdSchema),
    textBlocks: z.array(z.string()),
    config: z.object({
        multi_year_overview: z.object({
            years: z.number().int().min(1).max(10)
        }).optional(),
    }),
});

type ReportConfig = z.infer<typeof reportConfigSchema>;

const JWT_SECRET = process.env.JWT_SECRET;

// =================================================================================
//  2. DER API-ROUTEN-HANDLER (POST)
// =================================================================================

export async function POST(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();

    // --- Authentifizierung ---
    if (!JWT_SECRET) { return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 }); }
    try { jwt.verify(authHeader.split(' ')[1], JWT_SECRET); } catch (error) { return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }); }

    // --- Body validieren ---
    let reportConfig: ReportConfig;
    try {
        const body = await request.json();
        reportConfig = reportConfigSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) { return NextResponse.json({ error: "Ungültige Anfragedaten.", details: error.errors }, { status: 400 }); }
        return NextResponse.json({ error: "Fehler beim Parsen der Anfrage." }, { status: 400 });
    }

    // --- Hauptlogik ---
    let client: PoolClient | undefined;
    try {
        client = await getDbPool().connect();

        const { detailData } = await fetchDetailData(client, reportConfig);
        const { globalData } = await fetchGlobalData(client, reportConfig);
        const processedComponents = await processReportComponents(detailData, globalData, reportConfig);
        const latexSource = await generateLatexSource(reportConfig, processedComponents);
        const pdfBuffer = await compileLatexToPdf(latexSource);

        console.log(`[${requestTimestamp}] Bericht "${reportConfig.title}" erfolgreich generiert.`);

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(reportConfig.title.replace(/[^a-z0-9]/gi, '_'))}.pdf"`,
            },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Serverfehler bei der Berichterstellung.';
        console.error(`[${requestTimestamp}] Fehler bei der Berichterstellung:`, errorMessage, error);
        return NextResponse.json({ error: 'Fehler bei der Berichterstellung.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}


// =================================================================================
//  3. SKELETT-FUNKTIONEN (Morgen auszufüllen)
// =================================================================================

async function fetchDetailData(client: PoolClient, config: ReportConfig) {
    console.log("SKELETON: Fetching Detail Data with filters:", config.filters);
    const detailData = { beschwerden: [], lob: [], anregungen: [] };
    return { detailData };
}
async function fetchGlobalData(client: PoolClient, config: ReportConfig) {
    console.log("SKELETON: Fetching Global Data if needed...");
    const globalData = { allFeedbackTypes: [], multiYearCounts: [] };
    return { globalData };
}
async function processReportComponents(detailData: any, globalData: any, config: ReportConfig) {
    console.log("SKELETON: Processing report components...");
    return []; // Platzhalter
}

/**
 * Erstellt den finalen LaTeX-Source-String aus den aufbereiteten Daten.
 */
async function generateLatexSource(config: ReportConfig, processedComponents: any[]): Promise<string> {
    console.log("SKELETON: Generating LaTeX source code...");

    const title = config.title.replace(/[&%$#_{}]/g, '\\$&');
    // KORRIGIERT: Expliziter Typ für 'text' hinzugefügt.
    const textBlocksLatex = config.textBlocks.map((text: string) => text.replace(/[&%$#_{}]/g, '\\$&')).join('\\par\n');

    return `
        \\documentclass[a4paper]{article}
        \\usepackage[utf8]{inputenc}
        \\usepackage[T1]{fontenc}
        \\usepackage{graphicx}
        \\usepackage{pgfplots}
        \\pgfplotsset{compat=1.17}

        \\title{${title}}
        \\author{Beschwerdemanagement-System}
        \\date{${new Date().toLocaleDateString('de-DE')}}

        \\begin{document}
        \\maketitle

        \\section*{Anmerkungen}
        ${textBlocksLatex}
        
        % Hier folgt der Code für die visuellen Komponenten...

        \\end{document}
    `;
}

/**
 * Nutzt eine auf dem Server installierte LaTeX-Distribution, um aus dem Source-Code ein PDF zu machen.
 */
async function compileLatexToPdf(latexSource: string): Promise<Buffer> {
    console.log("SKELETON: Compiling LaTeX to PDF...");

    const uniqueId = crypto.randomUUID();
    const tmpDir = os.tmpdir();
    const texFilePath = path.join(tmpDir, `${uniqueId}.tex`);
    const pdfFilePath = path.join(tmpDir, `${uniqueId}.pdf`);

    try {
        await writeFile(texFilePath, latexSource, 'utf-8');

        await new Promise<void>((resolve, reject) => {
            exec(
                `pdflatex -interaction=nonstopmode -output-directory=${tmpDir} ${texFilePath}`,
                (error, stdout, stderr) => {
                    // KORRIGIERT: Sicherer Umgang mit dem potenziell null-wertigen 'error'-Objekt.
                    if (error) {
                        console.error('LaTeX Compilation Error:', stderr);
                        // Erstellen eines neuen Error-Objekts für eine konsistente Fehlerbehandlung.
                        return reject(new Error(`LaTeX-Fehler: ${stderr || error.message}`));
                    }
                    resolve();
                }
            );
        });

        const pdfBuffer = await readFile(pdfFilePath);
        return pdfBuffer;

    } catch (error) {
        console.error("Fehler im PDF-Kompilierungsprozess:", error);
        // Stellt sicher, dass immer ein Error-Objekt für eine konsistente Fehlerbehandlung geworfen wird.
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unbekannter Fehler bei der PDF-Kompilierung.');
    } finally {
        // Aufräumen: temporäre Dateien löschen.
        await unlink(texFilePath).catch(() => { });
        await unlink(pdfFilePath).catch(() => { });
        await unlink(path.join(tmpDir, `${uniqueId}.log`)).catch(() => { });
        await unlink(path.join(tmpDir, `${uniqueId}.aux`)).catch(() => { });
    }
}
