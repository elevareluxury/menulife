import type { LegalDict } from './es'
import es from './es'

const de: LegalDict = {
  ui: {
    termsTitle: "Nutzungsbedingungen",
    privacyTitle: "Datenschutzerklärung",
    termsIntro: "Mit dem Erstellen eines Kontos oder der Nutzung von Mycen akzeptierst du diese Bedingungen. Sie sind so geschrieben, dass man sie versteht.",
    privacyIntro: "Welche Daten wir nutzen, wofür, mit wem wir sie teilen und welche Kontrolle du hast.",
    updated: "Zuletzt aktualisiert",
    contents: "Inhalt",
    reference: "Maßgeblich ist die spanische Fassung. Die Übersetzungen dienen deiner Bequemlichkeit; bei Abweichungen gilt der spanische Text, sofern das Recht deines Landes nichts anderes vorschreibt.",
    seeOther: { terms: "Datenschutzerklärung", privacy: "Nutzungsbedingungen" },
    language: "Sprache",
    back: "Zurück zu Mycen",
    supportTitle: "Hilfe und Support",
    supportIntro: "So erreichst du uns, und Antworten auf die häufigsten Fragen.",
    deletionTitle: "Dein Mycen-Konto löschen",
    deletionIntro: "So löschst du dein Mycen-Konto und deine Daten (App und Web), was gelöscht wird und was bleiben kann.",
  },
  updated: es.updated,
  support: [
    { id: "contacto", title: "Schreib uns", body: [
      "Bei Fragen, Problemen oder Wünschen schreib an **team@mycen.id**. Nenne deinen Mycen-Benutzernamen (oder die E-Mail deines Kontos) und schick, wenn möglich, einen Screenshot. Wir antworten so schnell wie möglich.",
    ] },
    { id: "acceso", title: "In dein Konto kommen", body: [
      { list: [
        "**Passwort vergessen:** Tippe auf dem Anmeldebildschirm auf „Passwort vergessen?“ und folge dem Link aus der E-Mail.",
        "**Die Bestätigungs-E-Mail ist nicht angekommen:** Sieh im Spam- und Werbeordner nach. Wenn sie nicht da ist, registriere dich noch einmal mit derselben E-Mail, dann schicken wir sie erneut.",
        "**Ich habe mich mit Google angemeldet:** Nutze immer denselben Button; ein Passwort brauchst du nicht.",
      ] },
    ] },
    { id: "datos", title: "Deine Daten", body: [
      { list: [
        "**Herunterladen:** Studio → Einstellungen → „Meine Daten herunterladen“ (Profil, Module und Life OS in einer Datei). Unter Life OS → Einstellungen → „Deine Daten“ kannst du Geld auch als CSV laden.",
        "**Konto löschen:** über Studio → Einstellungen oder Life OS → Einstellungen → Konto. Alle Schritte, und was gelöscht wird, auf **mycen.id/eliminar-cuenta**.",
      ] },
    ] },
    { id: "seguridad", title: "Melden oder blockieren", body: [
      { list: [
        "**Ein Profil:** Tippe auf einem öffentlichen Profil auf „Melden“. Das Mycen-Team prüft es, und der Inhaber erfährt nicht, wer gemeldet hat.",
        "**Eine Nachricht:** In Studio → Nachrichten schickt „Melden“ die Nachricht ans Team und blockiert den Absender; „Blockieren“ stoppt nur seine Nachrichten.",
      ] },
      "Wenn etwas dringend ist oder jemanden gefährdet, schreib an **team@mycen.id** mit dem Betreff „Dringend“.",
    ] },
  ],
  deletion: [
    { id: "app", title: "In der App oder im Web", body: [
      "Melde dich an und wähle eine dieser Optionen:",
      { list: [
        "**Life OS → Einstellungen → Konto → „Mein Konto löschen“**",
        "**Studio → Einstellungen → „Mein Konto löschen“**",
      ] },
      "Zur Bestätigung tippst du das Wort ein, um das wir bitten. Das Konto wird sofort gelöscht.",
    ] },
    { id: "sin-acceso", title: "Wenn du dich nicht anmelden kannst", body: [
      "Schreib von der E-Mail deines Kontos an **team@mycen.id** mit dem Betreff „Mein Konto löschen“. Wir löschen es innerhalb der gesetzlichen Fristen (in Argentinien 5 Werktage) und sagen dir Bescheid, wenn es erledigt ist.",
    ] },
    { id: "que-se-borra", title: "Was gelöscht wird", body: [
      { list: [
        "Dein Konto und deine Anmelde-E-Mail.",
        "Deine Identität: Profile, Spaces, Module, Projekte, Bilder, veröffentlichte Versionen, Statistiken, Nachrichten und Abonnenten.",
        "Ganz Life OS: Aufgaben, Gewohnheiten, Ziele, Mein Tag, Rückblicke, Geld und Tagebuch.",
      ] },
    ] },
    { id: "que-queda", title: "Was bleiben kann", body: [
      { list: [
        "Die Sicherungen der Anbieter, die in ihren üblichen Zyklen überschrieben werden, und die tägliche Sicherung der Fotos und PDFs, die Gelöschtes 30 Tage behält.",
        "Fehlerprotokolle, die nicht mit deinem Konto verknüpft sind.",
        "Was das Gesetz aufzubewahren verlangt (zum Beispiel Rechnungsdaten), für die vorgeschriebene Dauer.",
        "Hatte dein Konto ein gesperrtes Profil, bleibt dessen Nutzername reserviert, damit ihn niemand wieder verwendet, und das Protokoll dieser Sperre wird 3 Jahre aufbewahrt.",
        "Wenn dein Konto ein Geschäft in Mycen Business hat, schreib uns: Wir schließen es gemeinsam mit dir, um die Daten deiner Kunden und Verkäufe zu schützen.",
      ] },
    ] },
  ],
  terms: [
    { id: "quien", title: "Wer den Dienst anbietet", body: [
      "Mycen ist ein Dienst von **Luca Cazzoli** (argentinische Steuernummer CUIT 20-42325961-3) unter dem Handelsnamen **Resilio**, mit Wohnsitz in der Argentinischen Republik. Du erreichst uns unter **team@mycen.id**.",
      "Mit Mycen kannst du eine öffentliche digitale Identität erstellen (Mycen Identity), sie in Mycen Studio verwalten und dein Privatleben in Life OS organisieren. Mycen Business zur Verwaltung von Unternehmen ist für neue Unternehmen noch nicht geöffnet.",
      "**Kontaktstelle:** Für Nutzerinnen und Nutzer sowie für Behörden (auch im Sinne des Gesetzes über digitale Dienste der Europäischen Union) schreib an **team@mycen.id**, auf Spanisch oder Englisch.",
    ] },
    { id: "edad", title: "Wer Mycen nutzen darf", body: [
      "Um Mycen zu nutzen, musst du mindestens **13 Jahre** alt sein oder das höhere Alter erreicht haben, das das Recht deines Landes für die Nutzung eines solchen Dienstes ohne Zustimmung deiner Eltern oder Sorgeberechtigten verlangt (zum Beispiel **14** in Südkorea und China und bis zu **16** in einigen Ländern der Europäischen Union).",
      "Mit der Erstellung eines Kontos bestätigst du, dass du das nötige Alter hast. Erfahren wir, dass ein Konto jemandem gehört, der es nicht hat, löschen wir es.",
      "Um Mycen Business für ein Unternehmen zu nutzen, musst du volljährig und berechtigt sein, es zu vertreten.",
    ] },
    { id: "cuenta", title: "Dein Konto", body: [
      "Du bist dafür verantwortlich, dein Passwort sicher aufzubewahren, und für alles, was in deinem Konto passiert. Die Daten, die du einträgst, müssen wahr sein und dir gehören, oder du brauchst die Erlaubnis, sie zu nutzen.",
      "Wenn du eine Nutzung bemerkst, die du nicht erlaubt hast, ändere dein Passwort und schreib uns.",
    ] },
    { id: "contenido", title: "Deine Inhalte", body: [
      "Was du veröffentlichst, bleibt deins. Du gibst uns eine kostenlose, weltweite Erlaubnis, es zu speichern, unter deiner öffentlichen Adresse anzuzeigen und technisch anzupassen (zum Beispiel Bilder zu verkleinern), solange es veröffentlicht ist. Du kannst es jederzeit bearbeiten, ausblenden, depublizieren oder löschen.",
      "Was du veröffentlichst, muss den Inhaltsregeln entsprechen. Was dagegen verstößt, können wir ausblenden oder sperren.",
      "Wenn du Inhalte oder Daten anderer Personen oder Marken veröffentlichst (zum Beispiel den Kontakt deiner Agentur, ein Pressezitat, ein Logo oder deine Reichweitenzahlen), musst du dazu berechtigt sein und deine Angaben müssen stimmen. Wenn etwas bezahlte Werbung oder eine Kooperation gegen Produkte ist, kennzeichne es, wie es die Werbegesetze vieler Länder verlangen.",
    ] },
    { id: "reglas", title: "Inhaltsregeln", body: [
      "Auf Mycen ist Folgendes nicht erlaubt:",
      { list: [
        "**Spam oder irreführende Werbung:** falsche Versprechen, Links, die nicht dorthin führen, wo sie es angeben, oder erfundene Bewertungen.",
        "**Betrug:** mit Täuschung Geld oder Daten verlangen, Dinge verkaufen, die es nicht gibt.",
        "**Identitätsanmaßung:** sich als andere Person, Firma oder Marke ausgeben.",
        "**Hass oder Belästigung:** Menschen oder Gruppen wegen dem angreifen, was sie sind, oder jemanden belästigen.",
        "**Gewalt oder Drohungen:** drohen, zu Gewalt aufrufen oder sie grundlos zeigen.",
        "**Explizite sexuelle Inhalte** sowie jeder sexuelle Inhalt mit Minderjährigen (wird den Behörden gemeldet).",
        "**Illegales:** verbotene Produkte oder Dienstleistungen oder Inhalte, die Rechte anderer verletzen (Marken, Fotos, Texte).",
        "**Schädliche Links:** Viren, Phishing oder betrügerische Seiten.",
      ] },
      "Jede Person kann ein Profil oder Projekt über den Link „Melden“ unten auf der Seite melden, ohne Konto und anonym. Wir prüfen jede Meldung. Verstößt ein Profil gegen die Regeln, sperren wir es: Es ist nicht mehr sichtbar (Seite, Projekte und Kontaktkarte), und der Inhaber sieht den Grund in Studio. Wenn du meinst, dass es ein Fehler war, schreib uns von dem Konto aus, mit dem du es erstellt hast, und wir prüfen es erneut.",
      "Solange ein Profil gesperrt ist, kann sein Konto keine neuen Profile erstellen und es nicht löschen, um neu anzufangen. Wird das Konto gelöscht, bleibt dieser Nutzername reserviert und kann nicht wieder verwendet werden.",
      "**Wie wir moderieren:** Wir kombinieren automatische Werkzeuge und Menschen. Zum Beispiel prüfen wir veröffentlichte Links mit Google Web Risk und setzen automatische Grenzen gegen Missbrauch, aber kein Profil wird allein durch ein automatisches Werkzeug gesperrt: Eine Person aus dem Team prüft jeden Fall. Wenn wir etwas ausblenden oder sperren, sagen wir dir, was, warum und gegen welche Regel es verstößt, und du kannst eine erneute Prüfung verlangen. Wenn du in der Europäischen Union lebst, kannst du dich auch an eine zertifizierte außergerichtliche Streitbeilegungsstelle oder an die Gerichte wenden. Wenn ein Inhalt eine Gefahr für Leben oder Sicherheit einer Person oder sexuellen Kindesmissbrauch zeigt, informieren wir die Behörden.",
    ] },
    { id: "uso", title: "Richtige Nutzung des Dienstes", body: [
      "Zusätzlich zu den Inhaltsregeln ist Folgendes nicht erlaubt:",
      { list: [
        "**Automatisieren** von Kontoerstellung, Besuchen, Abstimmungen oder Nachrichten oder der Einsatz von Bots, um Zahlen aufzublähen.",
        "**Massenhaftes Kopieren** von Profilen oder Daten anderer Personen (Scraping), außer dem, was Suchmaschinen mit öffentlichen Seiten tun.",
        "**Angreifen oder Testen der Sicherheit** von Mycen ohne Erlaubnis. Wenn du eine Schwachstelle findest, melde sie an team@mycen.id.",
        "**Umgehen** einer Sperre, einer Blockierung oder der Grenzen des Dienstes, zum Beispiel durch ein neues Konto.",
        "**Verkaufen, Vermieten oder Übertragen** deines Kontos oder deines Nutzernamens.",
      ] },
    ] },
    { id: "derechos-de-autor", title: "Urheberrecht und andere Rechte", body: [
      "Wenn du meinst, dass etwas auf Mycen dein Urheberrecht oder andere Rechte verletzt (zum Beispiel deine Marke oder dein Recht am eigenen Bild), kannst du uns bitten, es zu entfernen. Schreib an **team@mycen.id** mit:",
      { list: [
        "**Dem Link zum Inhalt:** der genauen Adresse des Profils, Projekts oder Bildes auf Mycen.",
        "**Wer Rechteinhaber ist** und wie man ihn erreicht. Wenn du im Namen einer anderen Person oder Firma handelst, sag es.",
        "**Warum es eine Verletzung ist:** um welches Werk, welche Marke oder welches andere Recht es geht und wie es ohne Erlaubnis genutzt wird.",
        "**Eine Erklärung:** dass du in gutem Glauben annimmst, dass diese Nutzung weder vom Rechteinhaber, seiner Vertretung noch vom Gesetz erlaubt ist, und – unter Strafandrohung für Meineid – dass die Angaben korrekt sind und du Rechteinhaber oder zur Vertretung berechtigt bist.",
        "**Deine Unterschrift**, handschriftlich oder elektronisch (dein vollständiger getippter Name genügt).",
      ] },
      "Wir prüfen jede Meldung. Wenn sie berechtigt ist, entfernen oder sperren wir den Inhalt und informieren die Person, die ihn veröffentlicht hat, über den Grund. Sie kann uns ihre Sicht schildern (zum Beispiel, wenn sie eine Erlaubnis hat) und wir prüfen erneut.",
      "**Wenn wir etwas von dir entfernen und du glaubst, dass es ein Fehler war,** schick uns eine Gegendarstellung mit dem Link zum entfernten Inhalt, einer Erklärung unter Strafandrohung für Meineid, dass du in gutem Glauben annimmst, dass er irrtümlich oder aufgrund einer Verwechslung entfernt wurde, deinem Namen, deiner Adresse und Telefonnummer sowie deiner Zustimmung zur Zuständigkeit der jeweiligen Gerichte. Wir leiten sie an die antragstellende Person weiter und können den Inhalt wieder veröffentlichen, wenn sie uns nicht innerhalb von 10 bis 14 Werktagen nachweist, dass sie Klage erhoben hat.",
      "Konten, die wiederholt Inhalte veröffentlichen, die Rechte anderer verletzen, können gesperrt oder geschlossen werden.",
    ] },
    { id: "usernames", title: "Benutzernamen", body: [
      "Manche Namen sind reserviert. Es ist nicht erlaubt, Namen zu registrieren, um sich als andere Person oder Marke auszugeben oder um sie weiterzuverkaufen; in solchen Fällen können wir sie zurückholen. Wenn du deinen Benutzernamen änderst, leitet die alte Adresse auf die neue weiter, damit deine Links und QR-Codes weiter funktionieren.",
      "Namen, die Banken, Wallets, Dienste oder bekannte Marken nachahmen (zum Beispiel mit dem Wort „Bank“ oder einem Markennamen), sind nicht erlaubt: Mycen lehnt sie bei der Auswahl ab. Ist dein Konto verifiziert und du änderst deinen Namen oder Nutzernamen, wird das Verifizierungshäkchen erneut geprüft.",
      "Auf Wunsch einer bekannten Person, einer Marke oder ihrer Vertretung können wir deren Nutzernamen reservieren, bevor sie ein Konto erstellt: Nur diese Person kann ihn übernehmen. Wenn du glaubst, dass jemand einen Namen registriert hat, der dir zusteht, schreib uns mit Nachweisen und wir prüfen es.",
    ] },
    { id: "propiedad", title: "Was Mycen gehört", body: [
      "Die Marke Mycen, der Fingerabdruck, das Design und die Software von Mycen gehören ihren Inhabern. Diese Bedingungen erlauben dir, den Dienst zu nutzen, geben dir aber keine Rechte daran. Wenn du uns Ideen oder Vorschläge schickst, dürfen wir sie frei nutzen, um Mycen zu verbessern, ohne dir gegenüber verpflichtet zu sein.",
    ] },
    { id: "pagos", title: "Preis", body: [
      "Mycen ist heute **kostenlos**: Deine Identität, Studio und Life OS kosten nichts, und wir fragen nach keinem Zahlungsmittel.",
      "Wenn wir künftig kostenpflichtige Pläne einführen (zum Beispiel, wenn Mycen Business öffnet), sagen wir es dir vorher, mit dem Preis in US-Dollar (US$) zuzüglich der Steuern deines Landes, und nichts, was du heute kostenlos nutzt, wird ohne deine Zustimmung kostenpflichtig. Es wird keine Mindestlaufzeit geben, und als Verbraucher behältst du die Rechte, die dir das Recht deines Landes gibt, etwa das Widerrufsrecht bei Fernabsatzkäufen.",
    ] },
    { id: "servicio", title: "Der Dienst", body: [
      "Wir arbeiten daran, dass Mycen immer gut funktioniert, aber es kann Unterbrechungen, Fehler oder Änderungen geben. Funktionen können sich ändern, verbessern oder wegfallen; wenn sich etwas Wichtiges ändert, informieren wir dich nach Möglichkeit vorher.",
      "Soweit gesetzlich zulässig, wird Mycen „wie besehen“ angeboten, und wir haften nicht für mittelbare Schäden oder entgangenen Gewinn aus der Nutzung des Dienstes. Nichts davon schränkt Rechte ein, die nach dem Recht deines Landes nicht eingeschränkt werden dürfen, etwa die Rechte von Verbrauchern oder die Haftung für Vorsatz und grobe Fahrlässigkeit.",
      "Links, Videos, Songs und Dienste Dritter, die in Profilen erscheinen, gehören diesen Dritten: Wir kontrollieren sie nicht und haften nicht für sie.",
      "Sollten wir dennoch haften, ist unsere Gesamthaftung auf den Betrag begrenzt, den du uns in den letzten 12 Monaten gezahlt hast, oder auf 100 US$, je nachdem, welcher Betrag höher ist. Diese Begrenzung gilt nicht bei Vorsatz oder grober Fahrlässigkeit, bei Schäden an Leben oder Gesundheit und nicht, wo das Gesetz eine Begrenzung nicht erlaubt.",
    ] },
    { id: "baja", title: "Kündigung und Sperrung", body: [
      "Du kannst dein Konto jederzeit unter Studio → Einstellungen löschen und vorher eine Kopie deiner Daten herunterladen. Konten mit einem aktiven Unternehmen in Mycen Business werden über den Support geschlossen, weil sie Kunden- und Verkaufsdaten betreffen.",
      "Wir können Konten sperren oder schließen, die gegen diese Bedingungen oder das Gesetz verstoßen oder andere Menschen oder den Dienst gefährden. Wenn möglich, informieren wir dich und erklären den Grund.",
    ] },
    { id: "apps", title: "Wenn du die iPhone- oder Android-App nutzt", body: [
      "Wenn du Mycen aus dem App Store von Apple geladen hast, gilt zusätzlich Folgendes:",
      { list: [
        "Diese Bedingungen gelten zwischen dir und Mycen, nicht Apple. Apple ist nicht für die App oder ihre Inhalte verantwortlich.",
        "Du darfst die App auf Apple-Geräten nutzen, die du besitzt oder kontrollierst, gemäß den Nutzungsregeln des App Store.",
        "Apple ist nicht verpflichtet, Wartung oder Support für die App zu leisten; dafür schreib uns an team@mycen.id.",
        "Wenn die App eine geltende Gewährleistung nicht erfüllt, kannst du Apple informieren, das dir den gezahlten Preis erstattet (die App ist kostenlos); Apple hat keine weitere Gewährleistungspflicht. Ansprüche im Zusammenhang mit der App (Produkthaftung, Einhaltung von Gesetzen, Verbraucherschutz oder geistiges Eigentum Dritter) bearbeitet Mycen, nicht Apple.",
        "Du versicherst, dass du dich nicht in einem Land befindest, das einem US-Embargo unterliegt, und auf keiner US-Liste verbotener oder eingeschränkter Parteien stehst.",
        "Apple und seine Tochtergesellschaften sind Drittbegünstigte dieser Bedingungen und können sie dir gegenüber durchsetzen.",
      ] },
      "Wenn du sie bei Google Play geladen hast, gelten zusätzlich die Bedingungen von Google Play.",
    ] },
    { id: "cambios", title: "Änderungen dieser Bedingungen", body: [
      "Ändern wir diese Bedingungen wesentlich, informieren wir dich per E-Mail oder in Mycen, bevor sie gelten. Wenn du nicht einverstanden bist, kannst du den Dienst nicht mehr nutzen und dein Konto löschen.",
    ] },
    { id: "ley", title: "Anwendbares Recht", body: [
      "Für diese Bedingungen gilt das Recht der Argentinischen Republik. Nutzt du Mycen als Verbraucher aus einem anderen Land, schützen dich zusätzlich die zwingenden Vorschriften deines Landes, und du kannst vor den Gerichten an deinem Wohnsitz klagen.",
      "**Sonstiges:** Sollte ein Teil dieser Bedingungen unwirksam sein, bleibt der Rest gültig. Wenn wir ein Recht einmal nicht geltend machen, verzichten wir nicht darauf. Wir haften nicht für Verzögerungen oder Ausfälle durch Ereignisse außerhalb unserer zumutbaren Kontrolle. Wir dürfen diese Bedingungen übertragen, wenn Mycen auf eine andere Person oder Firma übergeht (zum Beispiel bei der Gründung einer Gesellschaft), mit vorheriger Ankündigung; du darfst sie nicht ohne unsere Zustimmung übertragen. Diese Bedingungen und die Datenschutzerklärung sind die vollständige Vereinbarung zwischen dir und Mycen.",
      "Bevor du etwas einforderst, schreib uns an **team@mycen.id**: Fast alles lässt sich im Gespräch lösen.",
    ] },
  ],
  privacy: [
    { id: "responsable", title: "Wer für deine Daten verantwortlich ist", body: [
      "Verantwortlicher ist **Luca Cazzoli** (argentinische Steuernummer CUIT 20-42325961-3), der Mycen unter dem Handelsnamen **Resilio** betreibt und seinen Wohnsitz in der Argentinischen Republik hat. Bei Fragen zu deinen Daten schreib an **team@mycen.id**.",
      "Nutzt ein Unternehmen Mycen Business für Daten seiner eigenen Kunden (Bestellungen, Reservierungen, Termine), ist dieses Unternehmen für diese Daten verantwortlich, und Mycen verarbeitet sie in seinem Auftrag und nach seinen Weisungen.",
      "Mycen hat keine Niederlassung in der Europäischen Union oder im Vereinigten Königreich. Für alle Datenschutzfragen – auch um die Person zu erreichen, die das Recht deines Landes verlangt, etwa den „encarregado“ nach dem brasilianischen LGPD oder den Beschwerdebeauftragten nach indischem Recht – schreib an **team@mycen.id**.",
    ] },
    { id: "datos", title: "Welche Daten wir nutzen", body: [
      { list: [
        "**Dein Konto:** Name, E-Mail, Passwort (verschlüsselt gespeichert, wir sehen es nie), Sprache, Währung, Zeitzone und das Datum, an dem du diese Bedingungen akzeptiert hast. Wenn du die Bestätigung in zwei Schritten aktivierst, auch den Schlüssel deiner Authenticator-App (verschlüsselt bei Supabase gespeichert).",
        "**Reservierte Namen und Fingerabdruck oder Gesicht:** Wenn das Mycen-Team deinen Nutzernamen auf deinen Wunsch oder auf Wunsch deiner Agentur oder Vertretung reserviert hat (die uns diese Daten gibt, wenn du noch kein Konto hast), speichern wir deinen Namen, deine E-Mail und eine Notiz, solange die Reservierung besteht, nur damit niemand sonst ihn nutzt. Wenn du dich mit Fingerabdruck oder Gesicht anmeldest, verlässt das nie dein Gerät: Mycen (mit Supabase) speichert nur einen öffentlichen Schlüssel.",
        "**Portfolio (Maße, Reichweite, Marken, Presse, Credits und Vertretung):** Das sind Angaben, die du selbst einträgst, freiwillig, und sie erscheinen auf deinem öffentlichen Profil nur, wenn du sie ausfüllst und das Modul sichtbar ist. Mycen prüft oder berechnet sie nicht: Reichweitenzahlen tragen das Datum, das du angibst, und werden nach einem Jahr nicht mehr gezeigt. Du kannst sie jederzeit ändern oder ausblenden.",
        "**Dein öffentliches Profil:** was du in Studio einträgst (Name, Foto, Texte, Links, Projekte, Kontaktkarte). Veröffentlicht wird nur, was du zeigen willst. Jedes Foto wird vor dem Hochladen auf deinem Gerät neu erzeugt, dadurch werden versteckte Daten darin (etwa der GPS-Standort oder das Kameramodell) entfernt.",
        "**Life OS:** deine Ziele, Gewohnheiten, Aufgaben, Finanzen und Notizen, auch die Namen, die du einträgst (zum Beispiel, mit wem du eine Ausgabe geteilt hast). Sie sind privat: Nur du siehst sie. Dein Tagebuch auch: Die Sperre mit PIN, Fingerabdruck oder Gesicht funktioniert nur auf deinem Gerät (sie wird nicht an Mycen gesendet), und die Einträge sind nicht Ende-zu-Ende-verschlüsselt.",
        "**Wie du dich gefühlt hast:** Wenn du beim Abschluss des Tages eines der Gesichter antippst, speichern wir diesen Wert (1 bis 5) und das Datum. Er kann etwas über deine Gesundheit verraten: Darum ist er freiwillig, nur du siehst ihn, und wir nutzen ihn nur, um dir deine eigenen Muster zu zeigen (zum Beispiel in Insights und „Dein Monat“). Das Antippen eines Gesichts ist deine Einwilligung; du widerrufst sie, indem du es noch einmal antippst (es wird gelöscht) oder Life OS löschst.",
        "**Mycen Business:** die Daten deines Unternehmens und was du über deine Kunden und Verkäufe einträgst.",
        "**Besuchsstatistiken:** pseudonymisierte Ereignisse (Besuche und Tipps auf deinem Profil): Statt zu wissen, wer jemand ist, verwenden wir eine Kennung, die sich täglich ändert und nicht zurückgerechnet werden kann. Wir speichern keine IP-Adressen und keine Gerätedaten und zählen keine Bots. Außerdem speichern wir, von welcher Seite oder welchem Link der Besuch kam (zum Beispiel Instagram oder der QR-Code).",
        "**Meldungen:** der Grund und die Details, die die meldende Person schreibt, mit einer pseudonymisierten Kennung, die sich täglich ändert, um Missbrauch zu verhindern. Ist die meldende Person angemeldet, speichern wir auch ihr Konto: Das sieht nur das Mycen-Team, nie die gemeldete Person.",
        "**Nachrichten aus dem Kontaktformular:** Name, Kontakt (E-Mail oder WhatsApp) und Nachricht, die jemand hinterlässt. Hat das Profil das Modul Kooperationen, gibt eine Marke außerdem ihr Unternehmen und ihr Anliegen an und, wenn sie will, ihre Website, ein Budget und eine Frist. Nur die Person, der das Profil gehört, sieht sie in Studio; sie werden weder veröffentlicht noch per E-Mail verschickt. Gegen Missbrauch verwenden wir eine pseudonymisierte Kennung, die sich täglich ändert, ohne IP und ohne Gerätedaten. Meldet die Profilinhaberin oder der Profilinhaber eine Nachricht, speichern wir eine Kopie zur Prüfung durch das Mycen-Team. Wird ein Kontakt blockiert (oder gemeldet), speichern wir diese E-Mail-Adresse oder Telefonnummer im Profil, um weitere Nachrichten davon zu verwerfen.",
        "**Abonnements:** Wenn du dich über das Modul „Abonnieren“ eines Profils einträgst, speichern wir deine E-Mail-Adresse (und deinen Namen, falls das Profil danach fragt), das Datum deiner Einwilligung und deine Sprache und geben sie an die Person weiter, der das Profil gehört; sie sieht sie in Studio und kann sie exportieren. Mycen schickt nichts an diese Liste: Die Profilinhaberin oder der Profilinhaber entscheidet, wie sie genutzt wird, und ist dafür verantwortlich. Zum Austragen frag diese Person oder schreib an team@mycen.id, dann löschen wir es. Gegen Missbrauch verwenden wir eine pseudonymisierte Kennung, die sich täglich ändert, ohne IP und ohne Gerätedaten.",
        "**Umfragen:** Wenn du in der Umfrage eines Profils abstimmst, speichern wir deine Wahl mit einer pseudonymisierten Kennung, die sich täglich ändert (ohne IP, ohne Konto und ohne Gerätedaten), damit jede Person nur eine Stimme hat. Die Profilinhaberin oder der Profilinhaber sieht nur die Summen. Dein Browser merkt sich deine Stimme, um sie dir anzuzeigen.",
        "**Einladungen:** Wenn du dein Konto über „Erstelle deine Identität“ im Profil einer anderen Person anlegst, speichern wir, welches Profil dich gebracht hat und dessen Art, um zu verstehen, wie Mycen wächst. Diese Person sieht deine Daten nicht.",
        "**Nutzung der App:** Um zu wissen, ob Mycen funktioniert und wie es wächst, speichern wir Nutzungsereignisse (zum Beispiel, dass du dein Profil veröffentlicht, „Mein Tag“ geöffnet oder eine Gewohnheit abgehakt hast) mit deinem Konto, dem Datum und kurzen Angaben wie der gewählten Struktur oder einer Anzahl von Tagen. Außerdem notieren wir einmal pro Tag, dass du Mycen genutzt hast, mit welcher Art von Gerät (Browser, installierte App, iPhone oder Android), in welcher Sprache und mit welcher Zeitzone des Geräts (zum Beispiel „America/Argentina/Buenos_Aires“); nie deine IP-Adresse oder deinen genauen Standort. Den Inhalt deiner Aufgaben, Gewohnheiten, Notizen oder Nachrichten speichern wir nie. Wir nutzen keine Analysedienste Dritter.",
        "**Kontoverifizierung:** Wenn du das Häkchen für verifizierte Konten beantragst, speichern wir deine Nachricht, den angegebenen Link und unsere Antwort. Nur das Mycen-Team sieht sie, um die Anfrage zu prüfen; wird sie genehmigt, zeigt dein Profil das Häkchen.",
        "**Technische Fehler:** Wenn etwas schiefgeht, speichern wir die Fehlermeldung, die Ansicht, die Mycen-Version und den Browser (zum Beispiel „Chrome 128 · Android“), ohne IP oder personenbezogene Daten, um ihn beheben zu können.",
        "**Benachrichtigungen bei geschlossener App (Web):** Wenn du Benachrichtigungen von Life OS im Browser erlaubst, speichern wir die Zustelladresse, die dein Browser erzeugt, ihre Verschlüsselungsschlüssel, die Zeitzone und den Browsernamen (zum Beispiel „Chrome · Android“), um dir deine Erinnerungen zu schicken. Das wird gelöscht, wenn du die Benachrichtigungen ausschaltest, der Browser das Abo beendet oder du dein Konto löschst.",
        "**Schutz vor Missbrauch:** Um Angriffe zu stoppen, zählen wir, wie viele Anfragen von jeder Verbindung an die öffentlichen Funktionen gehen (Besuche, Nachrichten, Stimmen, Meldungen). Die IP-Adresse speichern wir nicht: Wir wandeln sie in einen Code um, der sich nicht zurückrechnen lässt (ein Hash mit geheimem Schlüssel), und löschen ihn nach 2 Tagen.",
        "**Was das Mycen-Team tut:** Wenn das Team ein Profil sperrt, eine Meldung bearbeitet, ein Konto verifiziert oder Dateien löscht, wird festgehalten, wer es wann bei welchem Konto getan hat, damit wir Rechenschaft ablegen können. Dieses Protokoll kann nicht verändert werden und wird 3 Jahre aufbewahrt.",
      ] },
    ] },
    { id: "para-que", title: "Wofür wir sie nutzen und auf welcher Grundlage", body: [
      { list: [
        "**Den Dienst erbringen**, den du mit deinem Konto angefordert hast: deine Informationen speichern, anzeigen und synchronisieren (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).",
        "**Speichern, wie du dich gefühlt hast** (die Gesichter in Life OS), nur wenn du es einträgst: mit deiner ausdrücklichen Einwilligung, die du jederzeit durch Löschen widerrufst.",
        "**Dir Benachrichtigungen bei geschlossener App schicken**, nur wenn du sie im Browser oder auf dem Handy erlaubst (Einwilligung; du widerrufst sie, indem du sie ausschaltest).",
        "**Mycen sicher und funktionsfähig halten:** Missbrauch verhindern, Meldungen prüfen und Fehler beheben (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO).",
        "**Dir Statistiken** zu deinem Profil zeigen, mit pseudonymisierten Daten (berechtigtes Interesse).",
        "**Dir notwendige E-Mails senden** zu deinem Konto: Bestätigung, Passwort-Wiederherstellung und wichtige Änderungen (Vertragserfüllung).",
        "**Identitätsmissbrauch verhindern:** Verifizierungsanträge prüfen und Namen bekannter Personen auf deren Wunsch reservieren (berechtigtes Interesse).",
        "**Verstehen, wie Mycen genutzt wird und wächst** (App-Nutzung und Einladungen), ohne Werbung und ohne Dritte (berechtigtes Interesse).",
        "**Rechenschaft ablegen und Beweise sichern**, wenn das Gesetz es verlangt, zum Beispiel das Protokoll der Team-Aktionen oder eine Meldung von sexuellem Kindesmissbrauch (rechtliche Verpflichtung und berechtigtes Interesse).",
        "**Gesetze einhalten**, wenn eine zuständige Behörde es verlangt.",
      ] },
      "Wenn die Grundlage ein berechtigtes Interesse ist, kannst du per Nachricht an uns widersprechen und wir hören damit auf, es sei denn, es gibt zwingende berechtigte Gründe oder es ist für Rechtsansprüche nötig. Wir treffen keine automatisierten Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung für dich: Wenn ein Werkzeug etwas markiert (zum Beispiel einen gefährlichen Link), prüft es ein Mensch.",
      "Wir verkaufen deine Daten nicht, nutzen sie nicht für Werbung, und es gibt auf Mycen keine Tracker von Dritten.",
    ] },
    { id: "publico", title: "Was öffentlich ist", body: [
      "Deine öffentliche Seite zeigt nur, was du veröffentlichst. Ausgeblendete Module, Entwürfe und nicht veröffentlichte Spaces sind nicht sichtbar. Öffentliche Profile können in Suchmaschinen erscheinen; wählst du die Sichtbarkeit „nicht gelistet“ oder „privat“, sind sie nicht in der Sitemap, die Suchmaschinen lesen.",
    ] },
    { id: "proveedores", title: "Mit wem wir sie teilen", body: [
      "Wir nutzen Dienstleister, die Daten nur zur Erbringung des Dienstes und vertraglich gebunden verarbeiten:",
      { list: [
        "**Supabase:** Datenbank, Anmeldung und Dateien.",
        "**Vercel:** Hosting der Anwendung und Auslieferung der Seiten.",
        "**Resend:** Versand der E-Mails zu deinem Konto.",
        "**Cloudflare (Turnstile):** die Anti-Bot-Prüfung bei Registrierung, Anmeldung und Passwort-Wiederherstellung. Wenn du diese Seiten öffnest, erhält Cloudflare technische Daten deines Browsers (etwa die IP-Adresse), nur um zu prüfen, dass du kein Bot bist.",
        "**Cloudflare R2:** bewahrt eine tägliche Sicherung der Fotos und PDFs auf, die Profile hochladen, damit sie bei einem Fehler wiederhergestellt werden können. Was in Mycen gelöscht wird, bleibt 30 Tage in dieser Sicherung und wird dann entfernt.",
        "**Google Web Risk:** Wir prüfen die öffentlichen Links veröffentlichter Profile und Projekte mit Google, um Betrug und Viren zu finden. Gesendet wird nur der Link; nichts über dich oder deine Besucher. Ist ein Link gefährlich, prüft ihn das Mycen-Team.",
        "**YouTube, Vimeo, TikTok, Spotify und SoundCloud:** nur wenn ein Profil ein Video oder einen Song einbettet und du auf „Abspielen“ tippst. Vorher besteht keine Verbindung zu ihnen; ab dann gelten ihre eigenen Richtlinien. Zeigt ein Profil sein „Neuestes Video“, ruft der Mycen-Server die öffentliche Videoliste des vom Inhaber gewählten YouTube-Kanals ab, ohne Daten von dir zu senden. Wenn die Inhaberin oder der Inhaber eines Profils einen dieser Links in Studio einfügt, lädt der Mycen-Server das öffentliche Cover dieses Videos oder Songs und speichert es als weiteres Foto des Profils: So zeigt die Seite es an, ohne dich mit dem Anbieter zu verbinden. Zeigt ein Profil einen Podcast, liest der Mycen-Server den vom Inhaber gewählten öffentlichen RSS-Feed, ohne Daten von dir zu senden; tippst du auf „Anhören“, verbindet sich dein Browser mit dem Dienst, der diesen Podcast hostet, und dessen Richtlinien gelten. Hat ein Profil mehrere Standorte und tippst du auf „Die nächste zeigen“, fragt dein Browser um Erlaubnis für deinen Standort: Er wird nur auf deinem Gerät zum Sortieren der Liste verwendet und weder an Mycen noch an andere gesendet.",
        "**Anthropic:** nur wenn ein Unternehmen den Import seiner Speisekarte aus einem PDF nutzt; diese Datei wird verarbeitet.",
        "**Mercado Pago:** nur wenn ein Unternehmen es für Zahlungen einrichtet; die Zahlung erfolgt bei Mercado Pago.",
        "**Google (Anmeldung):** nur wenn du „Weiter mit Google“ wählst. Google bestätigt uns deinen Namen, deine E-Mail-Adresse und dein Foto; wir erhalten nie dein Google-Passwort und greifen auf nichts anderes in deinem Konto zu.",
        "**Apple (Anmeldung):** nur wenn du „Mit Apple fortfahren“ wählst. Apple bestätigt uns deinen Namen und deine E-Mail-Adresse (oder eine Weiterleitungsadresse, die Apple erstellt, wenn du deine verbergen möchtest); wir erhalten nie dein Passwort und greifen auf nichts anderes in deinem Konto zu.",
        "**App für iOS und Android:** Wenn du sie herunterlädst, erfassen Apple (App Store) oder Google (Google Play) den Download nach ihren eigenen Richtlinien. In der App werden Erinnerungen auf deinem Handy geplant, ohne Benachrichtigungsdienst eines Dritten.",
        "**Benachrichtigungsdienst deines Browsers:** nur wenn du Benachrichtigungen von Life OS im Web erlaubst. Die Erinnerung (Name der Aufgabe oder Gewohnheit und Uhrzeit) wird verschlüsselt über den Benachrichtigungsdienst deines Browsers an dein Gerät übertragen: Google (Firebase Cloud Messaging) bei Chrome und Android, Microsoft bei Edge, Apple bei Safari und Mozilla bei Firefox. Dieser Dienst sieht die Zustelladresse, kann den Inhalt aber nicht lesen.",
        "**Google Kalender, Apple oder ein anderer Kalender:** nur wenn du den Kalender-Link von Life OS einschaltest; dieser Dienst lädt deine offenen Aufgaben mit Datum (Titel, Datum, Uhrzeit und Erinnerung). Du kannst ihn jederzeit ausschalten oder ändern.",
        "**Die Spracherkennung deines Browsers:** nur wenn du in Life OS „Diktieren“ nutzt. Dein Browser wandelt die Stimme in Text um (in Chrome übernimmt das der Sprachdienst von Google, in Safari Apple). Mycen erhält nur den Text.",
      ] },
      "Darüber hinaus teilen wir Daten nur, wenn das Gesetz es verlangt oder um die Rechte und die Sicherheit von Menschen zu schützen.",
    ] },
    { id: "transferencias", title: "Daten außerhalb deines Landes", body: [
      "Mycen wird von Argentinien aus betrieben, einem Land, dem die Europäische Kommission ein angemessenes Schutzniveau bescheinigt. Unsere Dienstleister können Daten in anderen Ländern speichern oder verarbeiten, etwa in den USA oder in Ländern der Europäischen Union. Dann nutzen wir die gesetzlich vorgesehenen Garantien: Angemessenheitsbeschlüsse (zum Beispiel den EU-US-Datenschutzrahmen für teilnehmende Dienstleister), die Standardvertragsklauseln der Europäischen Kommission und des Vereinigten Königreichs sowie die Musterklauseln der argentinischen Behörde (AAIP). Du kannst weitere Informationen oder eine Kopie dieser Garantien anfordern.",
    ] },
    { id: "plazos", title: "Wie lange wir sie speichern", body: [
      { list: [
        "Die Daten deines Kontos, deines Profils und von Life OS, solange du das Konto hast. Wenn du es löschst, löschen wir sie, auch deine Fotos und PDFs; die Sicherungen der Anbieter werden in ihren üblichen Zyklen überschrieben, und die tägliche Sicherung der Fotos und PDFs behält Gelöschtes 30 Tage.",
        "Besuchsstatistiken werden pseudonymisiert (mit der täglich wechselnden Kennung) 13 Monate gespeichert —Studio zeigt bis zu 90 Tage— und Umfragestimmen, solange das Profil besteht. Wird das Profil gelöscht, werden sie mitgelöscht.",
        "Nachrichten aus dem Kontaktformular, bis die Person, der das Profil gehört, sie löscht oder ihr Konto löscht.",
        "Abonnement-E-Mails, bis die Person, der das Profil gehört, sie löscht, ihr Konto löscht oder du uns bittest, sie zu löschen.",
        "Fehlerprotokolle werden gespeichert, solange sie bei der Behebung helfen (ein behobener Fehler bleibt gespeichert, falls er wieder auftritt); die Zählung betroffener Personen 90 Tage.",
        "Nutzungsereignisse der App und die Aufzeichnung der Tage, an denen du Mycen genutzt hast, 25 Monate (danach werden sie automatisch gelöscht); löschst du dein Konto vorher, haben sie keinerlei Verbindung mehr zu dir.",
        "Browser-Benachrichtigungen, bis du sie ausschaltest oder dein Konto löschst; der Verbindungscode gegen Missbrauch, 2 Tage; blockierte Kontakte, bis die Profilinhaberin oder der Profilinhaber sie entsperrt oder das Profil löscht; und das Protokoll dessen, was das Mycen-Team tut, 3 Jahre.",
        "Meldungen, solange das gemeldete Profil besteht (sie werden mit ihm gelöscht); Verifizierungsanträge und Einladungen, solange das Konto besteht; reservierte Namen, solange die Reservierung besteht; und als gefährlich markierte Links 13 Monate.",
        "Was wir gesetzlich aufbewahren müssen (zum Beispiel Rechnungsdaten oder Beweise, die eine Behörde bei sexuellem Kindesmissbrauch anfordert), für die vorgeschriebene Dauer, für jede andere Nutzung gesperrt und auch dann, wenn die Löschung verlangt wird.",
      ] },
    ] },
    { id: "dispositivo", title: "Was auf deinem Gerät gespeichert wird", body: [
      "Mycen verwendet keine Werbe- oder Tracking-Cookies. In deinem Browser speichern wir nur, was für den Betrieb nötig ist: deine Sitzung, deine Sprache und einige Entwürfe und Einstellungen. Du kannst das in den Browser-Einstellungen löschen (dann musst du dich neu anmelden). Wenn du in Life OS offline etwas einträgst, bleibt es auf deinem Gerät, bis es hochgeladen wird (nur mit deiner Sitzung). Von der Tagebuch-PIN speichern wir nur einen verschlüsselten Fingerabdruck (Hash), nie die PIN. Deshalb zeigen wir dir kein Cookie-Banner: Wir nutzen nur das unbedingt Notwendige, was das Gesetz ohne Einwilligung erlaubt.",
    ] },
    { id: "seguridad", title: "Sicherheit", body: [
      "Wir nutzen verschlüsselte Verbindungen, verschlüsselt gespeicherte Passwörter, Zwei-Schritt-Verifizierung für das Team und Berechtigungen in der Datenbank, damit jede Person nur ihre eigenen Daten sieht. Kein System ist perfekt: Wenn eine Datenpanne deine Rechte beeinträchtigen könnte, informieren wir die zuständige Behörde (in der Europäischen Union innerhalb von 72 Stunden) und bei hohem Risiko auch dich, unverzüglich.",
    ] },
    { id: "derechos", title: "Deine Rechte", body: [
      "Du kannst Auskunft über deine Daten verlangen, sie berichtigen, löschen oder mitnehmen (Datenübertragbarkeit), bestimmten Nutzungen widersprechen oder sie einschränken und eine erteilte Einwilligung widerrufen, ohne dass das Bisherige berührt wird. Vieles erledigst du direkt in Studio → Einstellungen (Daten herunterladen, Konto löschen) oder in Life OS → Einstellungen → Deine Daten. Für alles andere schreib an **team@mycen.id**; um dein Konto zu schützen, können wir dich bitten zu bestätigen, dass du es bist (zum Beispiel, indem du von der E-Mail des Kontos schreibst). Es ist kostenlos.",
      "Wir antworten innerhalb der gesetzlichen Fristen (in der Europäischen Union innerhalb eines Monats; in Argentinien 10 Kalendertage für die Auskunft und 5 Werktage für Berichtigung oder Löschung). Du kannst dich auch bei einer Datenschutzaufsichtsbehörde beschweren: in der Europäischen Union bei der Behörde deines Landes; in Argentinien bei der **Agencia de Acceso a la Información Pública (AAIP)**; in Brasilien bei der **ANPD**.",
    ] },
    { id: "segun-pais", title: "Je nachdem, wo du lebst", body: [
      "Zusätzlich zum oben Genannten:",
      { list: [
        "**Europäische Union, Europäischer Wirtschaftsraum, Vereinigtes Königreich und Schweiz:** Wir antworten innerhalb eines Monats (zwei weitere, wenn der Antrag komplex ist, und wir sagen dir Bescheid). Du kannst dich bei der Datenschutzbehörde deines Landes beschweren.",
        "**Brasilien (LGPD):** Du kannst auch erfragen, mit welchen Unternehmen wir deine Daten teilen, und die Überprüfung einer automatisierten Entscheidung verlangen. Behörde: die **ANPD**.",
        "**USA (Kalifornien und Bundesstaaten mit Datenschutzgesetzen wie Virginia, Colorado, Connecticut oder Texas):** Du kannst erfahren, welche Daten wir haben – Kennungen wie Name und E-Mail, was du veröffentlichst, App-Nutzungsdaten und, nur wenn du es einträgst, wie du dich gefühlt hast, ein sensibles Datum, das wir nur nutzen, um es dir zu zeigen –, ihre Berichtigung oder Löschung verlangen und sie mitnehmen. Wir verkaufen oder teilen deine Daten nicht für Werbung, du musst also nichts abbestellen; trotzdem beachten wir das Signal „Global Privacy Control“. Du kannst über einen bevollmächtigten Vertreter handeln, und wir behandeln dich nicht anders, weil du deine Rechte ausübst. Lehnen wir einen Antrag ab, kannst du mit dem Betreff „Einspruch“ widersprechen und, wenn du weiterhin nicht einverstanden bist, dich an den Generalstaatsanwalt deines Bundesstaats wenden.",
        "**Kanada, Australien, Japan und Südkorea:** Du kannst auf deine Daten zugreifen, sie berichtigen und deine Einwilligung widerrufen. Du kannst dich beim Privacy Commissioner of Canada, der australischen OAIC, der japanischen PPC oder der koreanischen PIPC beschweren.",
        "**Indien (DPDP):** Du kannst auf deine Daten zugreifen, sie berichtigen und löschen und eine Person benennen, die deine Rechte ausübt, falls du es nicht kannst. Beschwerden richtest du zuerst an uns (team@mycen.id) und danach an das Data Protection Board of India.",
        "**Andere Länder:** Wir gewähren dir die Rechte, die das Recht deines Landes vorsieht; schreib uns und wir helfen dir.",
      ] },
    ] },
    { id: "menores", title: "Minderjährige", body: [
      "Mycen richtet sich nicht an Kinder unter 13 Jahren und nicht an Personen unter dem höheren Alter, das das Recht ihres Landes für die Nutzung eines solchen Dienstes ohne Zustimmung der Eltern verlangt (zum Beispiel 14 in Südkorea und China und bis zu 16 in einigen Ländern der Europäischen Union). Wir erheben wissentlich keine Daten von Personen unter diesem Alter: Erfahren wir, dass ein Konto einer solchen Person gehört, löschen wir es samt seinen Daten. Wenn du Elternteil oder Sorgeberechtigte/r bist und glaubst, dass das passiert ist, schreib an **team@mycen.id**.",
      "Wenn du unter 18 bist, denk daran, dass jede Person dein öffentliches Profil sehen kann: Veröffentliche weder deine Adresse noch deine Schule oder Angaben, mit denen man dich finden kann. In den Einstellungen kannst du „Nur mit dem Link“ oder „Privat“ wählen.",
    ] },
    { id: "cambios", title: "Änderungen dieser Erklärung", body: [
      "Ändern wir diese Erklärung wesentlich, informieren wir dich per E-Mail oder in Mycen, bevor sie gilt. Oben siehst du immer das Datum der letzten Aktualisierung.",
    ] },
  ],
}

export default de
