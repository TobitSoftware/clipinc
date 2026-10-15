# Aufnahme in Chrome auf macOS prüfen

## Änderungen dieser Reparatur

- Pro Song ein eigener Encoder: Ein fertiger Song beendet nicht mehr den Worker des nächsten Songs.
- AudioWorklet liefert noch ausstehende Samples vor dem Abschluss; Mono wird als Stereo weitergegeben.
- Doppelte Startsignale werden anhand der Titelkennung zusammengeführt. Zusätzlich wird der sichtbare Player alle 250 ms auf Titelwechsel geprüft.
- Die Aufnahme und Titelzuordnung liegen in der Offscreen-Seite. Der Service Worker registriert seine Nachrichtenempfänger direkt beim Start.
- Downloads laufen wieder über chrome.downloads mit `clipinc/<Playlistname>/<Interpret> - <Titel>.mp3`. Fehlt ein erkennbarer Playlist-/Albumname, lautet der Ordner `clipinc/`. Umlaute bleiben erhalten; unzulässige Pfadzeichen werden ersetzt. Bestehende Dateien werden nicht überschrieben.
- Downloadzähler und Erfolgsmeldung erscheinen erst nach bestätigtem Downloadabschluss. Blob-URLs bleiben bis dahin gültig.
- Coverfehler verhindern das Speichern der Audiodatei nicht. Der Encoder wartet auf die Initialisierung seiner Bibliothek.
- Leere und deutlich unvollständige Aufnahmen werden mit einem Fehler gemeldet. Bei bekannter Titellänge sind höchstens 2 Sekunden oder 2 Prozent Abweichung nach unten erlaubt; mindestens 1 Sekunde Audio ist erforderlich.
- Die Player-Anbindung wird einmal im MAIN-Kontext bei document_start geladen, statt sie zusätzlich im isolierten Kontext auszuführen und nachträglich per Script-Tag einzufügen.
- Fehler werden auch im Erweiterungs-Popup angezeigt.

## Bedienung

- MP3-Qualität ist wählbar: 128, 192, 256 oder 320 kbit/s; Standard bleibt 256 kbit/s. Änderungen gelten ab dem nächsten Song.
- „Nach diesem Song stoppen“ beendet die Aufnahme nach dem aktuellen Titel, während dessen MP3 noch fertig verarbeitet wird. Spotify spielt weiter. Der geplante Stopp kann aufgehoben werden.
- „Diagnose speichern“ exportiert Diagnoseereignisse zur Fehlersuche. Vor öffentlichem Teilen auf enthaltene Titel und Zeitangaben prüfen.

## Bewusste Einschränkungen

Die nicht dokumentierte Spotify-Tokenabfrage und nachfolgende Player-API-Abfrage wurden aus dem Aufnahmeweg entfernt. Titel, Interpret, Cover, Dauer und Ordner stammen aus der sichtbaren Seite. Auf der passenden Albumseite werden außerdem Albumname, Albuminterpret, Erscheinungsjahr und eine erkennbare Titelnummer übernommen (siehe MusicBrainz-Abschnitt). Eine CD-Nummer wird nicht ergänzt. Eine zuverlässige Werbeerkennung ist nicht gewährleistet.

Der Playlistname ist DOM-abhängig. Für den ersten Test die abspielende Playlist geöffnet lassen. Bei Navigation auf andere Seiten ist die korrekte Zuordnung noch im echten Player zu prüfen.

Die Aufnahme startet bei der aktuellen Wiedergabeposition, ohne automatisch Zurück-/Play-Tasten zu betätigen. Ein beim Einschalten schon halb abgespielter Song wird am Ende als unvollständig verworfen. Ab dem nächsten vollständigen Titel sollen reguläre Dateien entstehen. Pause oder Stop verwirft den aktuellen unvollständigen Titel; zuvor abgeschlossene Titel dürfen weiter codiert und gespeichert werden. Springen innerhalb eines Titels unterbricht die laufende Teilaufnahme.

## Automatisch geprüft

```sh
npm run test:recording
npm run dev-build
```

25 Offline-Regressionstests prüfen Encoder-Überlappung, doppelte Starts, Pfade, Coverfehler, unvollständiges Audio, Titelzuordnung, fehlende DOM-Elemente, Qualitätswahl, Stopp nach dem aktuellen Song und Album-/Genre-Metadaten. Vier Tests verwenden den echten mitgelieferten MP3-Encoder bei 128, 192, 256 und 320 kbit/s mit einem synthetischen Zwei-Sekunden-Ton und deaktivierter dynamischer Codeausführung. Auf macOS prüft `afinfo` zusätzlich Dauer und Bitrate. Die Metadaten-Tests prüfen auch den echten ID3-Writer. Browser-Schnittstellen und MusicBrainz-Antworten werden in den Offline-Tests simuliert.

ESLint wurde für die geänderten JavaScript-/React-Dateien geprüft. Bestehende Toolchain-Hinweise zur Browserslist-Datenbank bzw. alten Babel-Abhängigkeiten sind von Aufnahmefehlern zu unterscheiden.

