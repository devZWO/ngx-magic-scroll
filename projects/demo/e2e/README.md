# E2E-Verhaltensvertrag

Die Tests prüfen die öffentlich sichtbare Demo-Bedienung, DOM-Geometrie und URL. Sie greifen nicht auf Angular-Komponenten oder interne Services zu. Bei der API-Vereinfachung bleiben diese Erwartungen bestehen; neue Funktionen erhalten zusätzliche Szenarien.

## Ausführen

```sh
pnpm run e2e:install
pnpm run e2e:install:deps
pnpm run e2e
```

Die Suite läuft in Chromium, Firefox und WebKit. Der Demo-Server verwendet standardmäßig Port 4200. Außerhalb von CI kann Playwright einen vorhandenen Server verwenden; dieser muss die aktuelle Library und Demo bereitstellen.

## Nachweise

- Dokument: URL-/Anker-Synchronisierung, erhaltene Query-Parameter und History, Präfixfilter ein/aus, Debounce mit virtueller Uhr, Mausrad und Tastatur, erster/letzter Anker und Scroll-Grenzen.
- Scroll-Service: tatsächliche Zwischenpositionen bei `smooth`, sofortiger Sprung bei `instant` auch trotz CSS `scroll-behavior: smooth`, CSS-abhängiges `auto`, Offsets und unveränderte äußere Scrollposition.
- Sichtbarkeitsregeln: vier Modi bei vollständiger Sichtbarkeit, jeweils einer sichtbaren Kante, Zielen ober-/unterhalb des Viewports und übergroßen Zielen mit beiden Kanten außerhalb. Überspringen und tatsächliche Bewegung werden getrennt geprüft.
- Navigation: Daten vor dem Rendern noch nicht verfügbar, initiale Restaurierung, Back/Forward, expliziter Rücklink, Reload, UI-Optionen und History, keine erneute initiale Restaurierung bei späterem Reload, Verlassen während des Ladens, fehlendes/unbekanntes Fragment, leere Liste und Fehler mit erfolgreicher Wiederholung.
- Resize: kontrollierte Verschiebung eines vorherigen Abschnitts mit ausgeschaltetem Browser-Scroll-Anchoring; der Anker ist vor dem Resize nachweislich verschoben und danach wieder ausgerichtet. Die Header-Demo prüft zusätzlich Vergrößern/Verkleinern des Headers und eine schmalere Darstellung.
- Material Drawer: Initialisierung, Detailnavigation, Pagination, Reload, Schließen/Öffnen, Scroll-Spy per Mausrad und Einfügen oberhalb des aktiven Ankers. Deaktivierte Restaurierung dient beim Einfügen als Gegenprobe.
- Master–Detail: separat scrollender Master und Dokument in beide Richtungen, dynamisch gemessener Header-Abstand, Restaurierung und aktive Navigation nach echtem Mausrad-Scrollen.

Alle Tests scheitern bei unbehandelten Browserfehlern und `console.error`. Container-Ausrichtung und Offsets erlauben weniger als zwei Pixel Abweichung, die gemessene Header-Ausrichtung weniger als drei Pixel. Diese kleinen Toleranzen berücksichtigen Container-Ränder und Browser-Rundung.

Die Sichtbarkeitsregel `always` entspricht dem derzeitigen Vertrag: Mindestens eine Elementkante muss sichtbar sein. Ein übergroßes Element, das den Viewport überdeckt, dessen beide Kanten aber außerhalb liegen, löst deshalb weiterhin Scrollen aus.

Die Header-Demo korrigiert bei Header-Größenänderungen zusätzlich selbst über einen `ResizeObserver`. Ihr Test beweist das Zusammenspiel; der unabhängige Navigationstest sichert die Library-Resize-Direktive ab. Die Suite ersetzt keine Unit-Tests und behauptet keine vollständige Prüfung aller möglichen Layouts oder zukünftiger Datenquellen.
