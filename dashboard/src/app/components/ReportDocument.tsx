// app/components/ReportDocument.tsx

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { ReportDataResponse } from '../types/reports';

// Definiere die Styles für das PDF-Dokument (ähnlich wie CSS-in-JS)
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    backgroundColor: '#ffffff',
    color: '#1e293b', // slate-800
  },
  header: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 30,
    color: '#64748b', // slate-500
  },
  block: {
    marginBottom: 25,
  },
  blockTitle: {
    fontSize: 14,
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a', // slate-900
    borderBottom: '1px solid #e2e8f0', // slate-200
    paddingBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottom: '1px solid #f1f5f9', // slate-100
  },
  listItemName: {
    flex: 3,
  },
  listItemValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f8fafc', // slate-50
    textAlign: 'center',
    justifyContent: 'center',
    color: '#94a3b8', // slate-400
    marginTop: 5,
  }
});

interface ReportDocumentProps {
  response: ReportDataResponse;
}

// Dies ist die Hauptkomponente, die das gesamte PDF beschreibt
export const ReportDocument = ({ response }: ReportDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>{response.reportTitle}</Text>
      <Text style={styles.subtitle}>
        Erstellt am: {new Date(response.generatedAt).toLocaleString('de-DE')}
      </Text>

      {response.results.map((result, index) => (
        <View key={index} style={styles.block} wrap={false}>
          <Text style={styles.blockTitle}>{result.blockRequest.title}</Text>
          
          {/* Je nach Block-Typ rendern wir unterschiedliche Inhalte */}
          {result.blockRequest.type === 'TOP_N_LIST' && (
            <View>
              {result.data.map((item: { name: string; count: number }, itemIndex: number) => (
                <View key={itemIndex} style={styles.listItem}>
                  <Text style={styles.listItemName}>{item.name}</Text>
                  <Text style={styles.listItemValue}>{item.count}</Text>
                </View>
              ))}
            </View>
          )}

          {result.blockRequest.type === 'TIME_SERIES' && (
             <View style={styles.chartPlaceholder}>
                <Text>(Hier wird im nächsten Schritt ein Diagramm erscheinen)</Text>
             </View>
          )}

        </View>
      ))}
    </Page>
  </Document>
);