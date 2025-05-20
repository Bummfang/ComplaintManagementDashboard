# Doku DataItemCard 



---

## Detaillierte Erklärung und UML-relevante Informationen

### 1. `DataItemCard.tsx` (Hauptkomponente)

* **Zweck:** Stellt ein einzelnes Datenelement als interaktive, umdrehbare Karte dar. Verwaltet den Zustand der Karte (umgedreht, gesperrt), die Anzeige von Vorder- und Rückseite und die Interaktion mit Backend-Logik über Callbacks und Hooks.
* **UML-Aspekte (Konzeptuell):**
    * **Klasse:** `DataItemCard`
    * **Attribute (Props):** `item: CardSpecificDataItem`, `currentView: ViewType`, `copiedCellKey: string | null`, `onCopyToClipboard`, `onStatusChange`, `cardAccentsEnabled: boolean`, `onItemUpdate` (Interface: `DataItemCardProps`)
    * **Zustand (State):** `isFlipped: boolean`
    * **Wichtige Methoden/Handler:**
        * `handleSaveInternal()`: Speichert interne Details.
        * `handleCancelInternal()`: Verwirft Änderungen an internen Details.
        * `handleProtectedStatusChange()`: Ändert den Status des Items.
    * **Beziehungen:**
        * Verwendet (Komposition): `CardFront`, `CardBack`, `CardActions`.
        * Nutzt Hooks: `useAuth`, `useStatusLogic`, `useInternalDetails`, `useItemLocking`.
* **Funktionsweise:**
    * Orchestriert die Darstellung der Karten-Vorderseite (`CardFront`) und -Rückseite (`CardBack`).
    * Verwaltet den `isFlipped`-Zustand und `canFlip`-Logik.
    * Nutzt den `useAuth`-Hook für Benutzerdaten (relevant für Sperrfunktionen).
    * `useStatusLogic` liefert abgeleitete Werte für die Statusanzeige (Farben, Texte).
    * `useInternalDetails` kapselt die Formularlogik der `CardBack`.
    * `useItemLocking` managt den Sperrstatus und die Zuweisung zu einem Bearbeiter.
    * Callbacks (`onItemUpdate`, `onStatusChange`) leiten Änderungen an Elternkomponenten weiter.
    * `useEffect`-Hooks reagieren auf Item-Änderungen (z.B. um die Karte bei Bedarf neu zu sperren, wenn `action_required: "relock_ui"`).

---

### 2. `CardFront.tsx`

* **Zweck:** Stellt die primären Informationen eines Datenelements übersichtlich auf der Kartenvorderseite dar.
* **UML-Aspekte:**
    * **Klasse:** `CardFront`
    * **Attribute (Props):** `item`, `currentView`, `copiedCellKey`, `onCopyToClipboard`, `itemTypePrefix`, `abgeschlossenText`, `abgeschlossenValueClassName`, `isStatusRelevantView`, `statusDisplayClass`, `statusToDisplay` (Interface: `CardFrontProps`)
    * **Methoden (interne Logik):**
        * `isBeschwerde()`: Typschutzfunktion.
    * **Beziehungen:**
        * Verwendet (Komposition): `DataField`.
        * Nutzt Utils: `formatDateTime`, `formatDate`, `formatTime`.
* **Funktionsweise:**
    * Zeigt Basisdaten wie Betreff, ID, Name, E-Mail, Telefon, Erstellungsdatum, Bearbeiter, Status und Abschlussdatum an.
    * Für spezifische `currentView`-Typen (z.B. "beschwerden") werden zusätzliche Felder angezeigt.
    * Nutzt die `DataField`-Komponente für eine konsistente Darstellung und Kopierfunktionalität der einzelnen Datenpunkte.

---

### 3. `CardBack.tsx`

* **Zweck:** Ermöglicht die Bearbeitung interner Details eines Datenelements auf der Kartenrückseite.
* **UML-Aspekte:**
    * **Klasse:** `CardBack`
    * **Attribute (Props):** `internalDetails: InternalCardData`, `onDetailChange`, `onSave`, `onCancel`, `validationError: string | null`, `cardKey: string`, `isSubmitting?: boolean`, `isFinalized?: boolean` (Interface: `CardBackProps`)
    * **Interne Komponente:** `CustomCheckbox`.
    * **Beziehungen:**
        * Verwendet (Komposition): `FormSection`, `CustomCheckbox`.
