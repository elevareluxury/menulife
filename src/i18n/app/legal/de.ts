import type { LegalDict } from './es'
import es from './es'

const de: LegalDict = {
  ui: {
    termsTitle: 'Nutzungsbedingungen',
    privacyTitle: 'Datenschutzerklärung',
    termsIntro: 'Mit dem Erstellen eines Kontos oder der Nutzung von Mycen akzeptierst du diese Bedingungen. Sie sind so geschrieben, dass man sie versteht.',
    privacyIntro: 'Welche Daten wir nutzen, wofür, mit wem wir sie teilen und welche Kontrolle du hast.',
    updated: 'Zuletzt aktualisiert',
    contents: 'Inhalt',
    reference: 'Maßgeblich ist die spanische Fassung. Die Übersetzungen dienen deiner Bequemlichkeit; bei Abweichungen gilt der spanische Text.',
    seeOther: { terms: 'Datenschutzerklärung', privacy: 'Nutzungsbedingungen' },
    language: 'Sprache',
    back: 'Zurück zu Mycen',
    supportTitle: 'Hilfe und Support',
    supportIntro: 'So erreichst du uns, und Antworten auf die häufigsten Fragen.',
    deletionTitle: 'Dein Mycen-Konto löschen',
    deletionIntro: 'So löschst du dein Mycen-Konto und deine Daten (App und Web), was gelöscht wird und was bleiben kann.',
  },
  updated: es.updated,
  support: [
    { id: 'contacto', title: 'Schreib uns', body: [
      'Bei Fragen, Problemen oder Wünschen schreib an **team@mycen.id**. Nenne deinen Mycen-Benutzernamen (oder die E-Mail deines Kontos) und schick, wenn möglich, einen Screenshot. Wir antworten so schnell wie möglich.',
    ] },
    { id: 'acceso', title: 'In dein Konto kommen', body: [
      { list: [
        '**Passwort vergessen:** Tippe auf dem Anmeldebildschirm auf „Passwort vergessen?“ und folge dem Link aus der E-Mail.',
        '**Die Bestätigungs-E-Mail ist nicht angekommen:** Sieh im Spam- und Werbeordner nach. Wenn sie nicht da ist, registriere dich noch einmal mit derselben E-Mail, dann schicken wir sie erneut.',
        '**Ich habe mich mit Google angemeldet:** Nutze immer denselben Button; ein Passwort brauchst du nicht.',
      ] },
    ] },
    { id: 'datos', title: 'Deine Daten', body: [
      { list: [
        '**Herunterladen:** Studio → Einstellungen → „Meine Daten herunterladen“ (Profil, Module und Life OS in einer Datei). Unter Life OS → Einstellungen → „Deine Daten“ kannst du Geld auch als CSV laden.',
        '**Konto löschen:** über Studio → Einstellungen oder Life OS → Einstellungen → Konto. Alle Schritte, und was gelöscht wird, auf **mycen.id/eliminar-cuenta**.',
      ] },
    ] },
    { id: 'seguridad', title: 'Melden oder blockieren', body: [
      { list: [
        '**Ein Profil:** Tippe auf einem öffentlichen Profil auf „Melden“. Das Mycen-Team prüft es, und der Inhaber erfährt nicht, wer gemeldet hat.',
        '**Eine Nachricht:** In Studio → Nachrichten schickt „Melden“ die Nachricht ans Team und blockiert den Absender; „Blockieren“ stoppt nur seine Nachrichten.',
      ] },
      'Wenn etwas dringend ist oder jemanden gefährdet, schreib an **team@mycen.id** mit dem Betreff „Dringend“.',
    ] },
  ],
  deletion: [
    { id: 'app', title: 'In der App oder im Web', body: [
      'Melde dich an und wähle eine dieser Optionen:',
      { list: [
        '**Life OS → Einstellungen → Konto → „Mein Konto löschen“**',
        '**Studio → Einstellungen → „Mein Konto löschen“**',
      ] },
      'Zur Bestätigung tippst du das Wort ein, um das wir bitten. Das Konto wird sofort gelöscht.',
    ] },
    { id: 'sin-acceso', title: 'Wenn du dich nicht anmelden kannst', body: [
      'Schreib von der E-Mail deines Kontos an **team@mycen.id** mit dem Betreff „Mein Konto löschen“. Wir löschen es innerhalb der gesetzlichen Fristen (in Argentinien 5 Werktage) und sagen dir Bescheid, wenn es erledigt ist.',
    ] },
    { id: 'que-se-borra', title: 'Was gelöscht wird', body: [
      { list: [
        'Dein Konto und deine Anmelde-E-Mail.',
        'Deine Identität: Profile, Spaces, Module, Projekte, Bilder, veröffentlichte Versionen, Statistiken, Nachrichten und Abonnenten.',
        'Ganz Life OS: Aufgaben, Gewohnheiten, Ziele, Mein Tag, Rückblicke, Geld und Tagebuch.',
      ] },
    ] },
    { id: 'que-queda', title: 'Was bleiben kann', body: [
      { list: [
        'Die Sicherungen der Anbieter, die in ihren üblichen Zyklen überschrieben werden, und die tägliche Sicherung der Fotos und PDFs, die Gelöschtes 30 Tage behält.',
        'Fehlerprotokolle, die nicht mit deinem Konto verknüpft sind.',
        'Was das Gesetz aufzubewahren verlangt (zum Beispiel Rechnungsdaten), für die vorgeschriebene Dauer.',
        'Hatte dein Konto ein gesperrtes Profil, bleibt dessen Nutzername reserviert, damit ihn niemand wieder verwendet, und das Protokoll dieser Sperre wird 3 Jahre aufbewahrt.',
        'Wenn dein Konto ein Geschäft in Mycen Business hat, schreib uns: Wir schließen es gemeinsam mit dir, um die Daten deiner Kunden und Verkäufe zu schützen.',
      ] },
    ] },
  ],
  terms: [
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'quien', title: 'Wer den Dienst anbietet', body: [
      'Mycen ist ein Dienst von **Luca Cazzoli** (argentinische Steuernummer CUIT 20-42325961-3) unter dem Handelsnamen **Resilio**, mit Wohnsitz in der Argentinischen Republik. Du erreichst uns unter **team@mycen.id**.',
      'Mit Mycen erstellst du eine öffentliche digitale Identität (Mycen Identity), verwaltest sie in Mycen Studio, organisierst dein Privatleben in Life OS und führst, wenn du ein Unternehmen hast, dieses mit Mycen Business.',
    ] },
    { id: 'edad', title: 'Wer Mycen nutzen darf', body: [
      'Um Mycen zu nutzen, musst du mindestens **13 Jahre** alt sein. Lebst du in einem Land der Europäischen Union oder des Europäischen Wirtschaftsraums, das für die Nutzung eines solchen Dienstes ohne Zustimmung deiner Eltern oder Erziehungsberechtigten **16 Jahre** verlangt (zum Beispiel Deutschland), musst du mindestens 16 sein. Und wenn das Recht deines Landes ein höheres Mindestalter festlegt, gilt dieses.',
      'Mit der Erstellung eines Kontos bestätigst du, dass du das nötige Alter hast. Erfahren wir, dass ein Konto jemandem gehört, der es nicht hat, löschen wir es.',
      'Um Mycen Business für ein Unternehmen zu nutzen, musst du volljährig und berechtigt sein, es zu vertreten.',
    ] },
    { id: 'cuenta', title: 'Dein Konto', body: [
      'Du bist dafür verantwortlich, dein Passwort sicher aufzubewahren, und für alles, was in deinem Konto passiert. Die Daten, die du einträgst, müssen wahr sein und dir gehören, oder du brauchst die Erlaubnis, sie zu nutzen.',
      'Wenn du eine Nutzung bemerkst, die du nicht erlaubt hast, ändere dein Passwort und schreib uns.',
    ] },
    { id: 'contenido', title: 'Deine Inhalte', body: [
      'Was du veröffentlichst, bleibt deins. Du gibst uns eine kostenlose, weltweite Erlaubnis, es zu speichern, unter deiner öffentlichen Adresse anzuzeigen und technisch anzupassen (zum Beispiel Bilder zu verkleinern), solange es veröffentlicht ist. Du kannst es jederzeit bearbeiten, ausblenden, depublizieren oder löschen.',
      'Was du veröffentlichst, muss den Inhaltsregeln entsprechen. Was dagegen verstößt, können wir ausblenden oder sperren.',
    ] },
    { id: 'reglas', title: 'Inhaltsregeln', body: [
      'Auf Mycen ist Folgendes nicht erlaubt:',
      { list: [
        '**Spam oder irreführende Werbung:** falsche Versprechen, Links, die nicht dorthin führen, wo sie es angeben, oder erfundene Bewertungen.',
        '**Betrug:** mit Täuschung Geld oder Daten verlangen, Dinge verkaufen, die es nicht gibt.',
        '**Identitätsanmaßung:** sich als andere Person, Firma oder Marke ausgeben.',
        '**Hass oder Belästigung:** Menschen oder Gruppen wegen dem angreifen, was sie sind, oder jemanden belästigen.',
        '**Gewalt oder Drohungen:** drohen, zu Gewalt aufrufen oder sie grundlos zeigen.',
        '**Explizite sexuelle Inhalte** sowie jeder sexuelle Inhalt mit Minderjährigen (wird den Behörden gemeldet).',
        '**Illegales:** verbotene Produkte oder Dienstleistungen oder Inhalte, die Rechte anderer verletzen (Marken, Fotos, Texte).',
        '**Schädliche Links:** Viren, Phishing oder betrügerische Seiten.',
      ] },
      'Jede Person kann ein Profil oder Projekt über den Link „Melden“ unten auf der Seite melden, ohne Konto und anonym. Wir prüfen jede Meldung. Verstößt ein Profil gegen die Regeln, sperren wir es: Es ist nicht mehr sichtbar (Seite, Projekte und Kontaktkarte), und der Inhaber sieht den Grund in Studio. Wenn du meinst, dass es ein Fehler war, schreib uns von dem Konto aus, mit dem du es erstellt hast, und wir prüfen es erneut.',
      'Solange ein Profil gesperrt ist, kann sein Konto keine neuen Profile erstellen und es nicht löschen, um neu anzufangen. Wird das Konto gelöscht, bleibt dieser Nutzername reserviert und kann nicht wieder verwendet werden.',
    ] },
    { id: 'derechos-de-autor', title: 'Urheberrecht und andere Rechte', body: [
      'Wenn du meinst, dass etwas auf Mycen dein Urheberrecht oder andere Rechte verletzt (zum Beispiel deine Marke oder dein Recht am eigenen Bild), kannst du uns bitten, es zu entfernen. Schreib an **team@mycen.id** mit:',
      { list: [
        '**Dem Link zum Inhalt:** der genauen Adresse des Profils, Projekts oder Bildes auf Mycen.',
        '**Wer Rechteinhaber ist** und wie man ihn erreicht. Wenn du im Namen einer anderen Person oder Firma handelst, sag es.',
        '**Warum es eine Verletzung ist:** um welches Werk, welche Marke oder welches andere Recht es geht und wie es ohne Erlaubnis genutzt wird.',
        '**Einer Erklärung in gutem Glauben:** dass du in gutem Glauben davon ausgehst, dass die Nutzung nicht erlaubt ist, und dass deine Angaben stimmen.',
      ] },
      'Wir prüfen jede Meldung. Wenn sie berechtigt ist, entfernen oder sperren wir den Inhalt und informieren die Person, die ihn veröffentlicht hat, über den Grund. Sie kann uns ihre Sicht schildern (zum Beispiel, wenn sie eine Erlaubnis hat) und wir prüfen erneut.',
      'Konten, die wiederholt Inhalte veröffentlichen, die Rechte anderer verletzen, können gesperrt oder geschlossen werden.',
    ] },
    { id: 'usernames', title: 'Benutzernamen', body: [
      'Manche Namen sind reserviert. Es ist nicht erlaubt, Namen zu registrieren, um sich als andere Person oder Marke auszugeben oder um sie weiterzuverkaufen; in solchen Fällen können wir sie zurückholen. Wenn du deinen Benutzernamen änderst, leitet die alte Adresse auf die neue weiter, damit deine Links und QR-Codes weiter funktionieren.',
      'Namen, die Banken, Wallets, Dienste oder bekannte Marken nachahmen (zum Beispiel mit dem Wort „Bank“ oder einem Markennamen), sind nicht erlaubt: Mycen lehnt sie bei der Auswahl ab. Ist dein Konto verifiziert und du änderst deinen Namen oder Nutzernamen, wird das Verifizierungshäkchen erneut geprüft.',
    ] },
    { id: 'pagos', title: 'Kostenpflichtige Tarife von Mycen Business', body: [
      'Deine Identität, Studio und Life OS sind kostenlos. Die Tarife von Mycen Business kosten den beim Abschluss angezeigten Preis in US-Dollar (US$) zuzüglich der in deinem Land geltenden Steuern.',
      'Es gibt keine Mindestlaufzeit: Du kannst jederzeit kündigen, und der Tarif bleibt bis zum Ende des bezahlten Zeitraums aktiv. Ändern wir einen Preis, informieren wir dich vorher, und die Änderung gilt ab dem nächsten Zeitraum. Als Verbraucher behältst du die Rechte, die dir das Recht deines Landes gibt, etwa das Widerrufsrecht bei Fernabsatzverträgen.',
    ] },
    { id: 'servicio', title: 'Der Dienst', body: [
      'Wir arbeiten daran, dass Mycen immer gut funktioniert, aber es kann Unterbrechungen, Fehler oder Änderungen geben. Funktionen können sich ändern, verbessern oder wegfallen; wenn sich etwas Wichtiges ändert, informieren wir dich nach Möglichkeit vorher.',
      'Soweit gesetzlich zulässig, wird Mycen „wie besehen“ angeboten, und wir haften nicht für mittelbare Schäden oder entgangenen Gewinn aus der Nutzung des Dienstes. Nichts davon schränkt Rechte ein, die nach dem Recht deines Landes nicht eingeschränkt werden dürfen, etwa die Rechte von Verbrauchern oder die Haftung für Vorsatz und grobe Fahrlässigkeit.',
    ] },
    { id: 'baja', title: 'Kündigung und Sperrung', body: [
      'Du kannst dein Konto jederzeit unter Studio → Einstellungen löschen und vorher eine Kopie deiner Daten herunterladen. Konten mit einem aktiven Unternehmen in Mycen Business werden über den Support geschlossen, weil sie Kunden- und Verkaufsdaten betreffen.',
      'Wir können Konten sperren oder schließen, die gegen diese Bedingungen oder das Gesetz verstoßen oder andere Menschen oder den Dienst gefährden. Wenn möglich, informieren wir dich und erklären den Grund.',
    ] },
    { id: 'cambios', title: 'Änderungen dieser Bedingungen', body: [
      'Ändern wir diese Bedingungen wesentlich, informieren wir dich per E-Mail oder in Mycen, bevor sie gelten. Wenn du nicht einverstanden bist, kannst du den Dienst nicht mehr nutzen und dein Konto löschen.',
    ] },
    { id: 'ley', title: 'Anwendbares Recht', body: [
      'Für diese Bedingungen gilt das Recht der Argentinischen Republik. Nutzt du Mycen als Verbraucher aus einem anderen Land, schützen dich zusätzlich die zwingenden Vorschriften deines Landes, und du kannst vor den Gerichten an deinem Wohnsitz klagen.',
      'Bevor du etwas einforderst, schreib uns an **team@mycen.id**: Fast alles lässt sich im Gespräch lösen.',
    ] },
  ],
  privacy: [
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'responsable', title: 'Wer für deine Daten verantwortlich ist', body: [
      'Verantwortlicher ist **Luca Cazzoli** (argentinische Steuernummer CUIT 20-42325961-3), der Mycen unter dem Handelsnamen **Resilio** betreibt und seinen Wohnsitz in der Argentinischen Republik hat. Bei Fragen zu deinen Daten schreib an **team@mycen.id**.',
      'Nutzt ein Unternehmen Mycen Business für Daten seiner eigenen Kunden (Bestellungen, Reservierungen, Termine), ist dieses Unternehmen für diese Daten verantwortlich, und Mycen verarbeitet sie in seinem Auftrag und nach seinen Weisungen.',
    ] },
    { id: 'datos', title: 'Welche Daten wir nutzen', body: [
      { list: [
        '**Dein Konto:** Name, E-Mail, Passwort (verschlüsselt gespeichert, wir sehen es nie), Sprache, Währung, Zeitzone und das Datum, an dem du diese Bedingungen akzeptiert hast. Wenn du die Bestätigung in zwei Schritten aktivierst, auch den Schlüssel deiner Authenticator-App (verschlüsselt bei Supabase gespeichert).',
        '**Reservierte Namen und Fingerabdruck oder Gesicht:** Wenn das Mycen-Team deinen Nutzernamen auf deine Bitte oder die deiner Agentur reserviert hat, speichern wir deinen Namen, deine E-Mail-Adresse und eine Notiz, solange die Reservierung besteht – nur damit niemand sonst ihn nutzt. Wenn du dich mit Fingerabdruck oder Gesicht anmeldest, verlässt das nie dein Gerät: Mycen (mit Supabase) speichert nur einen öffentlichen Schlüssel.',
        '**Dein öffentliches Profil:** was du in Studio einträgst (Name, Foto, Texte, Links, Projekte, Kontaktkarte). Veröffentlicht wird nur, was du zeigen willst. Jedes Foto wird vor dem Hochladen auf deinem Gerät neu erzeugt, dadurch werden versteckte Daten darin (etwa der GPS-Standort oder das Kameramodell) entfernt.',
        '**Life OS:** deine Ziele, Gewohnheiten, Aufgaben, Finanzen und Notizen, auch die Namen, die du einträgst (zum Beispiel, mit wem du eine Ausgabe geteilt hast). Sie sind privat: Nur du siehst sie. Dein Tagebuch auch: Die Sperre mit PIN, Fingerabdruck oder Gesicht funktioniert nur auf deinem Gerät (sie wird nicht an Mycen gesendet), und die Einträge sind nicht Ende-zu-Ende-verschlüsselt.',
        '**Wie du dich gefühlt hast:** Wenn du beim Abschluss des Tages eines der Gesichter antippst, speichern wir diesen Wert (1 bis 5) und das Datum. Er kann etwas über deine Gesundheit verraten: Darum ist er freiwillig, nur du siehst ihn, und wir nutzen ihn nur, um dir deine eigenen Muster zu zeigen (zum Beispiel in Insights und „Dein Monat“). Das Antippen eines Gesichts ist deine Einwilligung; du widerrufst sie, indem du es noch einmal antippst (es wird gelöscht) oder Life OS löschst.',
        '**Mycen Business:** die Daten deines Unternehmens und was du über deine Kunden und Verkäufe einträgst.',
        '**Besuchsstatistiken:** pseudonymisierte Ereignisse (Besuche und Tipps auf deinem Profil): Statt zu wissen, wer jemand ist, verwenden wir eine Kennung, die sich täglich ändert und nicht zurückgerechnet werden kann. Wir speichern keine IP-Adressen und keine Gerätedaten und zählen keine Bots. Außerdem speichern wir, von welcher Seite oder welchem Link der Besuch kam (zum Beispiel Instagram oder der QR-Code).',
        '**Meldungen:** der Grund und die Details, die die meldende Person schreibt, mit einer pseudonymisierten Kennung, die sich täglich ändert, um Missbrauch zu verhindern. Ist die meldende Person angemeldet, speichern wir auch ihr Konto: Das sieht nur das Mycen-Team, nie die gemeldete Person.',
        '**Nachrichten aus dem Kontaktformular:** Name, Kontakt (E-Mail oder WhatsApp) und Nachricht, die jemand hinterlässt. Hat das Profil das Modul Kooperationen, gibt eine Marke außerdem ihr Unternehmen und ihr Anliegen an und, wenn sie will, ihre Website, ein Budget und eine Frist. Nur die Person, der das Profil gehört, sieht sie in Studio; sie werden weder veröffentlicht noch per E-Mail verschickt. Gegen Missbrauch verwenden wir eine pseudonymisierte Kennung, die sich täglich ändert, ohne IP und ohne Gerätedaten. Meldet die Profilinhaberin oder der Profilinhaber eine Nachricht, speichern wir eine Kopie zur Prüfung durch das Mycen-Team. Wird ein Kontakt blockiert (oder gemeldet), speichern wir diese E-Mail-Adresse oder Telefonnummer im Profil, um weitere Nachrichten davon zu verwerfen.',
        '**Abonnements:** Wenn du dich über das Modul „Abonnieren“ eines Profils einträgst, speichern wir deine E-Mail-Adresse (und deinen Namen, falls das Profil danach fragt), das Datum deiner Einwilligung und deine Sprache und geben sie an die Person weiter, der das Profil gehört; sie sieht sie in Studio und kann sie exportieren. Mycen schickt nichts an diese Liste: Die Profilinhaberin oder der Profilinhaber entscheidet, wie sie genutzt wird, und ist dafür verantwortlich. Zum Austragen frag diese Person oder schreib an team@mycen.id, dann löschen wir es. Gegen Missbrauch verwenden wir eine pseudonymisierte Kennung, die sich täglich ändert, ohne IP und ohne Gerätedaten.',
        '**Umfragen:** Wenn du in der Umfrage eines Profils abstimmst, speichern wir deine Wahl mit einer pseudonymisierten Kennung, die sich täglich ändert (ohne IP, ohne Konto und ohne Gerätedaten), damit jede Person nur eine Stimme hat. Die Profilinhaberin oder der Profilinhaber sieht nur die Summen. Dein Browser merkt sich deine Stimme, um sie dir anzuzeigen.',
        '**Einladungen:** Wenn du dein Konto über „Erstelle deine Identität“ im Profil einer anderen Person anlegst, speichern wir, welches Profil dich gebracht hat und dessen Art, um zu verstehen, wie Mycen wächst. Diese Person sieht deine Daten nicht.',
        '**Nutzung der App:** Um zu wissen, ob Mycen funktioniert und wie es wächst, speichern wir Nutzungsereignisse (zum Beispiel, dass du dein Profil veröffentlicht, „Mein Tag“ geöffnet oder eine Gewohnheit abgehakt hast) mit deinem Konto, dem Datum und kurzen Angaben wie der gewählten Struktur oder einer Anzahl von Tagen. Außerdem notieren wir einmal pro Tag, dass du Mycen genutzt hast, mit welcher Art von Gerät (Browser, installierte App, iPhone oder Android), in welcher Sprache und mit welcher Zeitzone des Geräts (zum Beispiel „America/Argentina/Buenos_Aires“); nie deine IP-Adresse oder deinen genauen Standort. Den Inhalt deiner Aufgaben, Gewohnheiten, Notizen oder Nachrichten speichern wir nie. Wir nutzen keine Analysedienste Dritter.',
        '**Kontoverifizierung:** Wenn du das Häkchen für verifizierte Konten beantragst, speichern wir deine Nachricht, den angegebenen Link und unsere Antwort. Nur das Mycen-Team sieht sie, um die Anfrage zu prüfen; wird sie genehmigt, zeigt dein Profil das Häkchen.',
        '**Technische Fehler:** Wenn etwas schiefgeht, speichern wir die Fehlermeldung, die Ansicht, die Mycen-Version und den Browser (zum Beispiel „Chrome 128 · Android“), ohne IP oder personenbezogene Daten, um ihn beheben zu können.',
        '**Benachrichtigungen bei geschlossener App (Web):** Wenn du Benachrichtigungen von Life OS im Browser erlaubst, speichern wir die Zustelladresse, die dein Browser erzeugt, ihre Verschlüsselungsschlüssel, die Zeitzone und den Browsernamen (zum Beispiel „Chrome · Android“), um dir deine Erinnerungen zu schicken. Das wird gelöscht, wenn du die Benachrichtigungen ausschaltest, der Browser das Abo beendet oder du dein Konto löschst.',
        '**Schutz vor Missbrauch:** Um Angriffe zu stoppen, zählen wir, wie viele Anfragen von jeder Verbindung an die öffentlichen Funktionen gehen (Besuche, Nachrichten, Stimmen, Meldungen). Die IP-Adresse speichern wir nicht: Wir wandeln sie in einen Code um, der sich nicht zurückrechnen lässt (ein Hash mit geheimem Schlüssel), und löschen ihn nach 2 Tagen.',
        '**Was das Mycen-Team tut:** Wenn das Team ein Profil sperrt, eine Meldung bearbeitet, ein Konto verifiziert oder Dateien löscht, wird festgehalten, wer es wann bei welchem Konto getan hat, damit wir Rechenschaft ablegen können. Dieses Protokoll kann nicht verändert werden und wird 3 Jahre aufbewahrt.',
      ] },
    ] },
    { id: 'para-que', title: 'Wofür wir sie nutzen und auf welcher Grundlage', body: [
      { list: [
        '**Den Dienst erbringen**, den du mit deinem Konto angefordert hast: deine Informationen speichern, anzeigen und synchronisieren (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).',
        '**Speichern, wie du dich gefühlt hast** (die Gesichter in Life OS), nur wenn du es einträgst: mit deiner ausdrücklichen Einwilligung, die du jederzeit durch Löschen widerrufst.',
        '**Dir Benachrichtigungen bei geschlossener App schicken**, nur wenn du sie im Browser oder auf dem Handy erlaubst (Einwilligung; du widerrufst sie, indem du sie ausschaltest).',
        '**Mycen sicher und funktionsfähig halten:** Missbrauch verhindern, Meldungen prüfen und Fehler beheben (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO).',
        '**Dir Statistiken** zu deinem Profil zeigen, mit pseudonymisierten Daten (berechtigtes Interesse).',
        '**Notwendige E-Mails** zu deinem Konto senden: Bestätigung, Passwort-Wiederherstellung und wichtige Änderungen.',
        '**Gesetze einhalten**, wenn eine zuständige Behörde es verlangt.',
      ] },
      'Wir verkaufen deine Daten nicht, nutzen sie nicht für Werbung, und es gibt auf Mycen keine Tracker von Dritten.',
    ] },
    { id: 'publico', title: 'Was öffentlich ist', body: [
      'Deine öffentliche Seite zeigt nur, was du veröffentlichst. Ausgeblendete Module, Entwürfe und nicht veröffentlichte Spaces sind nicht sichtbar. Öffentliche Profile können in Suchmaschinen erscheinen; wählst du die Sichtbarkeit „nicht gelistet“ oder „privat“, sind sie nicht in der Sitemap, die Suchmaschinen lesen.',
    ] },
    { id: 'proveedores', title: 'Mit wem wir sie teilen', body: [
      'Wir nutzen Dienstleister, die Daten nur zur Erbringung des Dienstes und vertraglich gebunden verarbeiten:',
      { list: [
        '**Supabase:** Datenbank, Anmeldung und Dateien.',
        '**Vercel:** Hosting der Anwendung und Auslieferung der Seiten.',
        '**Resend:** Versand der E-Mails zu deinem Konto.',
        '**Cloudflare (Turnstile):** die Anti-Bot-Prüfung bei Registrierung, Anmeldung und Passwort-Wiederherstellung. Wenn du diese Seiten öffnest, erhält Cloudflare technische Daten deines Browsers (etwa die IP-Adresse), nur um zu prüfen, dass du kein Bot bist.',
        '**Cloudflare R2:** bewahrt eine tägliche Sicherung der Fotos und PDFs auf, die Profile hochladen, damit sie bei einem Fehler wiederhergestellt werden können. Was in Mycen gelöscht wird, bleibt 30 Tage in dieser Sicherung und wird dann entfernt.',
        '**Google Web Risk:** Wir prüfen die öffentlichen Links veröffentlichter Profile und Projekte mit Google, um Betrug und Viren zu finden. Gesendet wird nur der Link; nichts über dich oder deine Besucher. Ist ein Link gefährlich, prüft ihn das Mycen-Team.',
        '**YouTube, Vimeo, TikTok, Spotify und SoundCloud:** nur wenn ein Profil ein Video oder einen Song einbettet und du auf „Abspielen“ tippst. Vorher besteht keine Verbindung zu ihnen; ab dann gelten ihre eigenen Richtlinien. Zeigt ein Profil sein „Neuestes Video“, ruft der Mycen-Server die öffentliche Videoliste des vom Inhaber gewählten YouTube-Kanals ab, ohne Daten von dir zu senden. Wenn die Inhaberin oder der Inhaber eines Profils einen dieser Links in Studio einfügt, lädt der Mycen-Server das öffentliche Cover dieses Videos oder Songs und speichert es als weiteres Foto des Profils: So zeigt die Seite es an, ohne dich mit dem Anbieter zu verbinden. Zeigt ein Profil einen Podcast, liest der Mycen-Server den vom Inhaber gewählten öffentlichen RSS-Feed, ohne Daten von dir zu senden; tippst du auf „Anhören“, verbindet sich dein Browser mit dem Dienst, der diesen Podcast hostet, und dessen Richtlinien gelten. Hat ein Profil mehrere Standorte und tippst du auf „Die nächste zeigen“, fragt dein Browser um Erlaubnis für deinen Standort: Er wird nur auf deinem Gerät zum Sortieren der Liste verwendet und weder an Mycen noch an andere gesendet.',
        '**Anthropic:** nur wenn ein Unternehmen den Import seiner Speisekarte aus einem PDF nutzt; diese Datei wird verarbeitet.',
        '**Mercado Pago:** nur wenn ein Unternehmen es für Zahlungen einrichtet; die Zahlung erfolgt bei Mercado Pago.',
        '**Google (Anmeldung):** nur wenn du „Weiter mit Google“ wählst. Google bestätigt uns deinen Namen, deine E-Mail-Adresse und dein Foto; wir erhalten nie dein Google-Passwort und greifen auf nichts anderes in deinem Konto zu.',
        '**Apple (Anmeldung):** nur wenn du „Mit Apple fortfahren“ wählst. Apple bestätigt uns deinen Namen und deine E-Mail-Adresse (oder eine Weiterleitungsadresse, die Apple erstellt, wenn du deine verbergen möchtest); wir erhalten nie dein Passwort und greifen auf nichts anderes in deinem Konto zu.',
        '**App für iOS und Android:** Wenn du sie herunterlädst, erfassen Apple (App Store) oder Google (Google Play) den Download nach ihren eigenen Richtlinien. In der App werden Erinnerungen auf deinem Handy geplant, ohne Benachrichtigungsdienst eines Dritten.',
        '**Benachrichtigungsdienst deines Browsers:** nur wenn du Benachrichtigungen von Life OS im Web erlaubst. Die Erinnerung (Name der Aufgabe oder Gewohnheit und Uhrzeit) wird verschlüsselt über den Benachrichtigungsdienst deines Browsers an dein Gerät übertragen: Google (Firebase Cloud Messaging) bei Chrome und Android, Microsoft bei Edge, Apple bei Safari und Mozilla bei Firefox. Dieser Dienst sieht die Zustelladresse, kann den Inhalt aber nicht lesen.',
        '**Google Kalender, Apple oder ein anderer Kalender:** nur wenn du den Kalender-Link von Life OS einschaltest; dieser Dienst lädt deine offenen Aufgaben mit Datum (Titel, Datum, Uhrzeit und Erinnerung). Du kannst ihn jederzeit ausschalten oder ändern.',
        '**Die Spracherkennung deines Browsers:** nur wenn du in Life OS „Diktieren“ nutzt. Dein Browser wandelt die Stimme in Text um (in Chrome übernimmt das der Sprachdienst von Google, in Safari Apple). Mycen erhält nur den Text.',
      ] },
      'Darüber hinaus teilen wir Daten nur, wenn das Gesetz es verlangt oder um die Rechte und die Sicherheit von Menschen zu schützen.',
    ] },
    { id: 'transferencias', title: 'Daten außerhalb deines Landes', body: [
      'Unsere Dienstleister können Daten auf Servern in anderen Ländern speichern oder verarbeiten, etwa in den USA oder in Ländern der Europäischen Union. Dann nutzen wir die gesetzlich vorgesehenen Garantien, etwa von den Datenschutzbehörden genehmigte Standardvertragsklauseln, damit deine Daten angemessen geschützt sind.',
    ] },
    { id: 'plazos', title: 'Wie lange wir sie speichern', body: [
      { list: [
        'Die Daten deines Kontos, deines Profils und von Life OS, solange du das Konto hast. Wenn du es löschst, löschen wir sie, auch deine Fotos und PDFs; die Sicherungen der Anbieter werden in ihren üblichen Zyklen überschrieben, und die tägliche Sicherung der Fotos und PDFs behält Gelöschtes 30 Tage.',
        'Besuchsstatistiken werden pseudonymisiert (mit der täglich wechselnden Kennung) 13 Monate gespeichert —Studio zeigt bis zu 90 Tage— und Umfragestimmen, solange das Profil besteht. Wird das Profil gelöscht, werden sie mitgelöscht.',
        'Nachrichten aus dem Kontaktformular, bis die Person, der das Profil gehört, sie löscht oder ihr Konto löscht.',
        'Abonnement-E-Mails, bis die Person, der das Profil gehört, sie löscht, ihr Konto löscht oder du uns bittest, sie zu löschen.',
        'Fehlerprotokolle werden gespeichert, solange sie bei der Behebung helfen (ein behobener Fehler bleibt gespeichert, falls er wieder auftritt); die Zählung betroffener Personen 90 Tage.',
        'Nutzungsereignisse der App und die Aufzeichnung der Tage, an denen du Mycen genutzt hast, 25 Monate (danach werden sie automatisch gelöscht); löschst du dein Konto vorher, haben sie keinerlei Verbindung mehr zu dir.',
        'Browser-Benachrichtigungen, bis du sie ausschaltest oder dein Konto löschst; der Verbindungscode gegen Missbrauch, 2 Tage; blockierte Kontakte, bis die Profilinhaberin oder der Profilinhaber sie entsperrt oder das Profil löscht; und das Protokoll dessen, was das Mycen-Team tut, 3 Jahre.',
        'Was das Gesetz aufzubewahren verlangt (zum Beispiel Rechnungsdaten), für die dort festgelegte Frist.',
      ] },
    ] },
    { id: 'dispositivo', title: 'Was auf deinem Gerät gespeichert wird', body: [
      'Mycen verwendet keine Werbe- oder Tracking-Cookies. In deinem Browser speichern wir nur, was für den Betrieb nötig ist: deine Sitzung, deine Sprache und einige Entwürfe und Einstellungen. Du kannst das in den Browser-Einstellungen löschen (dann musst du dich neu anmelden). Wenn du in Life OS offline etwas einträgst, bleibt es auf deinem Gerät, bis es hochgeladen wird (nur mit deiner Sitzung). Von der Tagebuch-PIN speichern wir nur einen verschlüsselten Fingerabdruck (Hash), nie die PIN.',
    ] },
    { id: 'seguridad', title: 'Sicherheit', body: [
      'Wir nutzen verschlüsselte Verbindungen, verschlüsselt gespeicherte Passwörter und Berechtigungen in der Datenbank, damit jede Person nur ihre eigenen Daten sieht. Kein System ist perfekt: Sollte etwas deine Daten betreffen, informieren wir dich und handeln wie gesetzlich vorgeschrieben.',
    ] },
    { id: 'derechos', title: 'Deine Rechte', body: [
      'Du kannst Auskunft über deine Daten verlangen, sie berichtigen, löschen, mitnehmen (Datenübertragbarkeit), bestimmten Nutzungen widersprechen oder sie einschränken lassen und eine erteilte Einwilligung widerrufen. Vieles erledigst du direkt in Studio → Einstellungen (Daten herunterladen, Konto löschen) oder in Life OS → Einstellungen → Deine Daten. Für alles andere schreib an **team@mycen.id** von der E-Mail-Adresse deines Kontos.',
      'Wir antworten innerhalb der gesetzlichen Fristen (in der Europäischen Union innerhalb eines Monats; in Argentinien 10 Kalendertage für die Auskunft und 5 Werktage für Berichtigung oder Löschung). Du kannst dich auch bei einer Datenschutzaufsichtsbehörde beschweren: in der Europäischen Union bei der Behörde deines Landes; in Argentinien bei der **Agencia de Acceso a la Información Pública (AAIP)**; in Brasilien bei der **ANPD**.',
      'Wenn du in Kalifornien lebst: Wir verkaufen deine personenbezogenen Daten nicht und teilen sie nicht für Werbung, und wir behandeln dich nicht anders, weil du deine Rechte ausübst.',
    ] },
    { id: 'menores', title: 'Minderjährige', body: [
      'Mycen richtet sich nicht an Kinder unter 13 Jahren und auch nicht an Personen unter 16 in Ländern der Europäischen Union oder des Europäischen Wirtschaftsraums, die dieses Alter für die Verarbeitung ihrer Daten ohne Zustimmung der Eltern verlangen (und nicht an Personen unter einem höheren Alter, das das Recht ihres Landes festlegt). Wir erheben nicht wissentlich Daten von Personen unter diesem Alter: Erfahren wir, dass ein Konto einer solchen Person gehört, löschen wir das Konto und seine Daten. Wenn du als Elternteil oder Erziehungsberechtigter meinst, dass das passiert ist, schreib uns an **team@mycen.id**.',
    ] },
    { id: 'cambios', title: 'Änderungen dieser Erklärung', body: [
      'Ändern wir diese Erklärung wesentlich, informieren wir dich per E-Mail oder in Mycen, bevor sie gilt. Oben siehst du immer das Datum der letzten Aktualisierung.',
    ] },
  ],
}

export default de
