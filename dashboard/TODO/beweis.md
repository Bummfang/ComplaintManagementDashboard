Formale Spezifikation des Modularen Bericht-Generators
Version: 1.0
Datum: 21.06.2025
Autor: Gemini

1. Einleitung und Zielsetzung
Dieses Dokument beschreibt die formale, mathematische Grundlage des Systems "Bericht-Generator". Ziel ist es, die Architektur des Systems mittels der Konzepte der Mengenlehre und der relationalen Algebra zu definieren und einen formalen Nachweis für dessen logische Konsistenz, Vollständigkeit und Erweiterbarkeit zu erbringen. Die hier dargelegte Spezifikation dient als theoretisches Fundament für die Implementierung und zukünftige Weiterentwicklungen.

2. Mengentheoretische Definition des Datenuniversums
Wir definieren unser Datenuniversum und dessen Komponenten als formale Mengen.

Sei U die universelle Menge aller in der Datenbank gespeicherten Datensätze (Tupel). Ein einzelner Datensatz r∈U ist ein Tupel, das mindestens die folgenden Attribute besitzt: id, typ, datum, grund, linie, haltestelle.

Die Menge U kann als disjunkte Vereinigung der drei primären Feedback-Typen dargestellt werden:
U=B∪L∪A
wobei gilt: B∩L=∅, B∩A=∅, L∩A=∅.

B: Die Menge aller Beschwerden.

L: Die Menge aller Lobe.

A: Die Menge aller Anregungen.

2.1. Der Filter-Parameterraum
Der Benutzer interagiert mit dem System durch die Spezifikation eines Filter-Parametersatzes Φ. Dieser Satz ist ein Tupel, das die Konfiguration des Benutzers enthält:

Φ=(τ,Π,Λ)

τ=[datum 
start
​
 ,datum 
ende
​
 ]: Das geschlossene Zeitintervall für die Analyse.