* **Funktionsweise:**
    * Stellt ein Formular mit verschiedenen Eingabefeldern dar (allgemeine Notizen, Klärungsart via Radio-Buttons, optionale interne Vermerke via Checkboxen, Details zur Gelderstattung).
    * `CustomCheckbox` ist eine gestylte Wiederverwendung für Checkbox-Eingaben.
    * Nutzt `FormSection` zur visuellen Gliederung.
    * Zeigt Validierungsfehler an und bietet "Speichern"- sowie "Änderungen verwerfen"-Buttons.
    * Formularelemente können basierend auf `isSubmitting` oder `isFinalized` deaktiviert werden.

---

### 4. `CardActions.tsx`

* **Zweck:** Zeigt kontextabhängige Aktionsknöpfe und Interaktionselemente (Sperren, Einstellungen) für eine Karte an.
* **UML-Aspekte:**
    * **Klasse:** `CardActions`
    * **Attribute (Props):** `status`, `isLocked`, `canFlip`, `onStatusChange`, `onToggleLock`, `onFlip`, `shakeLockAnim`, `isAssigning`, `isClarificationMissingInSavedDetails`, `currentView` (Interface: `CardActionsProps`)
    * **Zustand (State):** `animateSettingsIcon`, `isSettingsIconHovered`, etc. (für UI-Hover-Effekte).
    * **Methoden (interne Logik):**
        * `handleMainActionButtonHover()`: Steuert bedingte Hover-Animationen.
* **Funktionsweise:**
    * Rendert dynamisch Hauptaktionsknöpfe basierend auf dem `status`-Prop (z.B. "Bearbeitung starten", "Gelöst", "Ablehnen").
    * Zeigt einen "Einstellungen"-Button (lö_st `onFlip` aus) und einen "Sperren/Entsperren"-Button (lö_st `onToggleLock` aus) an.
    * Die Funktionalität und das Aussehen der Buttons werden stark durch die übergebenen Props (`isLocked`, `isClarificationMissingInSavedDetails`, etc.) beeinflusst.
    * Nutzt `framer-motion` für ansprechende Animationen der interaktiven Elemente.

---

### 5. `ui/DataField.tsx`

* **Zweck:** Eine wiederverwendbare UI-Komponente zur Anzeige eines einzelnen Datenfeldes mit einem Label und einer optionalen Kopierfunktion.
* **UML-Aspekte:**
    * **Klasse:** `DataField`
    * **Attribute (Props):** `label`, `value`, `onCopy`, `isCopied`, `copyValue`, `fieldKey`, `valueClassName`, `icon`, `children` (Interface: `DataFieldProps`).
* **Funktionsweise:**
    * Zeigt ein Label und den dazugehörigen Wert an.
    * Bei Überfahren mit der Maus (Hover) erscheint ein Kopier-Icon, falls eine `onCopy`-Funktion bereitgestellt wurde, um den Wert in die Zwischenablage zu kopieren.
    * Kann ein Icon links neben dem Wert darstellen.

---

### 6. `ui/FormSection.tsx`

* **Zweck:** Strukturiert Formulare visuell in Sektionen, optional mit einem Titel und einem Icon.
* **UML-Aspekte:**
    * **Klasse:** `FormSection`
    * **Attribute (Props):** `title`, `icon`, `children`, `htmlFor`, `required`, `className` (Interface: `FormSectionProps`).
* **Funktionsweise:**
    * Rendert einen Titel und ein Icon (falls vorhanden) oberhalb des Inhalts (`children`).
    * Nutzt `framer-motion` für eine Einblendanimation der Sektion.

---

### 7. `hooks/useInternalDetails.ts`

* **Zweck:** Ein Custom Hook, der die Zustandsverwaltung und Validierungslogik für das Formular der internen Kartendetails (`CardBack`) kapselt.
* **UML-Aspekte:**
    * **Funktion (Hook):** `useInternalDetails`
    * **Parameter:** `initialData?: InternalCardData`
    * **Rückgabewert (Objekt):** `internalDetails`, `setInternalDetails`, `validationError`, `handleInternalDetailChange`, `validateAndPrepareSaveData`, `resetInternalDetails`, `clearValidationError`.
* **Funktionsweise:**
    * Verwaltet den `internalDetails`-Zustand des Formulars.
    * `handleInternalDetailChange`: Aktualisiert Felder und behandelt abhängige Logik (z.B. Zurücksetzen des Erstattungsbetrags, wenn "Geld erstattet" deaktiviert wird).
    * `validateAndPrepareSaveData`: Validiert die Eingaben (z.B. Klärungsart muss gewählt sein, Erstattungsbetrag muss gültig sein, falls "Geld erstattet" aktiv). Setzt bei Fehlern den `validationError`.
    * `resetInternalDetails`: Setzt das Formular zurück.
    * Ein `useEffect`-Hook synchronisiert den Zustand, wenn sich die `initialData` von außen ändern.

