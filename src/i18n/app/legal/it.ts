import type { LegalDict } from './es'
import es from './es'

const it: LegalDict = {
  ui: {
    termsTitle: 'Termini e condizioni',
    privacyTitle: 'Informativa sulla privacy',
    termsIntro: 'Creando un account o usando Mycen accetti queste condizioni. Sono scritte per essere capite.',
    privacyIntro: 'Quali dati usiamo, per cosa, con chi li condividiamo e quale controllo hai.',
    updated: 'Ultimo aggiornamento',
    contents: 'Indice',
    reference: 'La versione di riferimento è quella in spagnolo. Le traduzioni sono per tua comodità; in caso di differenze prevale il testo spagnolo.',
    seeOther: { terms: 'Informativa sulla privacy', privacy: 'Termini e condizioni' },
    language: 'Lingua',
    back: 'Torna a Mycen',
  },
  updated: es.updated,
  terms: [
    { id: 'quien', title: 'Chi fornisce il servizio', body: [
      'Mycen è un servizio gestito da **Resilio**, con sede nella Repubblica Argentina. Puoi scriverci a **team@mycen.id**.',
      'Mycen ti permette di creare un’identità digitale pubblica (Mycen Identity), gestirla da Mycen Studio, organizzare la tua vita personale in Life OS e, se hai un’attività, gestirla con Mycen Business.',
    ] },
    { id: 'edad', title: 'Chi può usare Mycen', body: [
      'Devi avere almeno **13 anni**. Se nel tuo paese l’età minima per accettare queste condizioni o per il trattamento dei tuoi dati è più alta (per esempio 14 anni in Italia), devi avere quell’età o l’autorizzazione di un genitore o tutore.',
      'Per usare Mycen Business per conto di un’attività devi essere maggiorenne e autorizzato a rappresentarla.',
    ] },
    { id: 'cuenta', title: 'Il tuo account', body: [
      'Sei responsabile di custodire la tua password e di ciò che succede nel tuo account. I dati che inserisci devono essere veri e tuoi, oppure devi avere il permesso di usarli.',
      'Se noti un uso che non hai autorizzato, cambia la password e scrivici.',
    ] },
    { id: 'contenido', title: 'I tuoi contenuti', body: [
      'Ciò che pubblichi resta tuo. Ci concedi un permesso gratuito e mondiale per conservarlo, mostrarlo al tuo indirizzo pubblico e adattarlo tecnicamente (per esempio ridurre le immagini) finché resta pubblicato. Puoi modificarlo, nasconderlo, ritirarlo o eliminarlo quando vuoi.',
      'Ciò che pubblichi deve rispettare le regole sui contenuti. Possiamo nascondere o sospendere ciò che non le rispetta.',
    ] },
    { id: 'reglas', title: 'Regole sui contenuti', body: [
      'Su Mycen non è consentito pubblicare:',
      { list: [
        '**Spam o pubblicità ingannevole:** false promesse, link che non portano dove dicono o recensioni inventate.',
        '**Truffe o frodi:** chiedere soldi o dati con l’inganno, vendere ciò che non esiste.',
        '**Sostituzione di persona:** spacciarsi per un’altra persona, azienda o marchio.',
        '**Odio o molestie:** attaccare persone o gruppi per ciò che sono, o molestare qualcuno.',
        '**Violenza o minacce:** minacciare, incitare alla violenza o mostrarla gratuitamente.',
        '**Contenuti sessuali espliciti**, e qualsiasi contenuto sessuale che coinvolga minori (segnalato alle autorità).',
        '**Qualcosa di illegale:** prodotti o servizi vietati, o contenuti che violano diritti altrui (marchi, foto, testi).',
        '**Link dannosi:** virus, phishing o siti ingannevoli.',
      ] },
      'Chiunque può segnalare un profilo o un progetto con il link "Segnala" in fondo alla pagina, senza account e in forma anonima. Esaminiamo ogni segnalazione. Se un profilo viola le regole, lo sospendiamo: non è più visibile (pagina, progetti e biglietto da visita) e il proprietario vede il motivo in Studio. Se pensi che sia un errore, scrivici dall’account con cui l’hai creato e lo riesamineremo.',
    ] },
    { id: 'derechos-de-autor', title: 'Diritto d’autore e marchi', body: [
      'Se ritieni che qualcosa pubblicato su Mycen usi una tua opera o un tuo marchio senza permesso, scrivi a **team@mycen.id** indicando: i tuoi contatti, quale opera o marchio è tuo, l’indirizzo esatto del contenuto su Mycen e una dichiarazione che le informazioni sono corrette e che sei il titolare o agisci per suo conto.',
      'Se il reclamo è fondato, rimuoviamo o blocchiamo il contenuto e avvisiamo chi l’ha pubblicato, che può rispondere. Chi pubblica ripetutamente contenuti altrui senza permesso può perdere l’account.',
    ] },
    { id: 'usernames', title: 'Nomi utente', body: [
      'Alcuni nomi sono riservati. Non è consentito registrare nomi per spacciarsi per un’altra persona o un marchio, né per rivenderli; in quei casi possiamo recuperarli. Se cambi nome utente, il vecchio indirizzo reindirizza al nuovo così i tuoi link e QR continuano a funzionare.',
    ] },
    { id: 'pagos', title: 'Piani a pagamento di Mycen Business', body: [
      'La tua identità, Studio e Life OS sono gratuiti. I piani di Mycen Business hanno il prezzo mostrato al momento della sottoscrizione, in dollari statunitensi (US$), più le imposte applicabili nel tuo paese.',
      'Non c’è un vincolo minimo: puoi disdire quando vuoi e il piano resta attivo fino alla fine del periodo pagato. Se cambiamo un prezzo, ti avvisiamo prima e il cambio vale dal periodo successivo. Se sei un consumatore, conservi i diritti che ti dà la legge del tuo paese, come il diritto di recesso per gli acquisti a distanza.',
    ] },
    { id: 'servicio', title: 'Il servizio', body: [
      'Lavoriamo perché Mycen funzioni sempre bene, ma possono esserci interruzioni, errori o cambiamenti. Le funzioni possono cambiare, migliorare o non essere più disponibili; se cambia qualcosa di importante, ti avvisiamo in anticipo quando possibile.',
      'Nei limiti consentiti dalla legge, Mycen è offerto "così com’è" e non rispondiamo di danni indiretti né di mancati guadagni derivanti dall’uso del servizio. Nulla di ciò limita i diritti che la legge del tuo paese non consente di limitare, come i diritti dei consumatori.',
    ] },
    { id: 'baja', title: 'Chiusura e sospensione', body: [
      'Puoi eliminare il tuo account quando vuoi da Studio → Impostazioni, scaricando prima una copia dei tuoi dati. Gli account con un’attività attiva su Mycen Business si chiudono tramite l’assistenza, perché riguardano dati di clienti e vendite.',
      'Possiamo sospendere o chiudere account che violano queste condizioni o la legge, o che mettono a rischio altre persone o il servizio. Quando possibile, ti avvisiamo e spieghiamo il motivo.',
    ] },
    { id: 'cambios', title: 'Modifiche a queste condizioni', body: [
      'Se modifichiamo queste condizioni in modo importante, ti avvisiamo via email o dentro Mycen prima che entrino in vigore. Se non sei d’accordo, puoi smettere di usare il servizio ed eliminare il tuo account.',
    ] },
    { id: 'ley', title: 'Legge applicabile', body: [
      'Queste condizioni sono regolate dalle leggi della Repubblica Argentina. Se usi Mycen come consumatore da un altro paese, ti tutelano anche le norme inderogabili del tuo paese e puoi agire davanti ai tribunali del tuo domicilio.',
      'Prima di qualsiasi reclamo, scrivici a **team@mycen.id**: quasi tutto si risolve parlando.',
    ] },
  ],
  privacy: [
    { id: 'responsable', title: 'Chi è responsabile dei tuoi dati', body: [
      'Il titolare del trattamento è **Resilio**, con sede nella Repubblica Argentina, che gestisce Mycen. Per qualsiasi domanda sui tuoi dati scrivi a **team@mycen.id**.',
      'Quando un’attività usa Mycen Business per gestire i dati dei propri clienti (ordini, prenotazioni, appuntamenti), è quell’attività la titolare di quei dati e Mycen li tratta per suo conto e secondo le sue istruzioni.',
    ] },
    { id: 'datos', title: 'Quali dati usiamo', body: [
      { list: [
        '**Il tuo account:** nome, email, password (conservata cifrata, non la vediamo mai), lingua, valuta, fuso orario e data in cui hai accettato queste condizioni.',
        '**Il tuo profilo pubblico:** ciò che inserisci in Studio (nome, foto, testi, link, progetti, biglietto da visita). Si pubblica solo ciò che decidi di mostrare.',
        '**Life OS:** i tuoi obiettivi, abitudini, attività, finanze e note. Sono privati: solo tu puoi vederli.',
        '**Mycen Business:** i dati della tua attività e ciò che inserisci sui tuoi clienti e sulle vendite.',
        '**Statistiche delle visite:** eventi anonimi (visite e clic sul tuo profilo) con un identificativo che cambia ogni giorno. Non conserviamo indirizzi IP né dati del dispositivo e non contiamo i bot.',
        '**Segnalazioni:** il motivo e i dettagli scritti da chi segnala, con un identificativo anonimo giornaliero per evitare abusi.',
        '**Messaggi del modulo di contatto:** il nome, il contatto (email o WhatsApp) e il messaggio lasciati da un visitatore. Li vede solo la persona proprietaria del profilo, in Studio; non vengono pubblicati né inviati per email. Per evitare abusi usiamo un identificatore anonimo che cambia ogni giorno, senza IP né dati del dispositivo.',
        '**Errori tecnici:** quando qualcosa non funziona, conserviamo il messaggio di errore, la schermata, la versione di Mycen e il browser (per esempio "Chrome 128 · Android"), senza IP né dati personali, per poterlo correggere.',
      ] },
    ] },
    { id: 'para-que', title: 'Per cosa li usiamo e su quale base', body: [
      { list: [
        '**Fornirti il servizio** che hai chiesto creando l’account: conservare, mostrare e sincronizzare le tue informazioni (esecuzione del contratto).',
        '**Mantenere Mycen sicuro e funzionante:** prevenire abusi, esaminare segnalazioni e correggere errori (legittimo interesse).',
        '**Mostrarti statistiche** sul tuo profilo, in forma anonima (legittimo interesse).',
        '**Inviarti le email necessarie** sul tuo account: conferma, recupero della password e modifiche importanti.',
        '**Rispettare la legge** quando un’autorità competente lo richiede.',
      ] },
      'Non vendiamo i tuoi dati, non li usiamo per la pubblicità e su Mycen non ci sono tracker di terze parti.',
    ] },
    { id: 'publico', title: 'Cosa è pubblico', body: [
      'La tua pagina pubblica mostra solo ciò che pubblichi. Moduli nascosti, bozze e Spaces non pubblicati non si vedono. I profili pubblici possono comparire nei motori di ricerca; se scegli la visibilità "non in elenco" o "privata", non vengono inclusi nella mappa del sito letta dai motori di ricerca.',
    ] },
    { id: 'proveedores', title: 'Con chi li condividiamo', body: [
      'Usiamo fornitori che trattano i dati solo per fornire il servizio e sotto contratto:',
      { list: [
        '**Supabase:** database, accesso e file.',
        '**Vercel:** hosting dell’applicazione e consegna delle pagine.',
        '**Resend:** invio delle email del tuo account.',
        '**YouTube, Vimeo, TikTok, Spotify e SoundCloud:** solo se un profilo integra un video o un brano e tocchi "Riproduci". Prima non ci colleghiamo a loro; da quel momento valgono le loro politiche.',
        '**Anthropic:** solo se un’attività usa l’importazione del menu da un PDF; viene elaborato quel file.',
        '**Mercado Pago:** solo se un’attività lo configura per incassare; il pagamento avviene su Mercado Pago.',
      ] },
      'Al di fuori di questo, condividiamo dati solo se la legge lo impone o per proteggere i diritti e la sicurezza delle persone.',
    ] },
    { id: 'transferencias', title: 'Dati fuori dal tuo paese', body: [
      'I nostri fornitori possono conservare o trattare dati su server in altri paesi, come gli Stati Uniti o paesi dell’Unione Europea. In quel caso usiamo le garanzie previste dalla legge, come clausole contrattuali approvate dalle autorità per la protezione dei dati, affinché i tuoi dati abbiano un livello di protezione adeguato.',
    ] },
    { id: 'plazos', title: 'Per quanto tempo li conserviamo', body: [
      { list: [
        'I dati del tuo account, del profilo e di Life OS, finché hai l’account. Se lo elimini, li cancelliamo; le copie di sicurezza dei fornitori vengono sovrascritte nei loro cicli abituali.',
        'Le statistiche delle visite sono conservate aggregate e anonime.',
        'I messaggi del modulo di contatto, finché la persona proprietaria del profilo non li elimina o elimina il proprio account.',
        'I registri degli errori sono conservati finché non vengono risolti; il conteggio delle persone coinvolte, 90 giorni.',
        'Ciò che la legge obbliga a conservare (per esempio i dati di fatturazione), per il periodo che stabilisce.',
      ] },
    ] },
    { id: 'dispositivo', title: 'Cosa resta sul tuo dispositivo', body: [
      'Mycen non usa cookie pubblicitari né di tracciamento. Nel tuo browser conserviamo solo il necessario per funzionare: la sessione, la lingua e alcune bozze e preferenze. Puoi cancellarlo dalle impostazioni del browser (dovrai accedere di nuovo).',
    ] },
    { id: 'seguridad', title: 'Sicurezza', body: [
      'Usiamo connessioni cifrate, password conservate cifrate e permessi nel database perché ogni persona veda solo i propri dati. Nessun sistema è perfetto: se accadesse qualcosa che riguarda i tuoi dati, ti avviseremmo e agiremmo come previsto dalla legge.',
    ] },
    { id: 'derechos', title: 'I tuoi diritti', body: [
      'Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, portarli con te (portabilità), opporti a certi usi o limitarli e revocare un consenso dato. Molte cose le fai direttamente da Studio → Impostazioni (scaricare i dati, eliminare l’account) o da Life OS → Impostazioni → I tuoi dati. Per il resto scrivi a **team@mycen.id** dall’email del tuo account.',
      'Rispondiamo entro i termini di legge (nell’Unione Europea entro un mese; in Argentina 10 giorni di calendario per l’accesso e 5 giorni lavorativi per correggere o cancellare). Puoi anche presentare reclamo all’autorità per la protezione dei dati: in Italia il **Garante per la protezione dei dati personali**; negli altri paesi dell’Unione Europea, l’autorità nazionale; in Argentina l’**Agencia de Acceso a la Información Pública (AAIP)**; in Brasile l’**ANPD**.',
      'Se vivi in California: non vendiamo né condividiamo i tuoi dati personali per la pubblicità e non ti tratteremo diversamente perché eserciti i tuoi diritti.',
    ] },
    { id: 'menores', title: 'Minori', body: [
      'Mycen non è rivolto ai minori di 13 anni. Se scopriamo che un account appartiene a qualcuno sotto quell’età (o quella fissata dalla legge del suo paese) senza autorizzazione, lo eliminiamo. Se sei un genitore o tutore e pensi che sia successo, scrivici.',
    ] },
    { id: 'cambios', title: 'Modifiche a questa informativa', body: [
      'Se modifichiamo questa informativa in modo importante, ti avvisiamo via email o dentro Mycen prima che si applichi. In alto vedrai sempre la data dell’ultimo aggiornamento.',
    ] },
  ],
}

export default it
