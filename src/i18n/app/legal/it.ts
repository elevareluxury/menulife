import type { LegalDict } from './es'
import es from './es'

const it: LegalDict = {
  ui: {
    termsTitle: "Termini e condizioni",
    privacyTitle: "Informativa sulla privacy",
    termsIntro: "Creando un account o usando Mycen accetti queste condizioni. Sono scritte per essere capite.",
    privacyIntro: "Quali dati usiamo, per cosa, con chi li condividiamo e quale controllo hai.",
    updated: "Ultimo aggiornamento",
    contents: "Indice",
    reference: "Fa fede la versione in spagnolo. Le traduzioni sono fornite per comodità; in caso di differenze prevale il testo spagnolo, salvo che la legge del tuo paese disponga diversamente.",
    seeOther: { terms: "Informativa sulla privacy", privacy: "Termini e condizioni" },
    language: "Lingua",
    back: "Torna a Mycen",
    supportTitle: "Aiuto e assistenza",
    supportIntro: "Come scriverci e risposte alle domande più frequenti.",
    deletionTitle: "Eliminare il tuo account Mycen",
    deletionIntro: "Come eliminare il tuo account e i tuoi dati Mycen (app e web), cosa viene cancellato e cosa può restare.",
  },
  updated: es.updated,
  support: [
    { id: "contacto", title: "Scrivici", body: [
      "Per qualsiasi domanda, problema o richiesta scrivi a **team@mycen.id**. Indicaci il tuo nome utente Mycen (o l’email dell’account) e, se puoi, invia uno screenshot. Rispondiamo il prima possibile.",
    ] },
    { id: "acceso", title: "Entrare nel tuo account", body: [
      { list: [
        "**Ho dimenticato la password:** nella schermata di accesso tocca “Password dimenticata?” e segui il link che ricevi via email.",
        "**Non mi è arrivata l’email di conferma:** controlla spam e promozioni. Se non c’è, registrati di nuovo con la stessa email e te la rimandiamo.",
        "**Sono entrato con Google:** usa sempre lo stesso pulsante; non serve una password.",
      ] },
    ] },
    { id: "datos", title: "I tuoi dati", body: [
      { list: [
        "**Scaricarli:** Studio → Impostazioni → “Scarica i miei dati” (profilo, moduli e Life OS in un file). In Life OS → Impostazioni → “I tuoi dati” puoi scaricare anche Soldi in CSV.",
        "**Eliminare l’account:** da Studio → Impostazioni o Life OS → Impostazioni → Account. Tutti i passaggi, e cosa viene cancellato, su **mycen.id/eliminar-cuenta**.",
      ] },
    ] },
    { id: "seguridad", title: "Segnalare o bloccare", body: [
      { list: [
        "**Un profilo:** in qualsiasi profilo pubblico tocca “Segnala”. Lo esamina il team di Mycen e il proprietario non sa chi ha segnalato.",
        "**Un messaggio:** in Studio → Messaggi, “Segnala” invia il messaggio al team e blocca chi l’ha scritto; “Blocca” smette solo di ricevere i suoi messaggi.",
      ] },
      "Se è urgente o qualcuno è in pericolo, scrivi a **team@mycen.id** con oggetto “Urgente”.",
    ] },
  ],
  deletion: [
    { id: "app", title: "Dall’app o dal web", body: [
      "Accedi e scegli una di queste opzioni:",
      { list: [
        "**Life OS → Impostazioni → Account → “Elimina il mio account”**",
        "**Studio → Impostazioni → “Elimina il mio account”**",
      ] },
      "Per confermare scrivi la parola che ti chiediamo. L’account viene cancellato subito.",
    ] },
    { id: "sin-acceso", title: "Se non riesci ad accedere", body: [
      "Scrivi a **team@mycen.id** dall’email del tuo account, con oggetto “Elimina il mio account”. Lo cancelliamo entro i termini di legge (in Argentina, 5 giorni lavorativi) e ti avvisiamo quando è fatto.",
    ] },
    { id: "que-se-borra", title: "Cosa viene cancellato", body: [
      { list: [
        "Il tuo account e l’email di accesso.",
        "La tua identità: profili, Spaces, moduli, progetti, immagini, versioni pubblicate, statistiche, messaggi e iscritti.",
        "Tutto Life OS: attività, abitudini, obiettivi, La mia giornata, revisioni, Soldi e diario.",
      ] },
    ] },
    { id: "que-queda", title: "Cosa può restare", body: [
      { list: [
        "I backup dei fornitori, sovrascritti nei loro cicli abituali, e il backup giornaliero di foto e PDF, che conserva ciò che è stato eliminato per 30 giorni.",
        "I registri degli errori, che non sono collegati al tuo account.",
        "Ciò che la legge obbliga a conservare (per esempio, i dati di fatturazione), per il periodo che stabilisce.",
        "Se il tuo account aveva un profilo sospeso, il suo nome utente resta riservato perché nessuno lo riutilizzi, e il registro di quella sospensione è conservato 3 anni.",
        "Se il tuo account ha un’attività in Mycen Business, scrivici: la chiudiamo insieme a te per proteggere i dati di clienti e vendite.",
      ] },
    ] },
  ],
  terms: [
    { id: "quien", title: "Chi fornisce il servizio", body: [
      "Mycen è un servizio gestito da **Luca Cazzoli** (codice fiscale argentino CUIT 20-42325961-3), con il nome commerciale **Resilio**, residente nella Repubblica Argentina. Puoi scriverci a **team@mycen.id**.",
      "Mycen ti permette di creare un’identità digitale pubblica (Mycen Identity), gestirla da Mycen Studio e organizzare la tua vita personale in Life OS. Mycen Business, per gestire attività, non è ancora aperto a nuove attività.",
      "**Punto di contatto:** per gli utenti e per le autorità (anche ai fini del Regolamento europeo sui servizi digitali), scrivi a **team@mycen.id**, in spagnolo o in inglese.",
    ] },
    { id: "edad", title: "Chi può usare Mycen", body: [
      "Per usare Mycen devi avere almeno **13 anni**, o l’età più alta stabilita dalla legge del tuo paese per usare un servizio come questo senza il consenso di un genitore o tutore (per esempio **14** in Corea del Sud e in Cina, e fino a **16** in alcuni paesi dell’Unione europea).",
      "Creando un account confermi di avere l’età richiesta. Se scopriamo che un account appartiene a qualcuno che non ce l’ha, lo eliminiamo.",
      "Per usare Mycen Business per conto di un’attività devi essere maggiorenne e autorizzato a rappresentarla.",
    ] },
    { id: "cuenta", title: "Il tuo account", body: [
      "Sei responsabile di custodire la tua password e di ciò che succede nel tuo account. I dati che inserisci devono essere veri e tuoi, oppure devi avere il permesso di usarli.",
      "Se noti un uso che non hai autorizzato, cambia la password e scrivici.",
    ] },
    { id: "contenido", title: "I tuoi contenuti", body: [
      "Ciò che pubblichi resta tuo. Ci concedi un permesso gratuito e mondiale per conservarlo, mostrarlo al tuo indirizzo pubblico e adattarlo tecnicamente (per esempio ridurre le immagini) finché resta pubblicato. Puoi modificarlo, nasconderlo, ritirarlo o eliminarlo quando vuoi.",
      "Ciò che pubblichi deve rispettare le regole sui contenuti. Possiamo nascondere o sospendere ciò che non le rispetta.",
      "Se pubblichi contenuti o dati di altre persone o marchi (per esempio il contatto della tua agenzia, una citazione della stampa, un logo o i numeri del tuo pubblico), devi averne il diritto e ciò che dici deve essere vero. Se qualcosa è pubblicità a pagamento o una collaborazione in cambio di prodotti, indicalo, come richiedono le leggi sulla pubblicità di molti paesi.",
    ] },
    { id: "reglas", title: "Regole sui contenuti", body: [
      "Su Mycen non è consentito pubblicare:",
      { list: [
        "**Spam o pubblicità ingannevole:** false promesse, link che non portano dove dicono o recensioni inventate.",
        "**Truffe o frodi:** chiedere soldi o dati con l’inganno, vendere ciò che non esiste.",
        "**Sostituzione di persona:** spacciarsi per un’altra persona, azienda o marchio.",
        "**Odio o molestie:** attaccare persone o gruppi per ciò che sono, o molestare qualcuno.",
        "**Violenza o minacce:** minacciare, incitare alla violenza o mostrarla gratuitamente.",
        "**Contenuti sessuali espliciti**, e qualsiasi contenuto sessuale che coinvolga minori (segnalato alle autorità).",
        "**Qualcosa di illegale:** prodotti o servizi vietati, o contenuti che violano diritti altrui (marchi, foto, testi).",
        "**Link dannosi:** virus, phishing o siti ingannevoli.",
      ] },
      "Chiunque può segnalare un profilo o un progetto con il link \"Segnala\" in fondo alla pagina, senza account e in forma anonima. Esaminiamo ogni segnalazione. Se un profilo viola le regole, lo sospendiamo: non è più visibile (pagina, progetti e biglietto da visita) e il proprietario vede il motivo in Studio. Se pensi che sia un errore, scrivici dall’account con cui l’hai creato e lo riesamineremo.",
      "Finché un profilo è sospeso, il suo account non può creare nuovi profili né eliminarlo per ricominciare da zero. Se l’account viene eliminato, quel nome utente resta riservato e non si può riutilizzare.",
      "**Come moderiamo:** combiniamo strumenti automatici e persone. Per esempio, controlliamo i link pubblicati con Google Web Risk e applichiamo limiti automatici contro gli abusi, ma nessun profilo viene sospeso solo da uno strumento automatico: una persona del team esamina ogni caso. Quando nascondiamo o sospendiamo qualcosa ti diciamo cosa, perché e quale regola viola, e puoi chiedere un nuovo esame. Se vivi nell’Unione europea puoi anche rivolgerti a un organismo certificato di risoluzione extragiudiziale delle controversie o ai tribunali. Se un contenuto mostra un pericolo per la vita o la sicurezza di qualcuno, o abusi sessuali su minori, avvisiamo le autorità.",
    ] },
    { id: "uso", title: "Uso corretto del servizio", body: [
      "Oltre alle regole sui contenuti, non è consentito:",
      { list: [
        "**Automatizzare** la creazione di account, le visite, i voti o i messaggi, né usare bot per gonfiare i numeri.",
        "**Copiare in massa** i profili o i dati di altre persone (scraping), salvo ciò che fanno i motori di ricerca con le pagine pubbliche.",
        "**Attaccare o testare la sicurezza** di Mycen senza permesso. Se trovi una vulnerabilità, segnalala a team@mycen.id.",
        "**Aggirare** una sospensione, un blocco o i limiti del servizio, per esempio creando un altro account.",
        "**Vendere, affittare o cedere** il tuo account o il tuo nome utente.",
      ] },
    ] },
    { id: "derechos-de-autor", title: "Diritto d’autore e altri diritti", body: [
      "Se ritieni che qualcosa pubblicato su Mycen violi il tuo diritto d’autore o altri diritti (per esempio il tuo marchio o la tua immagine), puoi chiederci di rimuoverlo. Scrivi a **team@mycen.id** indicando:",
      { list: [
        "**Il link al contenuto:** l’indirizzo esatto su Mycen del profilo, progetto o immagine.",
        "**Chi è il titolare** del diritto e come contattarlo. Se agisci per conto di un’altra persona o azienda, dillo.",
        "**Perché viola il diritto:** di quale opera, marchio o altro diritto si tratta e come viene usato senza permesso.",
        "**Una dichiarazione:** che ritieni in buona fede che quell’uso non sia autorizzato dal titolare, dal suo rappresentante o dalla legge e, sotto pena di falsa testimonianza, che le informazioni sono corrette e che sei il titolare o sei autorizzato ad agire per suo conto.",
        "**La tua firma**, autografa o elettronica (basta il tuo nome completo scritto).",
      ] },
      "Esaminiamo ogni richiesta. Se è fondata, rimuoviamo o blocchiamo il contenuto e avvisiamo chi l’ha pubblicato, spiegando il motivo. Quella persona può risponderci con la sua versione (per esempio, se ha il permesso di usarlo) e riesaminiamo il caso.",
      "**Se rimuoviamo un tuo contenuto e pensi che sia un errore,** inviaci una contronotifica con il link al contenuto rimosso, una dichiarazione sotto pena di falsa testimonianza che ritieni in buona fede che sia stato rimosso per errore o per un’identificazione sbagliata, il tuo nome, indirizzo e telefono, e la tua accettazione della giurisdizione dei tribunali competenti. La inoltriamo a chi ha fatto la richiesta e, se entro 10-14 giorni lavorativi non ci dimostra di aver avviato un’azione legale, possiamo ripubblicarlo.",
      "Gli account che pubblicano ripetutamente contenuti che violano i diritti altrui possono essere sospesi o chiusi.",
    ] },
    { id: "usernames", title: "Nomi utente", body: [
      "Alcuni nomi sono riservati. Non è consentito registrare nomi per spacciarsi per un’altra persona o un marchio, né per rivenderli; in quei casi possiamo recuperarli. Se cambi nome utente, il vecchio indirizzo reindirizza al nuovo così i tuoi link e QR continuano a funzionare.",
      "Non si possono scegliere nomi che imitano banche, portafogli digitali, servizi o marchi noti (per esempio con la parola «banca» o il nome di un marchio): Mycen li rifiuta al momento della scelta. Se il tuo account è verificato e cambi nome o nome utente, la spunta di verifica torna in revisione.",
      "Su richiesta di una persona nota, di un marchio o del suo rappresentante, possiamo riservare il suo nome utente prima che crei l’account: può prenderlo solo quella persona. Se pensi che qualcuno abbia registrato un nome che ti spetta, scrivici con delle prove e lo esamineremo.",
    ] },
    { id: "propiedad", title: "Cosa appartiene a Mycen", body: [
      "Il marchio Mycen, l’impronta, il design e il software di Mycen appartengono ai rispettivi titolari. Queste condizioni ti danno il permesso di usare il servizio, non diritti su questi elementi. Se ci invii idee o suggerimenti, possiamo usarli liberamente per migliorare Mycen, senza alcun obbligo nei tuoi confronti.",
    ] },
    { id: "pagos", title: "Prezzo", body: [
      "Oggi Mycen è **gratuito**: la tua identità, Studio e Life OS non hanno costi e non ti chiediamo alcun metodo di pagamento.",
      "Se in futuro aggiungeremo piani a pagamento (per esempio quando aprirà Mycen Business), ti avviseremo prima, con il prezzo in dollari statunitensi (US$) più le imposte del tuo paese, e nulla di ciò che oggi usi gratis diventerà a pagamento senza il tuo consenso. Non ci sarà una durata minima e, se sei un consumatore, conservi i diritti che ti dà la legge del tuo paese, come il recesso da un acquisto a distanza.",
    ] },
    { id: "servicio", title: "Il servizio", body: [
      "Lavoriamo perché Mycen funzioni sempre bene, ma possono esserci interruzioni, errori o cambiamenti. Le funzioni possono cambiare, migliorare o non essere più disponibili; se cambia qualcosa di importante, ti avvisiamo in anticipo quando possibile.",
      "Nei limiti consentiti dalla legge, Mycen è offerto \"così com’è\" e non rispondiamo di danni indiretti né di mancati guadagni derivanti dall’uso del servizio. Nulla di ciò limita i diritti che la legge del tuo paese non consente di limitare, come i diritti dei consumatori.",
      "I link, i video, le canzoni e i servizi di terzi che compaiono nei profili appartengono a quei terzi: non li controlliamo e non ne rispondiamo.",
      "Se dovessimo comunque rispondere, la nostra responsabilità complessiva è limitata a quanto ci hai pagato nei 12 mesi precedenti o a 100 US$, a seconda di quale importo sia maggiore. Questo limite non si applica in caso di dolo o colpa grave, danni alla vita o alla salute, né dove la legge non consente di limitarla.",
    ] },
    { id: "baja", title: "Chiusura e sospensione", body: [
      "Puoi eliminare il tuo account quando vuoi da Studio → Impostazioni, scaricando prima una copia dei tuoi dati. Gli account con un’attività attiva su Mycen Business si chiudono tramite l’assistenza, perché riguardano dati di clienti e vendite.",
      "Possiamo sospendere o chiudere account che violano queste condizioni o la legge, o che mettono a rischio altre persone o il servizio. Quando possibile, ti avvisiamo e spieghiamo il motivo.",
    ] },
    { id: "apps", title: "Se usi l’app per iPhone o Android", body: [
      "Se hai scaricato Mycen dall’App Store di Apple, vale anche quanto segue:",
      { list: [
        "Queste condizioni sono tra te e Mycen, non con Apple. Apple non è responsabile dell’app né dei suoi contenuti.",
        "Puoi usare l’app sui dispositivi Apple che possiedi o controlli, secondo le regole d’uso dell’App Store.",
        "Apple non ha alcun obbligo di fornire manutenzione o assistenza per l’app; per questo scrivici a team@mycen.id.",
        "Se l’app non rispetta una garanzia applicabile, puoi avvisare Apple, che ti rimborserà quanto pagato (l’app è gratuita); Apple non ha altri obblighi di garanzia. I reclami relativi all’app (responsabilità per prodotto, conformità alla legge, tutela dei consumatori o diritti di proprietà intellettuale di terzi) sono gestiti da Mycen, non da Apple.",
        "Dichiari di non trovarti in un paese soggetto a embargo degli Stati Uniti e di non figurare in elenchi statunitensi di soggetti con divieti o restrizioni.",
        "Apple e le sue controllate sono terzi beneficiari di queste condizioni e possono farle valere nei tuoi confronti.",
      ] },
      "Se l’hai scaricata da Google Play, si applicano anche le condizioni di Google Play.",
    ] },
    { id: "cambios", title: "Modifiche a queste condizioni", body: [
      "Se modifichiamo queste condizioni in modo importante, ti avvisiamo via email o dentro Mycen prima che entrino in vigore. Se non sei d’accordo, puoi smettere di usare il servizio ed eliminare il tuo account.",
    ] },
    { id: "ley", title: "Legge applicabile", body: [
      "Queste condizioni sono regolate dalle leggi della Repubblica Argentina. Se usi Mycen come consumatore da un altro paese, ti tutelano anche le norme inderogabili del tuo paese e puoi agire davanti ai tribunali del tuo domicilio.",
      "**Altre condizioni:** se una parte di queste condizioni non fosse valida, il resto resta in vigore. Non far valere un diritto in un certo momento non significa rinunciarvi. Non rispondiamo di ritardi o mancanze causati da eventi fuori dal nostro ragionevole controllo. Possiamo cedere queste condizioni se Mycen passa a un’altra persona o società (per esempio con la costituzione di una società), con preavviso; tu non puoi cederle senza il nostro accordo. Queste condizioni e l’informativa sulla privacy costituiscono l’intero accordo tra te e Mycen.",
      "Prima di qualsiasi reclamo, scrivici a **team@mycen.id**: quasi tutto si risolve parlando.",
    ] },
  ],
  privacy: [
    { id: "responsable", title: "Chi è responsabile dei tuoi dati", body: [
      "Il titolare del trattamento è **Luca Cazzoli** (codice fiscale argentino CUIT 20-42325961-3), che gestisce Mycen con il nome commerciale **Resilio** ed è residente nella Repubblica Argentina. Per qualsiasi domanda sui tuoi dati scrivi a **team@mycen.id**.",
      "Quando un’attività usa Mycen Business per gestire i dati dei propri clienti (ordini, prenotazioni, appuntamenti), è quell’attività la titolare di quei dati e Mycen li tratta per suo conto e secondo le sue istruzioni.",
      "Mycen non ha uno stabilimento nell’Unione europea né nel Regno Unito. Per qualsiasi questione di protezione dei dati — anche per contattare il responsabile richiesto dalla legge del tuo paese, come l’«encarregado» della LGPD in Brasile o il responsabile dei reclami previsto dalla legge indiana — scrivi a **team@mycen.id**.",
    ] },
    { id: "datos", title: "Quali dati usiamo", body: [
      { list: [
        "**Il tuo account:** nome, email, password (conservata cifrata, non la vediamo mai), lingua, valuta, fuso orario e data in cui hai accettato queste condizioni. Se attivi la verifica in due passaggi, anche la chiave della tua app di autenticazione (conservata cifrata da Supabase).",
        "**Nomi riservati e impronta o volto:** se il team di Mycen ha riservato il tuo nome utente su tua richiesta o su richiesta della tua agenzia o del tuo rappresentante (che ci fornisce questi dati se non hai ancora un account), conserviamo il tuo nome, la tua email e una nota finché dura la riserva, solo perché nessun altro lo usi. Se accedi con l’impronta o il volto, questi dati non lasciano mai il tuo dispositivo: Mycen (con Supabase) conserva solo una chiave pubblica.",
        "**Portfolio (misure, pubblico, brand, stampa, crediti e rappresentanza):** sono dati che inserisci tu, facoltativi, e appaiono sul tuo profilo pubblico solo se li compili e il modulo è visibile. Mycen non li verifica né li calcola: i numeri del pubblico portano la data che hai indicato e smettono di apparire dopo un anno. Puoi cambiarli o nasconderli quando vuoi.",
        "**Il tuo profilo pubblico:** ciò che inserisci in Studio (nome, foto, testi, link, progetti, biglietto da visita). Viene pubblicato solo ciò che decidi di mostrare. Ogni foto viene rigenerata sul tuo dispositivo prima del caricamento, quindi i dati nascosti che contiene (come la posizione GPS o il modello della fotocamera) vengono eliminati.",
        "**Life OS:** i tuoi obiettivi, abitudini, attività, finanze e note, compresi i nomi che scrivi (per esempio, con chi hai diviso una spesa). Sono privati: solo tu puoi vederli. Anche il tuo diario: il blocco con PIN, impronta o volto funziona solo sul tuo dispositivo (non viene inviato a Mycen) e le voci non sono cifrate end-to-end.",
        "**Come ti sei sentito:** se chiudendo la giornata tocchi una delle faccine, salviamo quel valore (da 1 a 5) e la data. Può dire qualcosa sulla tua salute: per questo è facoltativo, lo vedi solo tu e lo usiamo solo per mostrarti le tue tendenze (per esempio in Insights e in «Il tuo mese»). Toccare la faccina è il tuo consenso, che revochi toccandola di nuovo (viene cancellata) o eliminando Life OS.",
        "**Mycen Business:** i dati della tua attività e ciò che inserisci sui tuoi clienti e sulle vendite.",
        "**Statistiche delle visite:** eventi pseudonimizzati (visite e tocchi sul tuo profilo): invece di sapere chi è ogni visitatore, usiamo un identificativo che cambia ogni giorno e non si può invertire. Non conserviamo indirizzi IP né dati del dispositivo e non contiamo i bot. Salviamo anche da quale sito o link è arrivata la visita (per esempio Instagram o il QR).",
        "**Segnalazioni:** il motivo e i dettagli scritti da chi segnala, con un identificativo pseudonimizzato che cambia ogni giorno, per evitare abusi. Se chi segnala ha effettuato l’accesso, conserviamo anche il suo account: lo vede solo il team di Mycen, mai la persona segnalata.",
        "**Messaggi del modulo di contatto:** il nome, il contatto (email o WhatsApp) e il messaggio lasciati da un visitatore. Se il profilo ha il modulo Collaborazioni, un brand indica anche la sua azienda e cosa cerca e, se vuole, il sito web, un budget e una scadenza. Li vede solo la persona proprietaria del profilo, in Studio; non vengono pubblicati né inviati per email. Per evitare abusi usiamo un identificativo pseudonimizzato che cambia ogni giorno, senza IP né dati del dispositivo. Se la persona proprietaria segnala un messaggio, ne conserviamo una copia perché lo esamini il team di Mycen. Se blocca un contatto (o lo segnala), salviamo quell’email o quel telefono nel suo profilo per scartare ciò che invierà di nuovo.",
        "**Iscrizioni:** se ti iscrivi dal modulo «Iscriviti» di un profilo, conserviamo la tua email (e il tuo nome, se il profilo lo chiede), la data del tuo consenso e la tua lingua, e li diamo alla persona proprietaria di quel profilo, che li vede in Studio e li può esportare. Mycen non invia nulla a quella lista: la persona proprietaria del profilo decide come usarla ed è responsabile di farlo correttamente. Per uscire, chiedilo a quella persona o scrivi a team@mycen.id e la cancelliamo. Per evitare abusi usiamo un identificativo pseudonimizzato che cambia ogni giorno, senza IP né dati del dispositivo.",
        "**Sondaggi:** se voti nel sondaggio di un profilo, salviamo la tua scelta con un identificativo pseudonimizzato che cambia ogni giorno (senza IP, senza account e senza dati del dispositivo), per contare un voto a persona. La persona proprietaria vede solo i totali. Il tuo browser ricorda cosa hai votato, per mostrartelo.",
        "**Inviti:** se crei il tuo account da “Crea la tua identità” sul profilo di un’altra persona, salviamo quale profilo ti ha portato e il suo tipo, per capire come cresce Mycen. Quella persona non vede i tuoi dati.",
        "**Uso dell’app:** per capire se Mycen funziona e come sta crescendo, salviamo eventi d’uso (per esempio, che hai pubblicato il profilo, aperto “La mia giornata” o segnato un’abitudine) con il tuo account, la data e dati brevi come la struttura scelta o un numero di giorni. Inoltre, una volta al giorno annotiamo che hai usato Mycen, da che tipo di dispositivo (browser, app installata, iPhone o Android), in quale lingua e il fuso orario del dispositivo (per esempio, “America/Argentina/Buenos_Aires”); mai il tuo IP né la tua posizione esatta. Non salviamo mai il contenuto di attività, abitudini, note o messaggi. Non usiamo servizi di analisi di terze parti.",
        "**Verifica dell’account:** se richiedi la spunta di account verificato, conserviamo il tuo messaggio, il link che ci indichi e la risposta. Li vede solo il team di Mycen per esaminare la richiesta; se viene approvata, il tuo profilo mostra la spunta.",
        "**Errori tecnici:** quando qualcosa non funziona, conserviamo il messaggio di errore, la schermata, la versione di Mycen e il browser (per esempio \"Chrome 128 · Android\"), senza IP né dati personali, per poterlo correggere.",
        "**Notifiche con l’app chiusa (web):** se consenti le notifiche di Life OS nel browser, conserviamo l’indirizzo di invio creato dal browser, le sue chiavi di cifratura, il fuso orario e il nome del browser (per esempio «Chrome · Android»), per inviarti i promemoria. Vengono cancellati quando disattivi le notifiche, quando il browser annulla l’iscrizione o quando elimini l’account.",
        "**Protezione dagli abusi:** per fermare gli attacchi contiamo quante richieste arrivano da ogni connessione alle funzioni pubbliche (visite, messaggi, voti, segnalazioni). Non conserviamo l’indirizzo IP: lo trasformiamo in un codice che non si può invertire (un hash con una chiave segreta) e lo cancelliamo dopo 2 giorni.",
        "**Cosa fa il team di Mycen:** quando il team sospende un profilo, gestisce una segnalazione, verifica un account o elimina file, viene registrato chi l’ha fatto, quando e su quale account, per poterne rendere conto. Questo registro non si può modificare ed è conservato 3 anni.",
      ] },
    ] },
    { id: "para-que", title: "Per cosa li usiamo e su quale base", body: [
      { list: [
        "**Fornirti il servizio** che hai chiesto creando l’account: conservare, mostrare e sincronizzare le tue informazioni (esecuzione del contratto).",
        "**Salvare come ti sei sentito** (le faccine di Life OS), solo se lo annoti: con il tuo consenso esplicito, che revochi quando vuoi cancellandolo.",
        "**Inviarti notifiche con l’app chiusa**, solo se le consenti nel browser o sul telefono (consenso; lo revochi disattivandole).",
        "**Mantenere Mycen sicuro e funzionante:** prevenire abusi, esaminare segnalazioni e correggere errori (legittimo interesse).",
        "**Mostrarti statistiche** sul tuo profilo, con dati pseudonimizzati (interesse legittimo).",
        "**Inviarti le email necessarie** sul tuo account: conferma, recupero della password e modifiche importanti (esecuzione del contratto).",
        "**Evitare le sostituzioni di persona:** esaminare le richieste di verifica e riservare i nomi di persone note su loro richiesta (legittimo interesse).",
        "**Capire come viene usato Mycen e come cresce** (uso dell’app e inviti), senza pubblicità né terzi (legittimo interesse).",
        "**Rendere conto e conservare prove** quando la legge lo richiede, per esempio il registro delle azioni del team o una segnalazione di abusi sessuali su minori (obbligo di legge e legittimo interesse).",
        "**Rispettare la legge** quando un’autorità competente lo richiede.",
      ] },
      "Quando la base è il legittimo interesse, puoi opporti scrivendoci e smettiamo, salvo motivi legittimi prevalenti o necessità per un’azione legale. Non prendiamo decisioni automatizzate con effetti giuridici o altrettanto significativi su di te: quando uno strumento segnala qualcosa (per esempio un link pericoloso), lo esamina una persona.",
      "Non vendiamo i tuoi dati, non li usiamo per la pubblicità e su Mycen non ci sono tracker di terze parti.",
    ] },
    { id: "publico", title: "Cosa è pubblico", body: [
      "La tua pagina pubblica mostra solo ciò che pubblichi. Moduli nascosti, bozze e Spaces non pubblicati non si vedono. I profili pubblici possono comparire nei motori di ricerca; se scegli la visibilità \"non in elenco\" o \"privata\", non vengono inclusi nella mappa del sito letta dai motori di ricerca.",
    ] },
    { id: "proveedores", title: "Con chi li condividiamo", body: [
      "Usiamo fornitori che trattano i dati solo per fornire il servizio e sotto contratto:",
      { list: [
        "**Supabase:** database, accesso e file.",
        "**Vercel:** hosting dell’applicazione e consegna delle pagine.",
        "**Resend:** invio delle email del tuo account.",
        "**Cloudflare (Turnstile):** la verifica anti-bot della registrazione, dell’accesso e del recupero della password. Quando apri quelle schermate, Cloudflare riceve dati tecnici del tuo browser (come l’indirizzo IP) solo per verificare che tu non sia un bot.",
        "**Cloudflare R2:** conserva un backup giornaliero delle foto e dei PDF caricati dai profili, per poterli recuperare in caso di problemi. Ciò che viene eliminato in Mycen resta in quel backup per 30 giorni e poi viene cancellato.",
        "**Google Web Risk:** controlliamo con Google i link pubblici dei profili e dei progetti pubblicati, per trovare truffe e virus. Si invia solo il link; niente su di te o su chi visita. Se un link è pericoloso, lo esamina il team di Mycen.",
        "**YouTube, Vimeo, TikTok, Spotify e SoundCloud:** solo se un profilo integra un video o un brano e tocchi \"Riproduci\". Prima non ci colleghiamo a loro; da quel momento valgono le loro politiche. Se un profilo mostra il suo \"Ultimo video\", il server di Mycen consulta l’elenco pubblico dei video del canale YouTube scelto dal proprietario, senza inviare alcun tuo dato. Quando il titolare di un profilo incolla uno di questi link in Studio, il server di Mycen recupera la copertina pubblica di quel video o di quella canzone e la salva come un’altra foto del profilo: così la pagina la mostra senza collegarti al fornitore. Se un profilo mostra un podcast, il server di Mycen legge il feed RSS pubblico scelto dal proprietario, senza inviare alcun tuo dato; quando tocchi \"Ascolta\", il tuo browser si collega al servizio che ospita quel podcast e valgono le sue politiche. Se un profilo ha più sedi e tocchi \"Vedi la più vicina\", il browser ti chiede il permesso di usare la tua posizione: viene usata solo sul tuo dispositivo per ordinare l’elenco e non viene inviata a Mycen né ad altri.",
        "**Anthropic:** solo se un’attività usa l’importazione del menu da un PDF; viene elaborato quel file.",
        "**Mercado Pago:** solo se un’attività lo configura per incassare; il pagamento avviene su Mercado Pago.",
        "**Google (accesso):** solo se scegli \"Continua con Google\". Google ci conferma nome, email e foto; non riceviamo mai la tua password di Google né accediamo ad altro del tuo account.",
        "**Apple (accesso):** solo se scegli \"Continua con Apple\". Apple ci conferma nome ed email (o un’email di inoltro creata da Apple se preferisci nascondere la tua); non riceviamo mai la tua password né accediamo ad altro del tuo account.",
        "**App per iOS e Android:** se la scarichi, Apple (App Store) o Google (Google Play) registrano il download secondo le proprie politiche. Nell’app i promemoria vengono programmati sul telefono, senza un servizio di notifiche di terzi.",
        "**Servizio di notifiche del tuo browser:** solo se consenti le notifiche di Life OS sul web. Il promemoria (il nome dell’attività o dell’abitudine e l’orario) viaggia cifrato fino al tuo dispositivo attraverso il servizio di notifiche del browser: Google (Firebase Cloud Messaging) su Chrome e Android, Microsoft su Edge, Apple su Safari e Mozilla su Firefox. Quel servizio vede l’indirizzo di invio ma non può leggere il contenuto.",
        "**Google Calendar, Apple o un altro calendario:** solo se attivi il link del calendario di Life OS; quel servizio scarica le tue attività in sospeso con una data (titolo, data, ora e promemoria). Puoi disattivarlo o cambiarlo quando vuoi.",
        "**Il riconoscimento vocale del tuo browser:** solo se usi \"Detta\" in Life OS. Il browser trasforma la voce in testo (in Chrome lo fa il servizio vocale di Google; in Safari, Apple). Mycen riceve solo il testo.",
      ] },
      "Al di fuori di questo, condividiamo dati solo se la legge lo impone o per proteggere i diritti e la sicurezza delle persone.",
    ] },
    { id: "transferencias", title: "Dati fuori dal tuo paese", body: [
      "Mycen è gestito dall’Argentina, paese che la Commissione europea riconosce con un livello di protezione adeguato. I nostri fornitori possono conservare o trattare dati in altri paesi, come gli Stati Uniti o paesi dell’Unione europea. In questi casi usiamo le garanzie previste dalla legge: decisioni di adeguatezza (per esempio il quadro UE-USA per la protezione dei dati per i fornitori aderenti), le clausole contrattuali tipo della Commissione europea e del Regno Unito, e le clausole modello dell’autorità argentina (AAIP). Puoi chiederci maggiori informazioni o una copia di queste garanzie.",
    ] },
    { id: "plazos", title: "Per quanto tempo li conserviamo", body: [
      { list: [
        "I dati del tuo account, del profilo e di Life OS, finché hai l’account. Se lo elimini, li cancelliamo, comprese foto e PDF; i backup dei fornitori vengono sovrascritti nei loro cicli abituali e il backup giornaliero di foto e PDF conserva ciò che è stato eliminato per 30 giorni.",
        "Le statistiche delle visite sono conservate pseudonimizzate (con l’identificativo che cambia ogni giorno) per 13 mesi —Studio mostra fino a 90 giorni— e i voti dei sondaggi finché esiste il profilo. Se il profilo viene eliminato, si eliminano con lui.",
        "I messaggi del modulo di contatto, finché la persona proprietaria del profilo non li elimina o elimina il proprio account.",
        "Le email di iscrizione, finché la persona proprietaria del profilo non le cancella, elimina il suo account o ci chiedi di cancellarle.",
        "I registri degli errori sono conservati finché servono a correggerli (uno risolto resta salvato nel caso si ripresenti); il conteggio delle persone coinvolte, 90 giorni.",
        "Gli eventi di utilizzo dell’app e il registro dei giorni in cui hai usato Mycen, 25 mesi (poi vengono cancellati automaticamente); se elimini l’account prima, non restano collegati a te in alcun modo.",
        "Le notifiche del browser, finché non le disattivi o elimini l’account; il codice di connessione per fermare gli abusi, 2 giorni; i contatti bloccati, finché la persona proprietaria non li sblocca o elimina il profilo; e il registro di ciò che fa il team di Mycen, 3 anni.",
        "Le segnalazioni, finché esiste il profilo segnalato (vengono cancellate con esso); le richieste di verifica e gli inviti, finché esiste l’account; i nomi riservati, finché dura la riserva; e i link segnalati come pericolosi, 13 mesi.",
        "Ciò che la legge obbliga a conservare (per esempio dati di fatturazione o le prove richieste da un’autorità in un caso di abusi sessuali su minori), per il periodo stabilito, bloccato per qualsiasi altro uso e anche se ne viene chiesta la cancellazione.",
      ] },
    ] },
    { id: "dispositivo", title: "Cosa resta sul tuo dispositivo", body: [
      "Mycen non usa cookie pubblicitari né di tracciamento. Nel tuo browser conserviamo solo il necessario per funzionare: la sessione, la lingua e alcune bozze e preferenze. Puoi cancellarlo dalle impostazioni del browser (dovrai accedere di nuovo). Se inserisci qualcosa in Life OS senza connessione, resta sul tuo dispositivo finché non viene caricato (solo con la tua sessione). Del PIN del diario conserviamo solo un’impronta cifrata (hash), mai il PIN. Per questo non ti mostriamo un banner dei cookie: usiamo solo lo stretto necessario, che la legge consente senza chiedere il consenso.",
    ] },
    { id: "seguridad", title: "Sicurezza", body: [
      "Usiamo connessioni cifrate, password conservate in forma cifrata, verifica in due passaggi per il team e permessi nel database perché ognuno veda solo i propri dati. Nessun sistema è perfetto: se una violazione potesse incidere sui tuoi diritti, avvisiamo l’autorità competente (nell’Unione europea entro 72 ore) e, se il rischio è elevato, anche te, senza ritardo.",
    ] },
    { id: "derechos", title: "I tuoi diritti", body: [
      "Puoi chiedere di accedere ai tuoi dati, rettificarli, cancellarli, portarli con te (portabilità), opporti o limitare certi usi e revocare un consenso dato, senza che ciò incida su quanto fatto prima. Molte cose le fai direttamente da Studio → Impostazioni (scaricare i tuoi dati, eliminare l’account) o da Life OS → Impostazioni → I tuoi dati. Per il resto scrivi a **team@mycen.id**; per proteggere il tuo account possiamo chiederti di confermare che sei tu (per esempio scrivendo dall’email dell’account). È gratuito.",
      "Rispondiamo entro i termini di legge (nell’Unione Europea entro un mese; in Argentina 10 giorni di calendario per l’accesso e 5 giorni lavorativi per correggere o cancellare). Puoi anche presentare reclamo all’autorità per la protezione dei dati: in Italia il **Garante per la protezione dei dati personali**; negli altri paesi dell’Unione Europea, l’autorità nazionale; in Argentina l’**Agencia de Acceso a la Información Pública (AAIP)**; in Brasile l’**ANPD**.",
    ] },
    { id: "segun-pais", title: "In base a dove vivi", body: [
      "Oltre a quanto sopra:",
      { list: [
        "**Unione europea, Spazio economico europeo, Regno Unito e Svizzera:** rispondiamo entro un mese (altri due se la richiesta è complessa, e ti avvisiamo). Puoi presentare reclamo all’autorità di protezione dei dati del tuo paese (in Italia, il Garante per la protezione dei dati personali).",
        "**Brasile (LGPD):** puoi anche chiedere con quali aziende condividiamo i tuoi dati e il riesame di una decisione automatizzata. Autorità: l’**ANPD**.",
        "**Stati Uniti (California e gli stati con leggi sulla privacy, come Virginia, Colorado, Connecticut o Texas):** puoi sapere quali dati abbiamo — identificativi come nome ed email, ciò che pubblichi, dati di uso dell’app e, solo se lo annoti, come ti sei sentito, un dato sensibile che usiamo solo per mostrartelo —, chiederne la correzione o la cancellazione e portarli con te. Non vendiamo né condividiamo i tuoi dati per pubblicità, quindi non c’è nulla da cui disiscriversi; rispettiamo comunque il segnale Global Privacy Control. Puoi agire tramite un rappresentante autorizzato e non ti tratteremo diversamente per aver esercitato i tuoi diritti. Se respingiamo una richiesta, puoi fare ricorso rispondendo con l’oggetto «Ricorso» e, se resti in disaccordo, rivolgerti al procuratore generale del tuo stato.",
        "**Canada, Australia, Giappone e Corea del Sud:** puoi accedere ai tuoi dati, correggerli e revocare il consenso. Puoi presentare reclamo al Privacy Commissioner of Canada, all’OAIC australiana, alla PPC giapponese o alla PIPC coreana.",
        "**India (DPDP):** puoi accedere ai tuoi dati, correggerli e cancellarli, e nominare qualcuno che eserciti i tuoi diritti se non potessi farlo. I reclami si presentano prima a noi (team@mycen.id) e poi al Data Protection Board of India.",
        "**Altri paesi:** ti garantiamo i diritti che ti riconosce la legge del tuo paese; scrivici e ti aiutiamo.",
      ] },
    ] },
    { id: "menores", title: "Minori", body: [
      "Mycen non è rivolto a minori di 13 anni, né a chi non ha l’età più alta richiesta dalla legge del proprio paese per usare un servizio simile senza il consenso dei genitori (per esempio 14 anni in Corea del Sud e in Cina, e fino a 16 in alcuni paesi dell’Unione europea). Non raccogliamo consapevolmente dati di persone al di sotto di quell’età: se sappiamo che un account appartiene a una di loro, lo eliminiamo insieme ai suoi dati. Se sei un genitore o un tutore e pensi che sia successo, scrivi a **team@mycen.id**.",
      "Se hai meno di 18 anni, ricorda che chiunque può vedere il tuo profilo pubblico: non pubblicare il tuo indirizzo, la tua scuola né dati che permettano di trovarti. Nelle Impostazioni puoi scegliere «Solo con il link» o «Privato».",
    ] },
    { id: "cambios", title: "Modifiche a questa informativa", body: [
      "Se modifichiamo questa informativa in modo importante, ti avvisiamo via email o dentro Mycen prima che si applichi. In alto vedrai sempre la data dell’ultimo aggiornamento.",
    ] },
  ],
}

export default it