---

### 8. `hooks/useItemLocking.ts`

* **Zweck:** Ein Custom Hook, der den Sperrstatus eines Items verwaltet. Ermöglicht es einem Benutzer, das Item für sich zu "beanspruchen" (indem er als Bearbeiter zugewiesen wird) und gibt visuelles Feedback.
* **UML-Aspekte:**
    * **Funktion (Hook):** `useItemLocking`
    * **Parameter (Props-Objekt):** `item`, `initialLockedState`, `onItemUpdate`, `currentView` (Interface: `UseItemLockingProps`).
    * **Rückgabewert (Objekt):** `isLocked`, `setIsLocked`, `shakeLockAnim`, `handleToggleLock`, `triggerShakeLock`, `isAssigning`.
* **Funktionsweise:**
    * Verwendet den `useAuth`-Hook, um Benutzerinformationen und das Authentifizierungstoken zu erhalten.
    * `handleToggleLock`: Die zentrale Funktion. Sie aktualisiert den `isLocked`-Zustand optimistisch. Wenn ein Item entsperrt wird und noch kein Bearbeiter zugewiesen ist, wird ein API-Aufruf (`PATCH` an den Endpunkt aus `API_ENDPOINTS`) durchgeführt, um den aktuellen Benutzer als Bearbeiter zu setzen (mittels `assign_me_as_bearbeiter: true`). Informiert die Elternkomponente über `onItemUpdate`.
    * `triggerShakeLock`: Löst eine Schüttelanimation für das Schloss-Icon aus, z.B. wenn eine Aktion bei gesperrter Karte versucht wird.
    * Der `isAssigning`-Zustand signalisiert laufende API-Kommunikation.
    * Ein `useEffect`-Hook passt den `isLocked`-Zustand an, basierend auf Änderungen am `item` (z.B. `bearbeiter_id`, `status`, `action_required`) oder dem angemeldeten `user`.

---

### 9. `hooks/useStatusLogic.ts`

* **Zweck:** Ein Custom Hook, der die Logik zur Ableitung von Darstellungsattributen (wie Farben und Texten) basierend auf dem Status eines Items und der aktuellen Ansicht zentralisiert. Enthält auch exportierbare Utility-Funktionen.
* **UML-Aspekte:**
    * **Funktion (Hook):** `useStatusLogic`
    * **Parameter (Props-Objekt):** `item`, `currentView` (Interface: `UseStatusLogicProps`).
    * **Rückgabewert (Objekt):** `isStatusRelevantView`, `effectiveStatus`, `statusTextColorClass`, `cardBackgroundAccentClass`, `abgeschlossenText`, `abgeschlossenValueClassName`.
    * **Exportierte Utility-Funktionen:** `getStatusTextColorClass(status)`, `getCardBackgroundAccentClasses(status)`.
* **Funktionsweise:**
    * Ermittelt, ob für die aktuelle `ViewType` ein Status überhaupt relevant ist (`isStatusRelevantView`).
    * Leitet den `effectiveStatus` ab (ggf. mit "Offen" als Standard).
    * Berechnet dynamisch CSS-Klassen für Textfarben und Hintergrundakzente sowie Anzeigetexte für den Abschlussstatus.
    * Verwendet `useMemo` zur Performance-Optimierung der abgeleiteten Werte.

---

### 10. `constants.ts`

* **Zweck:** Dient als zentraler Speicherort für Applikations-Konstanten wie API-Endpunkte (`API_ENDPOINTS`), Titel für verschiedene Ansichten (`VIEW_TITLES`), Labels für Filter (`FILTER_LABELS`) und allgemeine Bezeichnungen.
* **Vorteil:** Vermeidet "Magic Strings/Values" im Code, erhöht die Lesbarkeit und vereinfacht Änderungen an diesen Werten.

---

### 11. `variants.ts`

* **Zweck:** Definiert und exportiert wiederverwendbare Animationsvarianten für `framer-motion`. Dies hält die Komponenten, die Animationen verwenden, sauberer und die Animationsdefinitionen zentralisiert.
* **Beispiele für Varianten:** `cardContainerVariants` (für das Erscheinen der Karte), `contentItemVariants` (für einzelne Elemente in der Karte), `flipContentVariantsFront` und `flipContentVariantsBack` (für die Umdrehanimation), `feedbackMessageVariants` (für Fehlermeldungen), `buttonHoverTapVariants` (für Button-Interaktionen).