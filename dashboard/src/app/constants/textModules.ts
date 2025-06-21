// app/constants/textModules.ts

export interface TextModule {
  id: string;
  text: string;
}

export interface TextModuleCategory {
  category: string;
  modules: readonly TextModule[];
}

export const REPORT_TEXT_MODULES: readonly TextModuleCategory[] = [
  {
    category: "Anrede & Einleitung",
    modules: [
      { id: 'opening_formal', text: "Sehr geehrte Damen und Herren, anbei erhalten Sie die angeforderte Auswertung der bei uns eingegangenen Meldungen." },
      { id: 'opening_informal', text: "Guten Tag, wie besprochen übersenden wir Ihnen die Zusammenfassung der relevanten Vorkommnisse." },
      { id: 'opening_case_specific', text: "Bezugnehmend auf Ihre Anfrage vom [DATUM] haben wir die Ereignisse für den betreffenden Zeitraum analysiert." },
    ],
  },
  {
    category: "Bestätigung & Positives",
    modules: [
      { id: 'confirm_no_incidents', text: "Nach eingehender Prüfung unserer Aufzeichnungen können wir bestätigen, dass für den angefragten Zeitraum und die spezifizierten Filter keine Beschwerden oder gemeldeten Störungen vorliegen." },
      { id: 'confirm_punctuality', text: "Die Analyse der Betriebsdaten hat ergeben, dass die betreffende Fahrt pünktlich und ohne registrierte Abweichungen durchgeführt wurde." },
      { id: 'praise_forwarded', text: "Das von Ihnen übermittelte Lob haben wir sehr gerne an die betreffenden Mitarbeiterinnen und Mitarbeiter weitergeleitet." },
    ],
  },
  {
    category: "Erklärungen & Begründungen (Negativ)",
    modules: [
      { id: 'delay_traffic', text: "Die festgestellten Verspätungen sind auf ein außergewöhnlich hohes Verkehrsaufkommen im Stadtgebiet zurückzuführen." },
      { id: 'delay_event', text: "Aufgrund einer unvorhergesehenen Großveranstaltung kam es zu kurzfristigen Straßensperrungen, die den Linienverkehr beeinträchtigten." },
      { id: 'delay_technical', text: "Eine technische Störung am Fahrzeug erforderte einen außerplanmäßigen Werkstattaufenthalt, was zu Folgeverspätungen führte." },
      { id: 'cancellation_technical', text: "Der Ausfall der Fahrt war auf einen technischen Defekt zurückzuführen, der kurzfristig nicht behoben werden konnte." },
      { id: 'cancellation_staff_shortage', text: "Ein kurzfristiger, unvorhergesehener Personalausfall führte bedauerlicherweise zur Stornierung der Fahrt." },
      { id: 'cleanliness_issue', text: "Wir bedauern die von Ihnen geschilderten Mängel in der Sauberkeit. Unsere Reinigungsintervalle wurden bereits überprüft und angepasst." },
    ],
  },
  {
    category: "Maßnahmen & Lösungen",
    modules: [
        { id: 'action_monitoring', text: "Wir haben die betroffene Linie unter besondere Beobachtung gestellt, um die Pünktlichkeit zukünftig sicherzustellen." },
        { id: 'action_driver_briefing', text: "Es fand eine Sensibilisierung des Fahrpersonals bezüglich der Einhaltung der Fahrpläne und des Serviceverhaltens statt." },
        { id: 'action_cleaning_intensified', text: "Die Reinigungszyklen für die eingesetzten Fahrzeuge wurden mit sofortiger Wirkung erhöht." },
        { id: 'action_workshop_check', text: "Das betreffende Fahrzeug wurde zur technischen Überprüfung an unsere Fachwerkstatt übergeben." },
    ],
  },
  {
    category: "Abschluss & Grußformeln",
    modules: [
      { id: 'closing_apology', text: "Wir entschuldigen uns für die entstandenen Unannehmlichkeiten und bedanken uns für Ihr Verständnis." },
      { id: 'closing_appreciation', text: "Wir bedanken uns für Ihren wertvollen Hinweis, der uns hilft, unseren Service stetig zu verbessern." },
      { id: 'closing_formal', text: "Wir hoffen, Ihnen mit dieser Auswertung weitergeholfen zu haben. Mit freundlichen Grüßen" },
      { id: 'closing_informal', text: "Bei weiteren Fragen stehen wir Ihnen jederzeit zur Verfügung. Freundliche Grüße" },
    ],
  },
];
