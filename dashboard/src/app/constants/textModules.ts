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
      { id: 'opening_formal_generic', text: "Sehr geehrte Damen und Herren, anbei erhalten Sie die angeforderte Auswertung der bei uns eingegangenen Meldungen." },
      { id: 'opening_formal_specific', text: "Sehr geehrte/r Anfragesteller/in, wie telefonisch besprochen übersenden wir Ihnen die detaillierte Analyse zum Sachverhalt." },
      { id: 'opening_internal_info', text: "Zur Information an die Fachabteilung: Anbei die Zusammenfassung der Vorkommnisse für den Berichtszeitraum." },
      { id: 'opening_case_ref_generic', text: "Bezugnehmend auf Ihre kürzlich erfolgte Anfrage haben wir die Ereignisse für den betreffenden Zeitraum analysiert." },
      { id: 'opening_proactive_general', text: "Anbei finden Sie eine proaktive Analyse der aktuellen Beschwerdelage im gesamten Liniennetz." },
      { id: 'opening_proactive_specific', text: "Anbei finden Sie eine proaktive Analyse der aktuellen Beschwerdelage für den Bereich des Schülerverkehrs." },
      { id: 'opening_follow_up', text: "In Fortführung unserer bisherigen Korrespondenz erhalten Sie nachfolgend den Abschlussbericht zu dem von Ihnen geschilderten Vorfall." },
      { id: 'opening_internal_management', text: "Für die Geschäftsführung: Aufbereitung der kundenrelevanten Ereignisse des letzten Quartals." },
      { id: 'opening_periodic_report', text: "Anbei der turnusmäßige Monats-/Quartals-/Jahresbericht zur Entwicklung der Kundenzufriedenheit." },
    ],
  },
  {
    category: "Daten & Methodik",
    modules: [
        { id: 'data_basis_bms', text: "Die nachfolgende Auswertung basiert auf den im Beschwerdemanagement-System (BMS) erfassten und klassifizierten Kundeneingaben." },
        { id: 'data_basis_bms_iv', text: "Die nachfolgende Auswertung basiert auf den im Beschwerdemanagement-System (BMS) erfassten Daten sowie den telemetrischen Aufzeichnungen unserer IT-Systeme (ITCS)." },
        { id: 'data_disclaimer_completeness', text: "Es wird darauf hingewiesen, dass die Datenlage auf den gemeldeten Vorfällen beruht und nicht zwangsläufig eine vollständige Abbildung des Betriebsgeschehens darstellt." },
        { id: 'data_scope_definition_date', text: "Die Analyse beschränkt sich auf den angegebenen Zeitraum und die spezifizierten Filterkriterien." },
        { id: 'data_cross_reference', text: "Die Kundeneingaben wurden mit den betrieblichen Daten (Fahrzeug- und Personaldisposition) abgeglichen." },
        { id: 'data_no_telemetry', text: "Für die betreffende Fahrt liegen aufgrund eines Übertragungsfehlers keine validen Telemetriedaten vor. Die Analyse stützt sich auf die Fahrermeldung und Kundenaussagen." },
        { id: 'data_anonymized', text: "Alle personenbezogenen Daten wurden gemäß der Datenschutz-Grundverordnung (DSGVO) für diese Auswertung anonymisiert." },
    ]
  },
  {
    category: "Bestätigung & Positives",
    modules: [
      { id: 'confirm_no_incidents_formal', text: "Nach eingehender Prüfung unserer betrieblichen Aufzeichnungen und der Kundeneingaben können wir bestätigen, dass für den angefragten Zeitraum und die spezifizierten Filter keine Beschwerden oder gemeldeten Störungen dokumentiert sind." },
      { id: 'confirm_no_incidents_direct', text: "Für den angefragten Vorfall liegen uns keine weiteren Meldungen oder betriebliche Abweichungen vor." },
      { id: 'confirm_punctuality_iv', text: "Die Analyse der Betriebsdaten aus unserem Intermodalen Transport-Control-System (ITCS) hat ergeben, dass die betreffende Fahrt pünktlich und ohne registrierte Abweichungen durchgeführt wurde." },
      { id: 'confirm_operation_correct', text: "Die betriebliche Untersuchung hat ergeben, dass die Haltestelle ordnungsgemäß bedient wurde und keine Fahrplanabweichungen vorlagen." },
      { id: 'confirm_staff_behavior_ok', text: "Die Befragung der Beteiligten ergab keine Hinweise auf ein Fehlverhalten unseres Personals. Der Sachverhalt wurde gemäß unserer Service-Richtlinien behandelt." },
      { id: 'confirm_no_defect_found', text: "Das Fahrzeug wurde in unserer Fachwerkstatt einer eingehenden technischen Prüfung unterzogen. Es konnten keine Mängel oder Defekte festgestellt werden." },
      { id: 'praise_forwarded_team', text: "Das von Ihnen übermittelte Lob haben wir mit großer Freude an das betreffende Team weitergeleitet." },
      { id: 'praise_forwarded_driver', text: "Wir haben dem/der betreffenden Fahrer/in Ihr positives Feedback persönlich übermittelt. Solche Rückmeldungen sind eine wichtige Motivation für unsere Mitarbeiter." },
      { id: 'praise_forwarded_servicepoint', text: "Ihr freundliches Feedback zu unserem Personal im Servicepunkt wurde an die Teamleitung zur internen Würdigung weitergegeben." },
      { id: 'praise_suggestion_implemented', text: "Wir bedanken uns für Ihre wertvolle Anregung. Wir freuen uns, Ihnen mitteilen zu können, dass diese bereits in unsere Planung für zukünftige Fahrplanperioden aufgenommen wurde." },
      { id: 'praise_suggestion_review', text: "Ihre Anregung wurde zur Prüfung an die zuständige Fachabteilung weitergeleitet. Wir schätzen Ihren Beitrag zur Verbesserung unseres Angebots sehr." },
      { id: 'praise_general_thanks', text: "Wir möchten uns für die positive Rückmeldung bedanken und freuen uns, dass Sie mit unserem Service zufrieden waren." },
    ],
  },
  {
    category: "Erklärung: Verspätung/Ausfall",
    modules: [
      { id: 'reason_traffic_jam', text: "Die festgestellte Verspätung ist auf ein außergewöhnlich hohes Verkehrsaufkommen im Stadtgebiet zurückzuführen." },
      { id: 'reason_road_closure', text: "Eine unvorhergesehene Straßensperrung durch Dritte (z.B. Polizei-/Feuerwehreinsatz) machte eine kurzfristige Umleitung erforderlich, was zu Folgeverspätungen führte." },
      { id: 'reason_construction', text: "Die Verspätungen stehen im Zusammenhang mit einer bekannten Baumaßnahme, die zu einer veränderten Verkehrsführung zwingt." },
      { id: 'reason_event', text: "Aufgrund einer Großveranstaltung kam es zu kurzfristigen und umfangreichen Sperrungen, die den Linienverkehr erheblich beeinträchtigten." },
      { id: 'reason_vehicle_defect_minor', text: "Eine geringfügige technische Störung am Fahrzeug (z.B. eine Türstörung) konnte vom Fahrpersonal vor Ort behoben werden, führte jedoch zu einer Ankunftsverzögerung." },
      { id: 'reason_vehicle_defect_major', text: "Ein schwerwiegender technischer Defekt am Fahrzeug erforderte einen Austausch des Busses, was zu einem Ausfall der betreffenden Fahrt führte." },
      { id: 'reason_staff_shortage_unforeseen', text: "Ein kurzfristiger, unvorhergesehener Personalausfall (Krankheit) führte bedauerlicherweise zur Stornierung der Fahrt, da kein Ersatzpersonal rechtzeitig verfügbar war." },
      { id: 'reason_accident_own', text: "Das Fahrzeug war in einen leichten Verkehrsunfall verwickelt. Die polizeiliche Unfallaufnahme führte zu einem längeren Stillstand." },
      { id: 'reason_accident_third_party', text: "Ein Verkehrsunfall auf der Linienstrecke, an dem unser Fahrzeug nicht beteiligt war, verursachte eine Vollsperrung und die daraus resultierende Verspätung." },
      { id: 'reason_weather', text: "Extreme Witterungsbedingungen (z.B. Schneefall, Glatteis) führten zu einer allgemeinen Verlangsamung des Verkehrs und somit zu betrieblichen Abweichungen." },
      { id: 'reason_connection_missed', text: "Aufgrund einer vorangegangenen Verspätung einer anderen Linie/eines anderen Verkehrsunternehmens konnte der angefragte Anschluss leider nicht mehr gewährleistet werden." },
      { id: 'reason_boarding_delay', text: "Ein verlängerter Fahrgastwechsel an einer vorangegangenen Haltestelle, u.a. durch die Sicherung eines Rollstuhls, führte zu der initialen Verspätung." },
      { id: 'reason_vandalism', text: "Eine starke Verunreinigung bzw. Vandalismus im Fahrzeug machte eine sofortige außerplanmäßige Reinigung erforderlich, was den Betriebsablauf störte." },
      { id: 'reason_medical_emergency', text: "Ein medizinischer Notfall eines Fahrgastes im Fahrzeug erforderte den sofortigen Einsatz von Rettungskräften und führte zu einem längeren, unplanmäßigen Halt." },
      { id: 'reason_passenger_aggression', text: "Ein Vorfall mit einem aggressiven Fahrgast machte das Hinzurufen der Polizei erforderlich, wodurch die Weiterfahrt verzögert wurde." },
    ],
  },
  {
    category: "Erklärung: Sonstige Vorfälle",
    modules: [
        { id: 'reason_driver_behavior_misunderstanding', text: "Nach Rücksprache mit unserem Fahrpersonal lässt sich der Vorfall auf ein Missverständnis in der Kommunikation zurückführen. Wir bedauern die entstandenen Irritationen." },
        { id: 'reason_driver_behavior_investigation', text: "Wir nehmen die Schilderung zum Fahrverhalten sehr ernst. Es wurde eine interne Prüfung des Vorfalls eingeleitet, um den Sachverhalt vollständig aufzuklären." },
        { id: 'reason_driver_justified_action', text: "Die Untersuchung ergab, dass das Verhalten unseres Fahrpersonals der Situation angemessen war und den betrieblichen Vorschriften entsprach." },
        { id: 'reason_cleanliness', text: "Wir bedauern die von Ihnen geschilderten Mängel in der Sauberkeit. Unsere Reinigungsintervalle für die betroffene Linie wurden bereits überprüft und angepasst." },
        { id: 'reason_cleanliness_incident', text: "Die Verunreinigung wurde durch einen Fahrgast während der Fahrt verursacht und konnte vom Fahrpersonal erst an der Endhaltestelle beseitigt werden." },
        { id: 'reason_overcrowding', text: "Die hohe Auslastung zu Spitzenzeiten ist uns bekannt. Wir prüfen kontinuierlich Möglichkeiten, durch den Einsatz von Verstärkerfahrten oder größeren Fahrzeugen Abhilfe zu schaffen." },
        { id: 'reason_info_missing_display', text: "Der Ausfall der Fahrgastinformationsanzeige im Fahrzeug ist auf einen technischen Defekt zurückzuführen, der bereits gemeldet wurde." },
        { id: 'reason_info_missing_app', text: "Aufgrund einer Störung bei der Datenübertragung wurden die Echtzeit-Daten in unserer App kurzzeitig nicht korrekt dargestellt. Der Fehler wurde inzwischen behoben." },
        { id: 'reason_ticket_machine_defect', text: "Der gemeldete Defekt am Fahrkartenautomaten wurde umgehend an unseren Servicepartner zur Behebung weitergeleitet." },
        { id: 'reason_air_condition_defect', text: "Wir bedauern, dass die Klimaanlage im Fahrzeug nicht ordnungsgemäß funktionierte. Das Fahrzeug wurde zur Überprüfung in die Werkstatt eingewiesen." },
        { id: 'reason_stop_skipped_unauthorized', text: "Die Untersuchung ergab, dass die Haltestelle fälschlicherweise nicht bedient wurde. Wir haben entsprechende betriebliche Maßnahmen ergriffen, um dies zukünftig zu unterbinden." },
        { id: 'reason_stop_skipped_construction', text: "Die Haltestelle konnte aufgrund einer kurzfristig eingerichteten Baustelle nicht angefahren werden. Eine Ersatzhaltestelle war leider nicht zeitnah einrichtbar." },
        { id: 'reason_stop_skipped_safety', text: "Die Sicherheit unserer Fahrgäste hat oberste Priorität. Die Haltestelle konnte aufgrund einer Gefahrensituation (z.B. Falschparker) nicht sicher angefahren werden." },
    ]
  },
  {
    category: "Maßnahmen & Lösungen",
    modules: [
        { id: 'action_monitoring_line', text: "Wir haben die betroffene Linie unter besondere Beobachtung gestellt, um die Pünktlichkeit zukünftig sicherzustellen und bei Bedarf nachzusteuern." },
        { id: 'action_driver_briefing_general', text: "Es fand eine allgemeine Sensibilisierung des Fahrpersonals bezüglich der Einhaltung der Fahrpläne und des Serviceverhaltens statt." },
        { id: 'action_driver_talk', text: "Es wurde ein persönliches Gespräch mit dem/der betreffenden Fahrer/in geführt, um den Sachverhalt aufzuarbeiten und zukünftige Vorkommnisse dieser Art zu vermeiden." },
        { id: 'action_cleaning_intensified', text: "Die Reinigungszyklen für die eingesetzten Fahrzeuge auf dieser Linie wurden mit sofortiger Wirkung erhöht." },
        { id: 'action_workshop_check_done', text: "Das betreffende Fahrzeug wurde zur außerplanmäßigen technischen Überprüfung an unsere Fachwerkstatt übergeben. Es konnten keine Mängel festgestellt werden." },
        { id: 'action_workshop_check_repair', text: "Das betreffende Fahrzeug wurde in unserer Fachwerkstatt überprüft und der festgestellte Mangel wurde behoben." },
        { id: 'action_planning_review', text: "Der Vorfall wurde an die Verkehrsplanung übergeben, um eine mögliche Anpassung des Fahrplans zu prüfen." },
        { id: 'action_no_action_possible', text: "Da der Vorfall auf externe, von uns nicht beeinflussbare Faktoren zurückzuführen ist, sind unsererseits keine direkten betrieblichen Maßnahmen möglich." },
        { id: 'action_info_system_repair', text: "Die Störung im Informationssystem wurde an unsere technische Abteilung zur schnellstmöglichen Behebung übergeben." },
        { id: 'action_compensation_offered_goodwill', text: "Als Zeichen unseres Bedauerns haben wir dem Fahrgast eine Entschädigung auf Kulanzbasis angeboten." },
        { id: 'action_service_improvement', text: "Der Vorfall wurde zum Anlass genommen, unsere internen Serviceprozesse zu überprüfen und zu optimieren." },
        { id: 'action_security_concept_review', text: "Wir überprüfen in Zusammenarbeit mit unserem Sicherheitspersonal das Sicherheitskonzept für die betroffene Linie." },
    ],
  },
  {
    category: "Rechtliches & Tarife",
    modules: [
        { id: 'legal_refund_denied_no_claim', text: "Eine finanzielle Entschädigung ist laut unseren Beförderungsbedingungen in diesem Fall leider nicht vorgesehen, da kein Anspruch gemäß der Fahrgastrechte besteht." },
        { id: 'legal_refund_denied_force_majeure', text: "Da die Ursache des Vorfalls außerhalb unseres Einflussbereichs lag (höhere Gewalt), besteht kein Anspruch auf eine tarifliche Entschädigung." },
        { id: 'legal_goodwill_gesture_voucher', text: "Als Geste des Bedauerns und ohne Anerkennung einer Rechtspflicht werden wir Ihnen einen Gutschein für eine Tageskarte zukommen lassen." },
        { id: 'legal_refer_to_insurance', text: "Zur Klärung der Schadensersatzansprüche wurde der Vorgang an unsere Haftpflichtversicherung übergeben. Diese wird sich unaufgefordert mit Ihnen in Verbindung setzen." },
        { id: 'legal_data_privacy', text: "Aus datenschutzrechtlichen Gründen (DSGVO) können wir keine detaillierten Angaben zu unserem Personal oder anderen Fahrgästen machen." },
        { id: 'legal_fare_dispute', text: "Die Prüfung des Tarif-Sachverhalts hat ergeben, dass die Berechnung korrekt erfolgte. Eine Erstattung ist daher nicht möglich." },
        { id: 'legal_house_rules_violation', text: "Das Handeln unseres Personals entsprach den Beförderungsbedingungen, da der Fahrgast gegen die Hausordnung verstoßen hat." },
    ]
  },
  {
    category: "Abschluss & Grußformeln",
    modules: [
      { id: 'closing_apology_understanding', text: "Wir entschuldigen uns nochmals ausdrücklich für die entstandenen Unannehmlichkeiten und bedanken uns für Ihr Verständnis." },
      { id: 'closing_appreciation_service', text: "Wir bedanken uns für Ihren wertvollen Hinweis. Rückmeldungen wie Ihre sind essentiell, um unseren Service kontinuierlich zu verbessern." },
      { id: 'closing_formal_with_hope', text: "Wir hoffen, Ihnen mit dieser detaillierten Auswertung weitergeholfen zu haben und verbleiben mit freundlichen Grüßen." },
      { id: 'closing_informal_questions', text: "Bei weiteren Fragen stehen wir Ihnen selbstverständlich jederzeit zur Verfügung. Freundliche Grüße" },
      { id: 'closing_internal', text: "Ende der Auswertung. Zur weiteren Verwendung in der Abteilung." },
      { id: 'closing_final', text: "Für den Vorstand zur Kenntnisnahme." },
      { id: 'closing_no_further_action', text: "Wir betrachten diesen Vorgang von unserer Seite als abgeschlossen." },
      { id: 'closing_trust', text: "Wir hoffen, Sie trotz des Vorfalls auch zukünftig wieder als Fahrgast in unseren Fahrzeugen begrüßen zu dürfen." },
      { id: 'closing_wish_journey', text: "Wir wünschen Ihnen für die Zukunft allzeit gute Fahrt." },
      { id: 'closing_with_contact_generic', text: "Sollten Sie Rückfragen haben, zögern Sie bitte nicht, uns über die bekannten Kanäle zu kontaktieren." },
    ],
  },
];
