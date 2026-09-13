import type { AuditMessages } from './en';

const allowSnippet = (names: string[]) =>
  names.map((name) => `User-agent: ${name}\nAllow: /\n`).join('\n');

export const auditDe: AuditMessages = {
  common: {
    missing: 'fehlt',
    none: 'keine',
    yes: 'ja',
    no: 'nein',
    httpStatus: (url, status) => `${url} → HTTP ${status || 'keine Antwort'}`,
  },

  categories: {
    'crawler-access': {
      label: 'Zugriff für KI-Crawler',
      description: 'Ob KI-Agenten diese Seite überhaupt abrufen dürfen.',
    },
    'machine-readability': {
      label: 'Maschinenlesbarkeit',
      description: 'Ob der Inhalt im HTML steht, ohne dass JavaScript laufen muss.',
    },
    'structured-data': {
      label: 'Strukturierte Daten',
      description: 'Maschinenlesbare Fakten zu Organisation, Autor und Aktualität.',
    },
    answerability: {
      label: 'Zitierfähigkeit',
      description: 'Ob der Inhalt in kurze, zitierbare Antworten gegliedert ist.',
    },
    identity: {
      label: 'Metadaten & Identität',
      description: 'Wie sich die Seite in Vorschauen und Quellenangaben präsentiert.',
    },
    technical: {
      label: 'Technischer Zustand',
      description: 'Netzwerk- und Indexierungssignale, die eine Seite unbemerkt verbergen können.',
    },
  },

  purposes: {
    retrieval: 'Beantwortet Fragen live',
    indexing: 'Baut den Antwort-Index auf',
    training: 'Sammelt Trainingsdaten',
  },

  crawlerNotes: {
    'oai-searchbot': 'Baut den Index für Ergebnisse und Zitate in ChatGPT Search.',
    'chatgpt-user': 'Ruft Ihre Seite live ab, wenn ein ChatGPT-Nutzer etwas fragt, das sie beantwortet.',
    gptbot: 'Sammelt Trainingsdaten. Ihn zu blockieren ist eine vertretbare Entscheidung.',
    claudebot: 'Sammelt Trainingsdaten für Claude.',
    'claude-user': 'Ruft Ihre Seite live für eine Anfrage eines Claude-Nutzers ab.',
    'claude-searchbot': 'Indexiert Seiten, damit Claude sie finden und zitieren kann.',
    perplexitybot: 'Baut den Perplexity-Index auf – die wichtigste Quelle seiner Zitate.',
    'perplexity-user': 'Live-Abruf, ausgelöst durch einen Perplexity-Nutzer.',
    'google-extended': 'Steuert die Nutzung in Gemini, ohne das Such-Ranking zu beeinflussen.',
    googlebot: 'AI Overviews basieren auf dem normalen Google-Index – er ist unverzichtbar.',
    bingbot: 'Versorgt Copilot und mehrere Antwortmaschinen von Drittanbietern.',
    'applebot-extended': 'Opt-out-Token für das Training von Apple Intelligence.',
    'meta-externalagent': 'Crawling und Training für Meta AI.',
    amazonbot: 'Liefert Antworten für Alexa und Rufus.',
    ccbot: 'Common Crawl speist die meisten offenen Trainingsdatensätze.',
    duckassistbot: 'KI-Antworten von DuckDuckGo.',
  },

  verdicts: {
    criticalOne:
      'Ein kritisches Problem verhindert, dass KI-Assistenten diese Seite zitieren. Beheben Sie es zuerst – alles andere ist zweitrangig.',
    criticalMany: (count) =>
      `${count} kritische Probleme verhindern, dass KI-Assistenten diese Seite zitieren. Beheben Sie diese zuerst – alles andere ist zweitrangig.`,
    a: 'Die Seite ist hervorragend für die KI-Suche aufgestellt. Halten Sie Datumsangaben aktuell und achten Sie auf Rückschritte.',
    b: 'Solide Basis. Ein paar gezielte Korrekturen bringen die Seite vor die meisten Wettbewerber.',
    c: 'KI-Crawler können die Seite lesen, aber sie ist nicht zum Zitieren aufgebaut. Lücken bei Struktur und Daten kosten Sie Zitate.',
    d: 'Deutliche Lücken. Assistenten erreichen die Seite, können aber kaum eine verlässliche Antwort daraus ziehen.',
    f: 'Für die KI-Suche ist diese Seite praktisch unsichtbar. Die Fehler unten sind grundlegend, nicht kosmetisch.',
  },

  warnings: {
    fetchFailed: (error) => `Die Seite konnte nicht abgerufen werden: ${error}`,
    httpStatus: (status) => `Die Seite antwortete mit HTTP ${status}.`,
    suiteFailed: (message) => `Eine Prüfgruppe ist fehlgeschlagen und wurde übersprungen: ${message}`,
    timeout: (ms) => `Zeitüberschreitung nach ${ms} ms`,
  },

  errors: {
    empty: 'Geben Sie eine URL ein.',
    invalid: (input) => `„${input}“ ist keine gültige URL.`,
    protocol: 'Nur http://- und https://-URLs können geprüft werden.',
    privateHost: 'Lokale und private Hosts können nicht geprüft werden.',
    fullDomain: 'Geben Sie eine vollständige öffentliche Domain ein, z. B. example.com.',
    privateIp: 'Adressen aus privaten Netzen können nicht geprüft werden.',
    unresolvable: (host) => `„${host}“ konnte nicht aufgelöst werden. Prüfen Sie die Domain und versuchen Sie es erneut.`,
    resolvesPrivate: 'Dieser Hostname verweist auf eine private Adresse.',
  },

  checks: {
    robotsPresent: {
      title: 'robots.txt ist erreichbar',
      ok: (groups) => `robots.txt mit ${groups} User-agent-Gruppe(n) gefunden.`,
      missing:
        'Keine nutzbare robots.txt. Crawler gehen dann von „alles erlaubt“ aus – das funktioniert, lässt Ihnen aber keine Kontrolle.',
      sitemaps: (count) => `Deklariert ${count} Sitemap(s)`,
      fix: (origin) =>
        `Veröffentlichen Sie /robots.txt, damit der KI-Zugriff eine bewusste Entscheidung ist und kein Standardwert:\n\nUser-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`,
    },
    retrievalBots: {
      title: 'Live-Agenten können diese Seite abrufen',
      ok: (total) =>
        `Alle ${total} Live-Agenten (ChatGPT-User, Claude-User, Perplexity-User und weitere) sind erlaubt.`,
      blocked: (blocked, total, names) =>
        `${blocked} von ${total} Live-Agenten sind blockiert: ${names}. Diese Seite kann nicht in ihren Antworten erscheinen.`,
      evidence: (name, rule, group) => `${name} blockiert durch „${rule}“ in der Gruppe „User-agent: ${group}“`,
      fix: (names) =>
        `Fügen Sie in /robots.txt explizite Allow-Gruppen oberhalb Ihrer Wildcard-Regeln ein. Diese Agenten rufen eine Seite nur ab, weil ein Nutzer etwas gefragt hat, das sie beantwortet – eine Sperre entfernt Sie aus der Antwort, nicht aus dem Training:\n\n${allowSnippet(names)}`,
    },
    indexingBots: {
      title: 'KI-Suchindexer können diese Seite crawlen',
      ok: (total) => `Alle ${total} Indexer von Antwortmaschinen sind erlaubt.`,
      blocked: (names) => `Blockierte Indexer: ${names}. Sie erscheinen nicht in deren Quellenliste.`,
      evidence: (name, rule) => `${name} blockiert durch „${rule}“`,
      fix: (names) =>
        `Diese Crawler bauen den Index auf, aus dem Antwortmaschinen zitieren. Erlauben Sie sie explizit:\n\n${allowSnippet(names)}`,
    },
    trainingBots: {
      title: 'Die Richtlinie für Trainings-Crawler ist bewusst gewählt',
      ok: 'Alle Trainings-Crawler sind erlaubt – das maximiert die Präsenz der Marke in den Modellen selbst.',
      blocked: (count, names) =>
        `${count} Trainings-Crawler blockiert (${names}). Das ist eine legitime Haltung, solange sie beabsichtigt ist.`,
      state: (name, allowed) => `${name}: ${allowed ? 'erlaubt' : 'blockiert'}`,
      fix: 'Falls die Sperre versehentlich ist, stammt sie meist aus einer zu breiten Wildcard-Gruppe. Sie hält Sie außerdem aus dem Modellwissen heraus, mit dem ohne Suche geantwortet wird – dort gibt es gar keine Zitatmöglichkeit.',
    },
    pageOptOut: {
      title: 'Keine noindex- oder noai-Anweisung auf der Seite',
      noindex: 'Die Seite trägt eine noindex-Anweisung und ist damit für alle Such- und Antwortmaschinen unsichtbar.',
      noai: 'Eine noai/noimageai-Anweisung bittet KI-Systeme, diesen Inhalt nicht zu nutzen.',
      ok: 'Keine Anweisung unterdrückt diese Seite.',
      meta: (value) => `meta robots: ${value}`,
      noMeta: 'Kein meta-robots-Tag',
      header: (value) => `X-Robots-Tag: ${value}`,
      noHeader: 'Kein X-Robots-Tag-Header',
      fixNoindex:
        'Entfernen Sie `noindex` sowohl aus dem meta-robots-Tag als auch aus dem X-Robots-Tag-Header. Diese eine Anweisung hebt jede andere Optimierung auf.',
      fixNoai: 'Entfernen Sie `noai`, wenn Assistenten die Seite zitieren sollen; lassen Sie es, wenn der Opt-out beabsichtigt ist.',
    },

    serverRendered: {
      title: 'Inhalt ist ohne JavaScript vorhanden',
      ok: (words) => `${words} Wörter sind direkt in der HTML-Antwort lesbar.`,
      thin: (words) => `Nur ${words} Wörter werden serverseitig gerendert. Dünne Seiten werden selten zitiert.`,
      empty: (words) =>
        `Fast nichts wird serverseitig gerendert (${words} Wörter). KI-Crawler sehen eine leere Seite.`,
      words: (count) => `${count} Wörter sichtbarer Text im HTML`,
      size: (kb) => `${kb} KB HTML empfangen`,
      fix: 'Rendern Sie den Hauptinhalt auf dem Server. In Next.js gehört er in eine Server Component (kein `use client` darüber); in Nuxt nutzen Sie SSR oder `nuxt generate`; in einer reinen SPA prerendern Sie die Routen für Crawler. Prüfen Sie mit `curl -s <url>` – was Sie dort nicht sehen, sieht auch kein KI-Crawler.',
    },
    clientShell: {
      title: 'Keine leere clientseitige Hülle',
      fail: (selectors) => `Leerer Einhängepunkt gefunden (${selectors}), der erst per JavaScript gefüllt wird.`,
      ok: 'Kein leerer clientseitiger Einhängepunkt gefunden.',
      empty: (selector) => `${selector} ist vorhanden, enthält aber keinen Text`,
      scripts: (count) => `${count} externe Script-Tags auf der Seite`,
      fix: 'Das ist der teuerste Sichtbarkeitsfehler: Der Crawler bekommt einen leeren Container und zieht weiter. Verlagern Sie das Rendering auf den Server oder prerendern Sie jede Route beim Build zu statischem HTML.',
    },
    llmsTxt: {
      title: 'llms.txt gibt Assistenten eine kuratierte Übersicht',
      ok: 'Eine korrekte /llms.txt ist veröffentlicht.',
      malformed: '/llms.txt existiert, folgt aber nicht der erwarteten Markdown-Struktur.',
      missing: 'Keine /llms.txt. Assistenten müssen raten, welche Seiten wichtig sind.',
      lines: (count) => `${count} Zeilen`,
      fix: (host, origin) =>
        `Veröffentlichen Sie /llms.txt als statisches Markdown mit Links zu den Seiten, die zitiert werden sollen:\n\n# ${host}\n\n> Ein Satz, der beschreibt, was diese Website ist.\n\n## Docs\n- [Getting started](${origin}/docs/start): Inhalt\n- [Pricing](${origin}/pricing): Tarife und Limits`,
    },
    sitemap: {
      title: 'Eine gültige XML-Sitemap ist erreichbar',
      ok: (count) => `Sitemap mit ${count} URL-Einträgen gefunden.`,
      missing: 'Keine gültige XML-Sitemap gefunden – Indexer müssen Seiten über Links entdecken.',
      fix: (origin) =>
        `Erzeugen Sie /sitemap.xml mit <lastmod>-Angaben und deklarieren Sie sie in robots.txt:\n\nSitemap: ${origin}/sitemap.xml`,
    },
    textRatio: {
      title: 'Das HTML besteht überwiegend aus Inhalt',
      summary: (percent) => `${percent} % der Antwort sind lesbarer Text.`,
      text: (count) => `${count} Zeichen Text`,
      html: (count) => `${count} Zeichen HTML`,
      fix: 'Extraktionssysteme kürzen lange Dokumente, bevor das Modell sie sieht – schweres Markup verdrängt also Ihren Inhalt. Lagern Sie Inline-Styles und große JSON-Blöcke aus und reduzieren Sie Wrapper-Elemente.',
    },

    jsonLd: {
      title: 'JSON-LD-Daten sind vorhanden und gültig',
      parseError: (count) =>
        `Strukturierte Daten sind vorhanden, aber ${count} Block/Blöcke ließen sich nicht parsen und werden komplett ignoriert.`,
      ok: (types) => `Deklariert ${types}.`,
      missing: 'Kein aussagekräftiges JSON-LD. Modelle müssen das Thema allein aus dem Fließtext ableiten.',
      entities: (count) => `${count} schema.org-Entitäten gefunden`,
      types: (list) => `Typen: ${list}`,
      invalidBlock: (index) => `Block Nr. ${index} ist kein gültiges JSON`,
      fix: 'Fügen Sie einen JSON-LD-Block in <head> ein. Das ist der günstigste Weg, einem Modell genau zu sagen, wer Sie sind:\n\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "Page title",\n  "author": { "@type": "Person", "name": "Author name" },\n  "datePublished": "2026-01-15",\n  "dateModified": "2026-09-01",\n  "publisher": { "@type": "Organization", "name": "Your company" }\n}\n</script>',
    },
    authorship: {
      title: 'Die Autorenschaft ist maschinenlesbar',
      ok: 'Ein Autor ist in den strukturierten Daten deklariert.',
      metaOnly: 'Autorenangaben gibt es nur in Meta-Tags – ein schwächeres Signal.',
      missing: 'Keine Autorenangabe. Anonyme Inhalte werden seltener als Quelle gewählt.',
      jsonLd: (present) => `author-Eigenschaft im JSON-LD: ${present}`,
      meta: (present) => `Autor-Meta-Tag oder Mikrodaten: ${present}`,
      fix: 'Ergänzen Sie `author` in Ihrem Article/BlogPosting-JSON-LD mit einer Person und einer `url` zu einer echten Profilseite. Bei gleich relevanten Quellen bevorzugen Antwortmaschinen erkennbare Expertise.',
    },
    freshness: {
      title: 'Veröffentlichungs- und Änderungsdatum sind angegeben',
      ok: 'datePublished und dateModified sind deklariert.',
      partial: 'Nur eines von datePublished / dateModified ist vorhanden.',
      missing: 'Keine maschinenlesbaren Daten. Bei zeitkritischen Fragen verlieren undatierte Inhalte.',
      published: (value) => `datePublished: ${value}`,
      modified: (value) => `dateModified: ${value}`,
      header: (value) => `Last-Modified-Header: ${value}`,
      fix: 'Geben Sie `datePublished` und `dateModified` im ISO-8601-Format im JSON-LD an und aktualisieren Sie `dateModified` bei jeder echten Änderung. Assistenten filtern nach Aktualität, sobald eine Frage „aktuell“ impliziert.',
    },
    faqSchema: {
      title: 'Frage-Antwort-Markup wird genutzt, wo es passt',
      ok: (types) => `Antwortförmiges Markup vorhanden: ${types}.`,
      missing: 'Kein FAQPage- oder HowTo-Markup. Das Frage-Antwort-Format wird am direktesten übernommen.',
      detected: (types) => `Erkannte Typen: ${types}`,
      fix: 'Wenn die Seite konkrete Fragen beantwortet, verpacken Sie sie in FAQPage-Markup, damit jedes Paar wörtlich extrahiert werden kann:\n\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "How much does it cost?",\n    "acceptedAnswer": { "@type": "Answer", "text": "Plans start at $7/month." }\n  }]\n}',
    },

    headings: {
      title: 'Überschriften bilden eine klare Gliederung',
      noH1: 'Gar keine H1 – die Seite hat keinen eindeutigen Titel.',
      manyH1: (count) => `${count} H1-Elemente konkurrieren um das Seitenthema.`,
      fewH2: 'Eine H1, aber kaum H2-Abschnitte – die Seite ist ein einziger undifferenzierter Block.',
      ok: (h2) => `Klare Gliederung: 1 H1 und ${h2} H2-Abschnitte.`,
      counts: (h1, h2, h3) => `H1: ${h1}, H2: ${h2}, H3: ${h3}`,
      fix: 'Retrieval-Systeme zerlegen Seiten vor der Vektorisierung an Überschriften in Abschnitte. Nutzen Sie genau eine H1 für das Thema und eine H2 pro eigenständiger Teilantwort, damit jeder Abschnitt für sich verständlich bleibt.',
    },
    questionHeadings: {
      title: 'Überschriften entsprechen echten Fragen',
      ok: (questions, total) => `${questions} von ${total} Überschriften sind als Fragen oder direkte Anfragen formuliert.`,
      none: 'Keine Überschriften in Frageform. Nichts auf der Seite passt zu einer natürlichsprachlichen Anfrage.',
      fix: 'Formulieren Sie Abschnittsüberschriften als die Frage, die ein Nutzer eintippen würde, und beantworten Sie sie in den ersten zwei Sätzen. Aus „Preise“ wird „Was kostet X?“ – die semantische Übereinstimmung mit der Anfrage entscheidet, ob der Abschnitt gefunden wird.',
    },
    formatting: {
      title: 'Fakten stehen in Listen oder Tabellen',
      ok: (items, tables) => `${items} Listenpunkte und ${tables} Tabelle(n) bieten dem Modell direkt Zitierbares.`,
      prose: 'Der Inhalt ist fast nur Fließtext und damit schwerer genau zu zitieren.',
      items: (count) => `${count} Listenpunkte`,
      tables: (count) => `${count} Tabellen`,
      fix: 'Setzen Sie Vergleiche, Schritte und Spezifikationen als echtes <ul>/<ol>/<table>-Markup um. Strukturierte Fragmente überstehen die Zerlegung intakt und werden mit deutlich weniger erfundenen Details wiedergegeben.',
    },
    paragraphs: {
      title: 'Absätze sind kurz genug zum Zitieren',
      none: 'Im Server-HTML wurden keine inhaltlichen Absätze gefunden.',
      summary: (average, count) => `Durchschnittlich ${average} Wörter pro Absatz bei ${count} Absätzen.`,
      analysed: (count) => `${count} Absätze analysiert`,
      fix: 'Halten Sie Absätze unter etwa 80 Wörtern und stellen Sie die Kernaussage an den Anfang. Lange Absätze werden mitten im Argument geteilt, und der gefundene Teil verliert oft die Schlussfolgerung.',
    },
    depth: {
      title: 'Die Seite hat genug Substanz, um Quelle zu sein',
      summary: (words) => `${words} Wörter lesbarer Inhalt.`,
      words: (count) => `${count} Wörter`,
      sentences: (count) => `etwa ${count} Sätze`,
      fix: 'Dünne Seiten werden selten zitiert, weil sie keine eigenen Fakten bieten. Ergänzen Sie eigene Daten, Beispiele oder Zahlen, die ein Modell nicht aus drei anderen Quellen bekommt.',
    },
    semanticHtml: {
      title: 'Der Hauptinhalt steckt in semantischen Containern',
      ok: 'Der Inhalt ist in <main> oder <article> eingebettet.',
      missing: 'Kein <main>- oder <article>-Element – Inhalt und Seitengerüst sind nicht unterscheidbar.',
      fix: 'Umschließen Sie den Fließtext mit <main> oder <article> und halten Sie die Navigation in <nav>/<footer>. Extraktoren nutzen diese Landmarken, um Beiwerk zu entfernen – ohne sie landet Ihr Menü im extrahierten Inhalt.',
    },

    titleTag: {
      title: 'Der Title-Tag ist aussagekräftig und passend lang',
      missing: 'Kein Title-Tag. Die Seite hat keinen Namen, unter dem sie zitiert werden kann.',
      summary: (length, text) => `Der Title hat ${length} Zeichen: „${text}“.`,
      fix: 'Schreiben Sie einen Title mit 15–65 Zeichen, der die konkrete Aussage der Seite nennt und mit dem Namen der Marke beginnt. Genau diesen Text zeigt ein Assistent als Linktext, wenn er Sie zitiert.',
    },
    metaDescription: {
      title: 'Die Meta-Description fasst die Antwort zusammen',
      missing: 'Keine Meta-Description.',
      summary: (length) => `Die Description hat ${length} Zeichen.`,
      fix: 'Schreiben Sie eine Description mit 70–175 Zeichen, die die Frage der Seite in einem Satz beantwortet. Retrieval-Systeme nutzen sie oft als Zusammenfassung beim Ranking von Quellen.',
    },
    canonical: {
      title: 'Die kanonische URL ist vorhanden und konsistent',
      ok: 'Eine kanonische URL auf derselben Domain ist deklariert.',
      crossOrigin: (url) => `Canonical verweist auf eine andere Domain: ${url}`,
      missing: 'Keine kanonische URL – doppelte Varianten der Seite konkurrieren miteinander.',
      finalUrl: (url) => `Finale URL: ${url}`,
      fix: (url) =>
        `Fügen Sie <link rel="canonical" href="${url}"> hinzu, damit sich die Zitier-Autorität auf eine Adresse konzentriert, statt sich auf Varianten mit Parametern oder Schrägstrich zu verteilen.`,
    },
    openGraph: {
      title: 'Open-Graph-Metadaten sind vollständig',
      summary: (present, total) => `${present} von ${total} zentralen Open-Graph-Tags vorhanden.`,
      tag: (tag, present) => `${tag}: ${present ? 'vorhanden' : 'fehlt'}`,
      fix: 'Ergänzen Sie og:title, og:description, og:url und og:image. Mehrere Assistenten zeigen daraus Link-Karten an, und eine nackte URL wird deutlich seltener angeklickt.',
    },
    language: {
      title: 'Die Dokumentsprache ist deklariert',
      ok: (lang) => `Deklarierte Sprache: ${lang}.`,
      missing: 'Kein lang-Attribut an <html>.',
      fix: 'Setzen Sie <html lang="de"> (oder Ihre tatsächliche Sprache). Das Sprach-Routing entscheidet, ob Ihre Seite für eine Anfrage in dieser Sprache überhaupt infrage kommt.',
    },

    httpStatus: {
      title: 'Die Seite liefert eine erfolgreiche Antwort',
      ok: (status, url) => `HTTP ${status} von ${url}.`,
      error: (message) => `Anfrage fehlgeschlagen: ${message}`,
      bad: (status) => `HTTP ${status} – Crawler verwerfen diese Seite.`,
      status: (status) => `Status: ${status}`,
      contentType: (type) => `Content-Type: ${type}`,
      noResponse: 'keine Antwort',
      unknown: 'unbekannt',
      fix: 'Stellen Sie sicher, dass die URL auf eine anonyme Anfrage mit 200 antwortet. Bot-Schutz (aggressive WAF-Regeln, „Under Attack“-Modi) liefert KI-Crawlern oft 403, obwohl die Seite im Browser normal lädt.',
    },
    https: {
      title: 'Auslieferung über HTTPS',
      ok: 'Die Seite wird über HTTPS ausgeliefert.',
      fail: 'Die Seite wird über unverschlüsseltes HTTP ausgeliefert.',
      fix: 'Liefern Sie die Website über HTTPS aus und leiten Sie HTTP per 301 weiter. Einige Crawler überspringen unsichere Ursprünge komplett.',
    },
    responseTime: {
      title: 'Der Server antwortet schnell',
      summary: (ms) => `Die vollständige Antwort dauerte ${ms} ms.`,
      evidence: (ms) => `${ms} ms von der Anfrage bis zum vollständigen Inhalt`,
      fix: 'Live-Agenten arbeiten mit einem harten Zeitbudget, während der Nutzer wartet. Langsame Seiten fallen aus der Auswahl, selbst wenn sie die beste Quelle wären. Cachen Sie HTML am Edge und halten Sie aufwendige Arbeit vom kritischen Pfad fern.',
    },
    redirects: {
      title: 'Wenige Weiterleitungen bis zur Seite',
      none: 'Keine Weiterleitungen.',
      summary: (hops) => `${hops} Weiterleitung(en) bis zur finalen URL.`,
      hops: (count) => `${count} Schritt(e)`,
      requested: (url) => `Angefragt: ${url}`,
      final: (url) => `Final: ${url}`,
      fix: 'Reduzieren Sie Weiterleitungsketten auf einen Schritt. Manche Crawler folgen nach zwei nicht mehr, und jeder Schritt kostet Zeit in einem zeitlich begrenzten Abruf.',
    },
    htmlWeight: {
      title: 'Die HTML-Größe ist angemessen',
      summary: (kb) => `${kb} KB HTML.`,
      fix: 'Verschlanken Sie das Dokument. Extraktionssysteme kürzen übergroße Seiten, und abgeschnitten wird das Ende – oft Ihr Fazit.',
    },
    imageAlt: {
      title: 'Bilder haben beschreibenden Alt-Text',
      noImages: 'Keine Bilder auf der Seite.',
      summary: (withAlt, total, percent) => `${withAlt} von ${total} Bildern haben Alt-Text (${percent} %).`,
      images: (count) => `${count} Bilder`,
      withAlt: (count) => `${count} mit nicht leerem Alt`,
      fix: 'Beschreiben Sie, was jedes informative Bild zeigt. Alt-Text ist das Einzige eines Bildes, das ein reiner Text-Crawler erhält – und Diagramme oder Screenshots enthalten oft genau die zitierwürdigen Daten.',
    },
  },
};
