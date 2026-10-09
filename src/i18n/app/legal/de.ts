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
  },
  updated: es.updated,
  terms: [
    { id: 'quien', title: 'Wer den Dienst anbietet', body: [
      'Mycen ist ein Dienst von **Resilio** mit Sitz in der Argentinischen Republik. Du erreichst uns unter **team@mycen.id**.',
      'Mit Mycen erstellst du eine öffentliche digitale Identität (Mycen Identity), verwaltest sie in Mycen Studio, organisierst dein Privatleben in Life OS und führst, wenn du ein Unternehmen hast, dieses mit Mycen Business.',
    ] },
    { id: 'edad', title: 'Wer Mycen nutzen darf', body: [
      'Du musst mindestens **13 Jahre** alt sein. Ist in deinem Land das Mindestalter für die Zustimmung zu diesen Bedingungen oder für die Verarbeitung deiner Daten höher (in Deutschland zum Beispiel 16 Jahre), musst du dieses Alter haben oder die Zustimmung deiner Eltern oder Erziehungsberechtigten.',
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
    ] },
    { id: 'derechos-de-autor', title: 'Urheberrecht und Marken', body: [
      'Wenn du meinst, dass etwas auf Mycen dein Werk oder deine Marke ohne Erlaubnis nutzt, schreib an **team@mycen.id** mit: deinen Kontaktdaten, welches Werk oder welche Marke dir gehört, der genauen Adresse des Inhalts auf Mycen und der Erklärung, dass die Angaben stimmen und du Rechteinhaber bist oder in dessen Namen handelst.',
      'Ist die Beschwerde berechtigt, entfernen oder sperren wir den Inhalt und informieren die Person, die ihn veröffentlicht hat; sie kann ihre Sicht darlegen. Wer wiederholt fremde Inhalte ohne Erlaubnis veröffentlicht, kann sein Konto verlieren.',
    ] },
    { id: 'usernames', title: 'Benutzernamen', body: [
      'Manche Namen sind reserviert. Es ist nicht erlaubt, Namen zu registrieren, um sich als andere Person oder Marke auszugeben oder um sie weiterzuverkaufen; in solchen Fällen können wir sie zurückholen. Wenn du deinen Benutzernamen änderst, leitet die alte Adresse auf die neue weiter, damit deine Links und QR-Codes weiter funktionieren.',
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
    { id: 'responsable', title: 'Wer für deine Daten verantwortlich ist', body: [
      'Verantwortlicher ist **Resilio** mit Sitz in der Argentinischen Republik, der Betreiber von Mycen. Bei Fragen zu deinen Daten schreib an **team@mycen.id**.',
      'Nutzt ein Unternehmen Mycen Business für Daten seiner eigenen Kunden (Bestellungen, Reservierungen, Termine), ist dieses Unternehmen für diese Daten verantwortlich, und Mycen verarbeitet sie in seinem Auftrag und nach seinen Weisungen.',
    ] },
    { id: 'datos', title: 'Welche Daten wir nutzen', body: [
      { list: [
        '**Dein Konto:** Name, E-Mail, Passwort (verschlüsselt gespeichert, wir sehen es nie), Sprache, Währung, Zeitzone und das Datum, an dem du diese Bedingungen akzeptiert hast.',
        '**Dein öffentliches Profil:** was du in Studio einträgst (Name, Foto, Texte, Links, Projekte, Kontaktkarte). Veröffentlicht wird nur, was du zeigen willst.',
        '**Life OS:** deine Ziele, Gewohnheiten, Aufgaben, Finanzen und Notizen. Sie sind privat: Nur du siehst sie.',
        '**Mycen Business:** die Daten deines Unternehmens und was du über deine Kunden und Verkäufe einträgst.',
        '**Besuchsstatistiken:** anonyme Ereignisse (Besuche und Klicks auf deinem Profil) mit einer Kennung, die sich täglich ändert. Wir speichern weder IP-Adressen noch Gerätedaten und zählen keine Bots.',
        '**Meldungen:** Grund und Details der meldenden Person, mit einer täglichen anonymen Kennung gegen Missbrauch.',
        '**Technische Fehler:** Wenn etwas schiefgeht, speichern wir die Fehlermeldung, die Ansicht, die Mycen-Version und den Browser (zum Beispiel „Chrome 128 · Android“), ohne IP oder personenbezogene Daten, um ihn beheben zu können.',
      ] },
    ] },
    { id: 'para-que', title: 'Wofür wir sie nutzen und auf welcher Grundlage', body: [
      { list: [
        '**Den Dienst erbringen**, den du mit deinem Konto angefordert hast: deine Informationen speichern, anzeigen und synchronisieren (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).',
        '**Mycen sicher und funktionsfähig halten:** Missbrauch verhindern, Meldungen prüfen und Fehler beheben (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO).',
        '**Dir Statistiken** zu deinem Profil zeigen, anonym (berechtigtes Interesse).',
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
        '**YouTube, Vimeo, TikTok, Spotify und SoundCloud:** nur wenn ein Profil ein Video oder einen Song einbettet und du auf „Abspielen“ tippst. Vorher besteht keine Verbindung zu ihnen; ab dann gelten ihre eigenen Richtlinien.',
        '**Anthropic:** nur wenn ein Unternehmen den Import seiner Speisekarte aus einem PDF nutzt; diese Datei wird verarbeitet.',
        '**Mercado Pago:** nur wenn ein Unternehmen es für Zahlungen einrichtet; die Zahlung erfolgt bei Mercado Pago.',
      ] },
      'Darüber hinaus teilen wir Daten nur, wenn das Gesetz es verlangt oder um die Rechte und die Sicherheit von Menschen zu schützen.',
    ] },
    { id: 'transferencias', title: 'Daten außerhalb deines Landes', body: [
      'Unsere Dienstleister können Daten auf Servern in anderen Ländern speichern oder verarbeiten, etwa in den USA oder in Ländern der Europäischen Union. Dann nutzen wir die gesetzlich vorgesehenen Garantien, etwa von den Datenschutzbehörden genehmigte Standardvertragsklauseln, damit deine Daten angemessen geschützt sind.',
    ] },
    { id: 'plazos', title: 'Wie lange wir sie speichern', body: [
      { list: [
        'Die Daten deines Kontos, deines Profils und von Life OS, solange du das Konto hast. Löschst du es, löschen wir sie; Sicherungskopien der Dienstleister werden in ihren üblichen Zyklen überschrieben.',
        'Besuchsstatistiken werden zusammengefasst und anonym gespeichert.',
        'Fehlerprotokolle werden bis zur Behebung gespeichert; die Zählung betroffener Personen 90 Tage.',
        'Was das Gesetz aufzubewahren verlangt (zum Beispiel Rechnungsdaten), für die dort festgelegte Frist.',
      ] },
    ] },
    { id: 'dispositivo', title: 'Was auf deinem Gerät gespeichert wird', body: [
      'Mycen verwendet keine Werbe- oder Tracking-Cookies. In deinem Browser speichern wir nur, was für den Betrieb nötig ist: deine Sitzung, deine Sprache und einige Entwürfe und Einstellungen. Du kannst das in den Browser-Einstellungen löschen (dann musst du dich neu anmelden).',
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
      'Mycen richtet sich nicht an Kinder unter 13 Jahren. Erfahren wir, dass ein Konto ohne Zustimmung jemandem unter diesem Alter (oder dem im jeweiligen Land geltenden) gehört, löschen wir es. Wenn du als Elternteil oder Erziehungsberechtigter meinst, dass das passiert ist, schreib uns.',
    ] },
    { id: 'cambios', title: 'Änderungen dieser Erklärung', body: [
      'Ändern wir diese Erklärung wesentlich, informieren wir dich per E-Mail oder in Mycen, bevor sie gilt. Oben siehst du immer das Datum der letzten Aktualisierung.',
    ] },
  ],
}

export default de