Der alte Jest-Test unter `__tests__/selectors.js` wurde nicht ausgeführt: Er versucht einen echten Spotify-Login mit fest im Test hinterlegten Zugangsdaten. Er ist kein verlässlicher Offline-Funktionstest.

## Bisherige manuelle Prüfung

Der Beitragende berichtet von erfolgreichen Aufnahmen mehrerer vollständiger Songs in Chrome auf macOS. Dies ist keine vollständige Browser- oder Plattformfreigabe. Eine direkte MusicBrainz-Abfrage für Betterov / Olympia lieferte ein Albumgenre; der vollständige Ablauf bis zum Genre-Tag in einer Spotify-Aufnahme wurde noch nicht bestätigt.

## Live-Test zum Reproduzieren

1. Nach dem Build unter `chrome://extensions` die bestehende clipinc-Erweiterung neu laden. Sie muss den Projektordner `dist/` verwenden. Keine zweite Kopie parallel aktivieren.
2. Den Spotify-Tab anschließend ebenfalls neu laden. Das ist nach Änderungen am Manifest oder an Content-Skripten notwendig.
3. Spotify im Browser auf diesem Mac abspielen lassen. Für den ersten Test drei normale Songs ohne Springen, Pause oder Überblenden verwenden und die Playlistseite geöffnet lassen.
4. Aufnahme einschalten. Falls der aktuelle Song schon läuft, diesen als Teilaufnahme überspringen lassen; danach drei vollständige Titel abwarten.
5. Für jeden vollständigen Titel kontrollieren: passender Ordner, passender Name, ungefähr richtige Spieldauer und hörbarer Anfang/Mitte/Ende. Der Download darf nach dem Titelende kurz auf die Codierung warten.
6. Nach dem letzten gewünschten Song noch den Downloadabschluss abwarten, dann ausschalten.
7. Wenn ein Fehler bleibt: genauen Console-Text mit Uhrzeit und Titel notieren, einschließlich der Angabe, ob er im Spotify-Tab, Service Worker oder in der Offscreen-Seite erscheint. Zusätzlich notieren: Zeitpunkt des Einschaltens, Skip/Pause, erwartete und tatsächliche Dateidauer.

Für einen späteren Test der Service-Worker-Ruhephase dessen DevTools schließen; offene DevTools können den Lebenszyklus beeinflussen. Ein gezielter Test der Service-Worker-Ruhephase steht noch aus. Die automatisierten Tests ersetzen keine Prüfung im echten Spotify-Webplayer.

## Technische Referenzen

- [Chrome Offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen): Offscreen-Seiten können DOM/Audio verarbeiten; von den Erweiterungs-APIs steht dort runtime zur Verfügung.
- [Chrome Downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads): Downloadpfade relativ zum Downloadordner und Downloadzustände.
- [Chrome Audio Capture](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture): Übergabe eines Tab-Audiostreams an ein Offscreen-Dokument.

## Albumgenre aus MusicBrainz

- Albumseite in Spotify öffnen und einen vollständigen Song aufnehmen. Die
  angezeigte Albumzeile muss über die Spotify-Song-ID zum laufenden Titel passen.
- Album, Albuminterpret und Erscheinungsjahr werden aus dem Albumkopf übernommen;
  Titelnummer nur, wenn sichtbar oder zuvor für diesen Titel erkannt. CD-Nummer
  wird nicht geraten. Unbekannte Songs aus Playlists haben zunächst kein Albumgenre.
- MusicBrainz erhält Albumname und Albuminterpret (ersatzweise Interpret), keine
  Audiodaten oder Spotify-Zugangsdaten. Die Erweiterung benötigt dafür Zugriff
  ausschließlich auf https://musicbrainz.org/ und kennzeichnet ihre eigenen
  API-Anfragen per User-Agent über eine auf diesen Host begrenzte Chrome-Regel.
- Gesucht wird eine eindeutig passende Release-Group. Klammerzusätze mit Deluxe,
  Edition oder Remaster werden für die Suche entfernt; der ID3-Albumname bleibt
  unverändert. Albumgenre hat Vorrang, danach ein eindeutig bestimmter Künstler.
  Bei mehreren Genres entscheidet die Stimmenzahl, bei Gleichstand alphabetisch.
- Pro Künstler/Album wird genau ein Genre für 90 Tage lokal gespeichert. Leere
  Treffer werden einen Tag, Verbindungsfehler fünf Minuten zwischengespeichert.
- Die API-Abfragen erfolgen seriell mit mindestens 1,1 Sekunden Abstand.
  Die Audiogrenze wird unabhängig davon sofort verarbeitet. Die letzte MP3 kann
  bei einer langsamen Erstanfrage bis zu 23 Sekunden später gespeichert werden.
  Bei Fehlern/Timeout bleibt Genre leer und die MP3 wird trotzdem gespeichert.
- Vorhandene MP3s werden nicht nachträglich verändert. 256 kbit/s bleibt Standard.
- `npm run test:recording` umfasst Tests für Albumzuordnung, Mehrdeutigkeiten,
  Künstlerersatz, Cache über Worker-Neustarts, Rate Limit und echte ID3-TCON-Tags
  sowie den Timeout ohne Verlust der Audiodatei.