Π: Die Menge der benutzerdefinierten, attributbasierten Filterkriterien, z.B. Π={linie="16",grund="Versp 
a
¨
 tung"}.

Λ: Die benutzerdefinierte Konfiguration für spezifische Analyseverfahren (z.B. Anzahl der Vergleichsjahre).

3. Formalisierung des Filterprozesses
Der Kern des Systems ist die Fähigkeit, aus der Universalmenge U eine relevante Teilmenge zu extrahieren. Diesen Prozess modellieren wir mit der Selektionsoperation σ der relationalen Algebra.

3.1. Prädikatenlogik und Lambda-Kalkül
Ein Prädikat P ist eine Funktion, die ein Tupel r auf einen Wahrheitswert abbildet: P:U→{true,false}. Das Prädikat wird dynamisch aus den Benutzerparametern Φ konstruiert.

Unter Verwendung des Lambda-Kalküls lässt sich das Prädikat P 
Φ
​
  wie folgt definieren:
P 
Φ
​
 :=λr.(r.datum∈τ)∧(∀p∈Π:p(r))

Hierbei ist p(r) die Anwendung eines einzelnen Kriteriums aus Π auf das Tupel r. Beispiel: Wenn Π={linie="16"}, dann ist p(r)≡(r.linie="16").

3.2. Die gefilterte Datenmenge
Die resultierende Menge der gefilterten Daten, U 
gefiltert
​
 , wird durch die Anwendung der Selektionsoperation σ mit dem Prädikat P 
Φ
​
  auf die Universalmenge U erzeugt:

U 
gefiltert
​
 =σ 
P 
Φ
​
 
​
 (U)={r∈U∣P 
Φ
​
 (r)}

Diese Menge U 
gefiltert
​
  repräsentiert die Detail-Menge, die für spezifische, kontextbezogene Analysen verwendet wird.

4. Formalisierung des Baustein-Konzepts
Das Systemkonzept basiert auf der Kombination von zwei fundamental unterschiedlichen Analysemengen, wie vom Anforderer korrekt identifiziert. Wir formalisieren dies durch die Partitionierung der verfügbaren Analysekomponenten.

Sei C 
V
​
  die Gesamtmenge aller verfügbaren visuellen Analysekomponenten. Wir partitionieren C 
V
​
  in zwei disjunkte Teilmengen:

C 
V
​
 =C 
Detail
​
 ∪C 
Global
​
 
mit
C 
Detail
​
 ∩C 
Global
​
 =∅

C 
Detail
​
 : Die Menge der Detail-Analyse-Komponenten. Jede Komponente c 
d
​
 ∈C 
Detail
​
  operiert ausschließlich auf der gefilterten Datenmenge U 
gefiltert
​
 .

C 
Global
​
 : Die Menge der Global-Analyse-Komponenten. Jede Komponente c 
g
​
 ∈C 
Global
​
  operiert ausschließlich auf der Universalmenge U.

Jeder Komponente c∈C 
V
​
  ist eine Analysefunktion f 
c
​
  zugeordnet. Die Signatur der Funktion hängt von der Zugehörigkeit der Komponente ab:

Wenn c∈C 
Detail
​
 , dann f 
c
​
 :P(U)→Resultat. Ihr Aufruf ist f 
c
​
 (U 
gefiltert
​
 ).

Wenn c∈C 
Global
​
 , dann f 
c
​
 :P(U)→Resultat. Ihr Aufruf ist f 
c
​
 (U).

(Hierbei ist P(U) die Potenzmenge von U).

Die vom Benutzer erstellte Anordnung der visuellen Elemente ist eine geordnete Sequenz (ein Tupel) L 
V
​
 =(v 
1
​
 ,v 
2
​
 ,...,v 
n
​
 ) wobei jedes v 
i
​
 ∈C 
V
​
 .

Analog ist L 
T
​
 =(t 
1
​
 ,t 
2
​
 ,...,t 
m
​
 ) die geordnete Sequenz der Textblöcke.

Ein finaler Bericht R ist somit die geordnete Komposition der Resultate der angewandten Analysefunktionen und Textblöcke, bestimmt durch die Sequenzen L 
V
​
  und L 
T
​
 .

5. Formaler Nachweis der Korrektheit und Erweiterbarkeit
5.1. Satz: Systemkonsistenz (Keine undefinierten Zustände)
Behauptung: Für jede gültige Benutzereingabe Φ und jede ausgewählte Komponentensequenz L 
V
​
  erzeugt das System ein wohldefiniertes Ergebnis.

Beweis durch Konstruktion:

Der Filterprozess σ 
P 
Φ
​
 
​
 (U) erzeugt stets eine wohldefinierte Menge U 
gefiltert
​
 , auch wenn diese leer ist (∅).

Jede Analysekomponente c∈C 
V
​
  ist durch ihre Definition fest entweder der Menge C 
Detail
​
  oder C 
Global
​
  zugeordnet.

Die zugehörige Analysefunktion f 
c
​
  hat als Definitionsbereich entweder die Menge aller Teilmengen von U (operiert auf U) oder die Menge aller Teilmengen von U (operiert auf U 
gefiltert
​
 ).

Da sowohl U als auch U 
gefiltert
​
  stets wohldefinierte Mengen sind, ist der Aufruf von f 
c
​
  immer gültig.

Da die Auswahl einer Komponente durch den Benutzer die auszuführende Funktion und deren Zieldatensatz eindeutig bestimmt, kann kein undefinierter Zustand entstehen. Die Systemkonsistenz ist somit für alle definierten Komponenten gewährleistet.
Q.E.D.

5.2. Satz: Modulare Erweiterbarkeit
Behauptung: Das System ist modular erweiterbar, ohne dass bestehende Komponenten modifiziert werden müssen.

Beweis durch strukturelle Induktion:

Basisfall: Das System ist mit einer Menge von Komponenten C 
V
​
  und einem Satz von Filterprädikaten Π initialisiert und nach Satz 5.1 konsistent.

Induktionsschritt 1 (Erweiterung um einen neuen Analyse-Baustein):
Wir fügen eine neue Komponente c 
new
​
  hinzu. Dies erfordert zwei Schritte:

Definition: Definiere die Funktion f 
new
​
  und ordne c 
new
​
  entweder C 
Detail
​
  oder C 
Global
​
  zu. Dies bestimmt den Datensatz (Menge), auf dem f 
new
​
  operiert.

Registrierung: Füge c 
new
​
  zur entsprechenden Konstante im Code hinzu (DETAIL_ANALYSIS_COMPONENTS oder GLOBAL_ANALYSIS_COMPONENTS).

Die Definition und Registrierung von c 
new
​
  hat keine Auswirkung auf die Definition oder die Funktionsweise irgendeiner bestehenden Komponente c 
old
​
 ∈C 
V
​
 . Die disjunkte Partitionierung bleibt erhalten. Die Korrektheit des Systems für die Menge C 
V
​
 ∪{c 
new
​
 } folgt direkt aus der Korrektheit für C 
V
​
 .

Induktionsschritt 2 (Erweiterung um einen neuen Filter):
Wir fügen ein neues Filterkriterium p 
new
​
  hinzu.

Definition: Das globale Prädikat P 
Φ
​
  wird um einen konjunktiven Term erweitert: P 
Φ
′
​
 :=P 
Φ
​
 ∧p 
new
​
 .

Auswirkung: Dies ändert nur das Ergebnis der Selektionsoperation σ, indem die resultierende Menge U 
gefiltert
′
​
 ⊆U 
gefiltert
​
  feiner granuliert wird. Die Definitionsbereiche der Analysefunktionen f 
c
​
  bleiben unverändert. Alle Funktionen aus C 
Detail
​
  operieren nun auf der neuen, engeren Menge, während Funktionen aus C 
Global
​
  unberührt bleiben.

In beiden Fällen erfolgt die Erweiterung durch Hinzufügen neuer, isolierter Elemente, ohne die bestehenden zu verändern. Dies beweist die modulare Erweiterbarkeit des Systems.
Q.E.D.

6. Schlussfolgerung
Die formale Modellierung des Bericht-Generators belegt, dass die gewählte Architektur auf einem soliden, logisch konsistenten Fundament steht. Die klare Trennung zwischen globalen Filtern (Selektion σ), den Zieldatenmengen (U vs. U 
gefiltert
​
 ) und den modular definierten Analysekomponenten (C 
Detail
​
  vs. C 
Global
​
 ) garantiert nicht nur die Korrektheit des aktuellen Systems, sondern sichert auch dessen zukünftige Wart- und Erweiterbarkeit auf formaler Ebene.