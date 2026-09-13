import type { Dictionary } from './en';

export const de: Dictionary = {
  meta: {
    title: 'Citable — kann die KI-Suche Ihre Website zitieren?',
    description:
      'Prüfen Sie jede URL: Können ChatGPT, Claude, Perplexity und Google AI Overviews sie lesen, indexieren und zitieren? Mit den genauen Korrekturen für alles, was nicht passt.',
  },

  common: {
    copy: 'Kopieren',
    copied: 'Kopiert',
    close: 'Schließen',
    loading: 'Lädt…',
    backHome: 'Zur Startseite',
  },

  nav: {
    product: 'Produkt',
    pricing: 'Preise',
    docs: 'API',
    contact: 'Kontakt',
    scanCta: 'Kostenlos prüfen',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    home: 'Citable Startseite',
  },

  theme: { label: 'Design', light: 'Hell', dark: 'Dunkel', system: 'System' },
  language: { label: 'Sprache' },

  hero: {
    badge: '16 KI-Agenten · 31 Prüfungen · ~5 Sekunden',
    titleLead: 'Kann KI Ihre Website',
    titleAccent: 'zitieren',
    titleTail: '?',
    subtitle:
      'Ihre Kunden fragen ChatGPT, Claude und Perplexity, bevor sie Google öffnen. Citable zeigt, ob diese Assistenten Ihre Seiten lesen, indexieren und zitieren können – und liefert die genauen Zeilen, die Sie ändern müssen, wenn nicht.',
    trust: 'Ohne Anmeldung. Kostenlose Prüfung. Ergebnis in Sekunden.',
    globeLabel: 'KI-Agenten rund um Ihre Website',
  },

  scanner: {
    placeholder: 'ihredomain.de/beste-seite',
    submit: 'Kostenlos prüfen',
    scanning: 'Prüfe…',
    examples: 'Beispiele:',
    haveKey: 'Lizenzschlüssel vorhanden?',
    hideKey: 'Schlüssel ausblenden',
    keyPlaceholder: 'CITE-PRO-XXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
    keyHint: 'Wird nur in diesem Browser gespeichert und mit jeder Prüfung gesendet.',
    keyChecking: 'Schlüssel wird geprüft…',
    keyValid: (plan) => `Schlüssel aktiv – Tarif ${plan} freigeschaltet.`,
    keyInvalid: 'Dieser Schlüssel ist ungültig. Bitte auf Tippfehler prüfen.',
    keyInactive: 'Dieser Schlüssel ist nicht mehr aktiv. Verlängern Sie Ihren Tarif, um alle Korrekturen wieder freizuschalten.',
    stages: [
      'Seite wird wie ein KI-Crawler abgerufen…',
      'robots.txt wird gegen 16 KI-Agenten geprüft…',
      'llms.txt und Sitemap werden gesucht…',
      'Strukturierte Daten und Überschriften werden gelesen…',
      'Bewertung wird berechnet…',
    ],
    errors: {
      quota: (limit) =>
        `Der kostenlose Tarif umfasst ${limit} Prüfungen pro Tag. Upgraden Sie für unbegrenzte Prüfungen oder kommen Sie morgen wieder.`,
      network: 'Der Scanner ist nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
      generic: 'Die Prüfung ist fehlgeschlagen. Bitte versuchen Sie es gleich noch einmal.',
    },
  },

  report: {
    scoreLabel: 'KI-Sichtbarkeitswert',
    grade: 'Note',
    crawlersTitle: 'Wer diese Seite lesen darf',
    crawlersAllOk: 'Alle Antwortmaschinen können diese URL erreichen.',
    crawlersBlocked: (count) =>
      count === 1 ? '1 Antwortmaschine wird durch robots.txt blockiert.' : `${count} Antwortmaschinen werden durch robots.txt blockiert.`,
    rule: 'Regel',
    noRule: 'Keine passende Regel – standardmäßig erlaubt',
    fixFirst: 'Das zuerst beheben',
    fixFirstHint: 'Sortiert danach, wie viele Zitate Sie jedes Problem kostet.',
    howToFix: 'So beheben Sie es',
    locked: 'Schritt-für-Schritt-Korrektur und Nachweise sind in Pro enthalten.',
    critical: 'Kritisch',
    status: { pass: 'OK', warn: 'Verbessern', fail: 'Fehler', info: 'Hinweis' },
    paywallTitle: (count) => `${count} weitere Korrekturen warten auf Sie`,
    paywallBody:
      'Sie sehen die drei wirkungsvollsten Korrekturen. Pro schaltet alle weiteren frei – mit Code zum Kopieren, vollständigen Nachweisen, unbegrenzten Prüfungen und API-Zugang.',
    paywallCta: 'Alles freischalten – $7/Monat',
    paywallCompare: 'Tarife vergleichen',
    emailPrompt: 'Noch nicht so weit? Bericht per E-Mail erhalten:',
    breakdown: 'Vollständige Auswertung',
    failing: (count) => `${count} Fehler`,
    meta: (date, ms) => `Geprüft am ${date} in ${(ms / 1000).toFixed(1)} s`,
    share: 'Link kopieren',
    shareCopied: 'Link kopiert',
    exportJson: 'JSON herunterladen',
    warnings: 'Hinweise',
    points: 'Pkt.',
  },

  lead: {
    placeholder: 'sie@firma.de',
    submit: 'Senden',
    sending: 'Wird gesendet…',
    done: 'Erledigt – Sie stehen auf der Liste.',
    noSpam: 'Kein Spam. Abmeldung mit einem Klick.',
    error: 'Die E-Mail konnte nicht gespeichert werden. Bitte erneut versuchen.',
  },

  marquee: { label: 'Geprüft gegen die Agenten, die entscheiden, wer zitiert wird' },

  stats: {
    checks: 'Prüfungen pro Scan',
    agents: 'KI-Agenten',
    categories: 'gewichtete Kategorien',
    seconds: 'Sekunden pro Scan',
  },

  problem: {
    eyebrow: 'Warum jetzt',
    title: 'Die Suche ist in die Antwort umgezogen. Die meisten Websites nicht.',
    items: [
      {
        title: 'Der Traffic ging leise',
        body: 'Antworten ohne Klick schlucken die Fragen, für die Ihre Inhalte früher gefunden wurden. Ihre Analytics zeigen nicht, dass Sie in der Antwort fehlten.',
      },
      {
        title: 'Aus Versehen unsichtbar',
        body: 'Eine Wildcard-Regel in robots.txt oder eine Seite, die nur im Browser rendert, entfernt Sie auf einen Schlag aus allen Antwortmaschinen.',
      },
      {
        title: 'Zitiert werden ist das neue Ranking',
        body: 'Als genannte Quelle erreicht Ihre Marke den Käufer im Moment der Entscheidung – mit dem Assistenten als Fürsprecher.',
      },
    ],
  },

  steps: {
    eyebrow: 'So funktioniert es',
    title: 'Von der URL zur Korrekturliste in drei Schritten',
    items: [
      { title: 'URL einfügen', body: 'Jede öffentliche Seite: Startseite, Preise, Doku oder Ihr bester Artikel.' },
      {
        title: 'Wir lesen sie wie eine KI',
        body: 'Seite, robots.txt, llms.txt und Sitemap werden ohne JavaScript abgerufen und gegen 16 echte Agenten geprüft.',
      },
      {
        title: 'Korrekturen umsetzen',
        body: 'Jedes Problem kommt mit Nachweis und kopierfertiger Lösung, sortiert nach Wirkung.',
      },
    ],
  },

  categories: {
    eyebrow: 'Was wir messen',
    title: 'Sechs Kategorien. Eine ehrliche Bewertung.',
    subtitle: 'Jede Kategorie ist danach gewichtet, wie stark sie die Chance auf ein Zitat wirklich beeinflusst.',
  },

  agents: {
    title: 'Alle Agenten, die wir prüfen',
    body: 'Live-Agenten werden deutlich strenger bewertet als Trainings-Crawler: Wer die ersten blockiert, verliert heute Zitate; die zweiten zu blockieren ist eine Lizenzentscheidung.',
  },

  pricing: {
    eyebrow: 'Preise',
    title: 'Einfache Preise. Jederzeit kündbar.',
    subtitle: 'Kostenlos starten. Upgraden, wenn Sie alle Korrekturen, unbegrenzte Prüfungen und die API brauchen.',
    popular: 'Beliebt',
    launch: 'Einführungspreis',
    billing: { forever: 'dauerhaft', monthly: '/Monat', once: 'einmalig' },
    plans: {
      free: {
        name: 'Free',
        tagline: 'Sehen, wo Sie stehen.',
        cta: 'Kostenlos prüfen',
        features: [
          '5 Prüfungen pro Tag',
          'Vollständige Bewertung nach Kategorien',
          'Alle 16 KI-Agenten geprüft',
          'Top-3-Korrekturen mit Anleitung',
        ],
      },
      pro: {
        name: 'Pro',
        tagline: 'Für alle, die den Traffic verantworten.',
        cta: 'Pro holen',
        features: [
          'Unbegrenzte Prüfungen',
          'Alle Korrekturen mit Code-Snippets',
          'Vollständige Nachweise je Prüfung',
          'Vollständige Share-Links und JSON-Export',
          'API-Zugang für CI-Pipelines',
        ],
      },
      agency: {
        name: 'Agency',
        tagline: 'Kunden-Websites im großen Stil prüfen.',
        cta: 'Agency holen',
        features: [
          'Alles aus Pro',
          '2.000 API-Prüfungen pro Tag (4× Pro)',
          'Ungekürzte Berichte zum Teilen mit Kunden',
          'Bevorzugter E-Mail-Support',
        ],
      },
      lifetime: {
        name: 'Lifetime',
        tagline: 'Einmal zahlen, Pro behalten.',
        cta: 'Lifetime kaufen',
        features: ['Alles aus Pro, dauerhaft', 'Eine Zahlung, kein Abo', 'Preis für frühe Kunden'],
      },
    },
    redirecting: 'Zahlung wird geöffnet…',
    unavailableTitle: 'Online-Zahlung wird eingerichtet',
    unavailableBody:
      'Der Checkout ist noch nicht live. Hinterlassen Sie Ihre E-Mail, wir melden uns, sobald er startet – oder schreiben Sie uns, dann regeln wir den Zugang direkt.',
    contactCta: 'Kontakt aufnehmen',
    error: 'Der Checkout konnte nicht geöffnet werden. Bitte erneut versuchen.',
    secure: 'Sichere Zahlung. Steuern werden im Checkout berechnet.',
    cancelled: 'Zahlung abgebrochen – es wurde nichts berechnet.',
  },

  faq: {
    eyebrow: 'FAQ',
    title: 'Häufige Fragen',
    items: [
      {
        q: 'Was genau misst Citable?',
        a: 'Ob ein KI-Assistent Ihre Seite erreichen, ohne JavaScript lesen, ihr Thema verstehen und eine verlässliche Antwort daraus ziehen kann. Das ist eine andere Frage als „Ranke ich bei Google?“ – und sie scheitert aus anderen Gründen.',
      },
      {
        q: 'Reicht mein SEO-Tool nicht?',
        a: 'Klassische SEO-Tools prüfen den Google-Index. Sie sagen Ihnen nicht, dass ChatGPT-User durch eine Wildcard-Regel blockiert ist, dass llms.txt fehlt oder dass Ihre Preisseite für wichtige Crawler ein leeres div ist.',
      },
      {
        q: 'Schadet es, GPTBot zu blockieren?',
        a: 'Trainings-Crawler zu blockieren ist eine vertretbare Lizenzentscheidung, die wir mild bewerten. Bei Live-Agenten wie ChatGPT-User oder Perplexity-User ist das anders: Sie rufen Ihre Seite nur ab, weil ein Nutzer gerade etwas gefragt hat, das sie beantwortet.',
      },
      {
        q: 'Crawlt ihr meine ganze Website?',
        a: 'Nein. Eine Prüfung besteht aus vier einfachen GET-Anfragen: Seite, robots.txt, llms.txt und Sitemap. Der Bot gibt sich als CitableBot zu erkennen.',
      },
      {
        q: 'Wie bekomme ich nach dem Kauf meinen Schlüssel?',
        a: 'Er erscheint direkt nach der Zahlung auf dem Bildschirm und kommt per E-Mail. Fügen Sie ihn unter dem Scanner ein – alle Korrekturen werden freigeschaltet.',
      },
      {
        q: 'Kann ich kündigen?',
        a: 'Ja, jederzeit. Ihr Tarif läuft bis zum Ende des bereits bezahlten Zeitraums weiter.',
      },
    ],
  },

  cta: {
    title: 'In fünf Sekunden Klarheit.',
    subtitle: 'Die erste Prüfung ist kostenlos – genau wie die Antwort, ob KI Sie sehen kann.',
    button: 'Meine Website prüfen',
  },

  footer: {
    tagline: 'KI-Sichtbarkeitsaudits für Teams, die zitiert werden wollen.',
    product: 'Produkt',
    company: 'Unternehmen',
    legal: 'Rechtliches',
    rights: (year, name) => `© ${year} ${name}. Alle Rechte vorbehalten.`,
    links: {
      scanner: 'Scanner',
      pricing: 'Preise',
      docs: 'API-Doku',
      contact: 'Kontakt',
      terms: 'AGB',
      privacy: 'Datenschutz',
      refund: 'Erstattungen',
    },
  },

  contact: {
    eyebrow: 'Kontakt',
    title: 'Sprechen Sie mit einem Menschen',
    subtitle: 'Fragen zu Tarifen, Rechnungen, Partnerschaften oder einem Prüfergebnis – wir lesen jede Nachricht.',
    form: {
      name: 'Name',
      email: 'E-Mail',
      topic: 'Thema',
      topics: {
        sales: 'Tarife & Preise',
        support: 'Hilfe zu einer Prüfung',
        billing: 'Zahlung & Rechnungen',
        partnership: 'Partnerschaft',
        other: 'Sonstiges',
      },
      message: 'Nachricht',
      messagePlaceholder: 'Wobei können wir helfen?',
      submit: 'Nachricht senden',
      sending: 'Wird gesendet…',
      success: 'Nachricht gesendet. Wir antworten per E-Mail.',
      error: 'Die Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.',
      rateLimited: 'Zu viele Nachrichten. Bitte später erneut versuchen.',
      tooShort: 'Bitte mindestens 10 Zeichen schreiben.',
    },
    direct: 'Weitere Kontaktwege',
    emailLabel: 'E-Mail',
    telegramLabel: 'Telegram',
    socialLabel: 'Social Media',
    responseTime: (time) => `Übliche Antwortzeit: ${time}`,
    noDirect: 'Über das Formular erreichen Sie uns am schnellsten.',
  },

  docs: {
    eyebrow: 'Entwickler',
    title: 'Citable-API',
    subtitle: 'Dieselbe Prüfung wie auf der Website – als ein HTTP-Aufruf. Enthalten in Pro, Agency und Lifetime.',
    endpoint: 'Endpunkt',
    auth: 'Authentifizierung mit Ihrem Lizenzschlüssel als Bearer-Token.',
    request: 'Anfrage',
    params: 'Parameter',
    field: 'Feld',
    type: 'Typ',
    description: 'Beschreibung',
    paramUrl: 'Pflicht. Die öffentliche Seite, die geprüft wird.',
    paramMinScore: 'Optionale Schwelle 0–100. Liefert HTTP 422, wenn der Wert darunter liegt – so lässt ein Rückschritt Ihre Pipeline fehlschlagen.',
    paramLang: 'Optionale Sprache der Ergebnisse: en, ru, es oder de. Standard: en.',
    response: 'Antwort',
    codes: 'Statuscodes',
    code200: 'Prüfung abgeschlossen',
    code400: 'ungültige URL oder Anfrage',
    code401: 'Schlüssel fehlt, ist ungültig oder inaktiv',
    code422: 'Prüfung abgeschlossen, Wert unter minScore',
    code429: 'Tageskontingent aufgebraucht',
    ciTitle: 'Als Deploy-Gate nutzen',
    scoringTitle: 'Bewertungsmodell',
    scoringBody: 'Der Gesamtwert ist der gewichtete Durchschnitt aus sechs Kategorien.',
  },

  checkout: {
    pendingTitle: 'Zahlung wird bestätigt…',
    pendingBody: 'Das dauert meist nur wenige Sekunden. Bitte lassen Sie diese Seite geöffnet.',
    readyTitle: 'Alles erledigt',
    readyBody: 'Ihr Tarif ist aktiv. Das ist Ihr Lizenzschlüssel – er ist bereits in diesem Browser gespeichert.',
    keyLabel: 'Lizenzschlüssel',
    useNow: 'Jetzt prüfen',
    emailed: 'Eine Kopie wurde an Ihre E-Mail gesendet.',
    keepSafe: 'Geben Sie ihn nicht weiter: Wer den Schlüssel hat, nutzt Ihren Tarif.',
    slowTitle: 'Wir warten noch auf den Zahlungsanbieter',
    slowBody: 'Die Zahlung wird möglicherweise noch verarbeitet. Ihr Schlüssel kommt per E-Mail; falls nicht innerhalb von 15 Minuten, schreiben Sie uns.',
    inactiveTitle: 'Dieser Kauf ist nicht mehr aktiv',
    inactiveBody: 'Die Zahlung wurde erstattet oder das Abo ist beendet.',
    unknownTitle: 'Dieser Checkout wurde nicht gefunden',
    unknownBody: 'Der Link ist möglicherweise unvollständig. Falls Ihnen etwas berechnet wurde, schreiben Sie uns mit Beleg.',
    contactSupport: 'Support kontaktieren',
  },

  shared: {
    title: (host) => `KI-Sichtbarkeitsbericht für ${host}`,
    notFound: 'Dieser Bericht existiert nicht oder wurde entfernt.',
    cta: 'Eigene Website prüfen',
    scannedOn: (date) => `Geprüft am ${date}`,
  },

  notFound: {
    title: 'Seite nicht gefunden',
    body: 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
  },
};
