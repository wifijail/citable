import type { AuditMessages } from './en';

const allowSnippet = (names: string[]) =>
  names.map((name) => `User-agent: ${name}\nAllow: /\n`).join('\n');

export const auditEs: AuditMessages = {
  common: {
    missing: 'falta',
    none: 'ninguno',
    yes: 'sí',
    no: 'no',
    httpStatus: (url, status) => `${url} → HTTP ${status || 'sin respuesta'}`,
  },

  categories: {
    'crawler-access': {
      label: 'Acceso de rastreadores IA',
      description: 'Si los agentes de IA tienen permiso para descargar esta página.',
    },
    'machine-readability': {
      label: 'Legibilidad para máquinas',
      description: 'Si el contenido existe en el HTML sin ejecutar JavaScript.',
    },
    'structured-data': {
      label: 'Datos estructurados',
      description: 'Datos legibles por máquinas sobre la entidad, el autor y la actualidad.',
    },
    answerability: {
      label: 'Capacidad de respuesta',
      description: 'Si el contenido está organizado en respuestas fáciles de citar.',
    },
    identity: {
      label: 'Metadatos e identidad',
      description: 'Cómo se presenta la página en vistas previas y citas.',
    },
    technical: {
      label: 'Salud técnica',
      description: 'Señales de red e indexación que pueden ocultar una página sin avisar.',
    },
  },

  purposes: {
    retrieval: 'Responde preguntas en vivo',
    indexing: 'Construye el índice de respuestas',
    training: 'Recopila datos de entrenamiento',
  },

  crawlerNotes: {
    'oai-searchbot': 'Construye el índice de los resultados y citas de ChatGPT Search.',
    'chatgpt-user': 'Descarga tu página en vivo cuando un usuario de ChatGPT pregunta algo que responde.',
    gptbot: 'Recopilación para entrenamiento. Bloquearlo es una decisión defendible.',
    claudebot: 'Recopilación de datos de entrenamiento para Claude.',
    'claude-user': 'Descarga tu página en vivo para una petición de un usuario de Claude.',
    'claude-searchbot': 'Indexa páginas para que Claude pueda mostrarlas y citarlas.',
    perplexitybot: 'Construye el índice de Perplexity, la principal fuente de sus citas.',
    'perplexity-user': 'Descarga en vivo provocada por una acción de un usuario de Perplexity.',
    'google-extended': 'Controla el uso en Gemini sin afectar al posicionamiento en Search.',
    googlebot: 'AI Overviews se basa en el índice normal de Google: es imprescindible.',
    bingbot: 'Alimenta Copilot y varios motores de respuesta de terceros.',
    'applebot-extended': 'Token de exclusión del entrenamiento de Apple Intelligence.',
    'meta-externalagent': 'Rastreo y entrenamiento de Meta AI.',
    amazonbot: 'Impulsa las respuestas de Alexa y Rufus.',
    ccbot: 'Common Crawl alimenta la mayoría de los datasets abiertos.',
    duckassistbot: 'Respuestas con IA de DuckDuckGo.',
  },

  verdicts: {
    criticalOne:
      'Un problema crítico impide que los asistentes de IA citen esta página. Corrígelo primero: todo lo demás es secundario.',
    criticalMany: (count) =>
      `${count} problemas críticos impiden que los asistentes de IA citen esta página. Corrígelos primero: todo lo demás es secundario.`,
    a: 'La página está en excelente forma para la búsqueda con IA. Mantén las fechas al día y vigila las regresiones.',
    b: 'Buena base. Unos pocos ajustes concretos pondrían la página por delante de la mayoría de competidores.',
    c: 'Los rastreadores de IA pueden leerla, pero no está pensada para ser citada. Las carencias de estructura y datos te cuestan citas.',
    d: 'Carencias importantes. Los asistentes llegan a la página pero les cuesta extraer una respuesta fiable.',
    f: 'Esta página es prácticamente invisible para la búsqueda con IA. Los fallos de abajo son estructurales, no cosméticos.',
  },

  warnings: {
    fetchFailed: (error) => `No se pudo descargar la página: ${error}`,
    httpStatus: (status) => `La página respondió con HTTP ${status}.`,
    suiteFailed: (message) => `Un grupo de comprobaciones falló y se omitió: ${message}`,
    timeout: (ms) => `Tiempo de espera agotado (${ms} ms)`,
  },

  errors: {
    empty: 'Introduce una URL para analizar.',
    invalid: (input) => `"${input}" no es una URL válida.`,
    protocol: 'Solo se pueden analizar URLs http:// y https://.',
    privateHost: 'No se pueden analizar hosts locales o privados.',
    fullDomain: 'Introduce un dominio público completo, por ejemplo example.com.',
    privateIp: 'No se pueden analizar direcciones de redes privadas.',
    unresolvable: (host) => `No se pudo resolver "${host}". Revisa el dominio e inténtalo de nuevo.`,
    resolvesPrivate: 'Ese dominio apunta a una dirección privada.',
  },

  checks: {
    robotsPresent: {
      title: 'robots.txt es accesible',
      ok: (groups) => `robots.txt encontrado con ${groups} grupo(s) de user-agent.`,
      missing:
        'No hay un robots.txt utilizable. Los rastreadores asumen "todo permitido": funciona, pero no tienes ningún control.',
      sitemaps: (count) => `Declara ${count} sitemap(s)`,
      fix: (origin) =>
        `Publica /robots.txt para que el acceso de la IA sea una decisión explícita y no un valor por defecto:\n\nUser-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`,
    },
    retrievalBots: {
      title: 'Los agentes en vivo pueden descargar esta página',
      ok: (total) =>
        `Los ${total} agentes en vivo (ChatGPT-User, Claude-User, Perplexity-User y otros) están permitidos.`,
      blocked: (blocked, total, names) =>
        `${blocked} de ${total} agentes en vivo están bloqueados: ${names}. Esta página no puede aparecer en sus respuestas.`,
      evidence: (name, rule, group) => `${name} bloqueado por "${rule}" en el grupo "User-agent: ${group}"`,
      fix: (names) =>
        `Añade grupos de permiso explícitos encima de tus reglas comodín en /robots.txt. Estos agentes solo descargan una página porque un usuario preguntó algo que responde: bloquearlos te saca de la respuesta, no del entrenamiento:\n\n${allowSnippet(names)}`,
    },
    indexingBots: {
      title: 'Los indexadores de búsqueda con IA pueden rastrear la página',
      ok: (total) => `Los ${total} indexadores de motores de respuesta están permitidos.`,
      blocked: (names) => `Indexadores bloqueados: ${names}. No aparecerás en su lista de fuentes.`,
      evidence: (name, rule) => `${name} bloqueado por "${rule}"`,
      fix: (names) =>
        `Estos rastreadores construyen el índice del que citan los motores de respuesta. Permítelos explícitamente:\n\n${allowSnippet(names)}`,
    },
    trainingBots: {
      title: 'La política con rastreadores de entrenamiento es deliberada',
      ok: 'Todos los rastreadores de entrenamiento están permitidos, lo que maximiza la presencia de la marca dentro de los propios modelos.',
      blocked: (count, names) =>
        `${count} rastreador(es) de entrenamiento bloqueados (${names}). Es una postura legítima siempre que sea intencionada.`,
      state: (name, allowed) => `${name}: ${allowed ? 'permitido' : 'bloqueado'}`,
      fix: 'Si el bloqueo fue accidental, suele venir de un grupo comodín demasiado amplio. También te deja fuera del conocimiento con el que el modelo responde sin buscar, donde no hay ninguna oportunidad de cita.',
    },
    pageOptOut: {
      title: 'Sin directivas noindex ni noai en la página',
      noindex: 'La página tiene una directiva noindex: es invisible para todos los buscadores y motores de respuesta.',
      noai: 'Una directiva noai/noimageai pide a los sistemas de IA que no usen este contenido.',
      ok: 'Ninguna directiva está ocultando esta página.',
      meta: (value) => `meta robots: ${value}`,
      noMeta: 'Sin etiqueta meta robots',
      header: (value) => `X-Robots-Tag: ${value}`,
      noHeader: 'Sin cabecera X-Robots-Tag',
      fixNoindex:
        'Elimina `noindex` tanto de la etiqueta meta robots como de la cabecera X-Robots-Tag. Esta única directiva anula cualquier otra optimización.',
      fixNoai: 'Quita `noai` si quieres que los asistentes citen la página; mantenlo si la exclusión es deliberada.',
    },

    serverRendered: {
      title: 'El contenido existe sin ejecutar JavaScript',
      ok: (words) => `${words} palabras se leen directamente en la respuesta HTML.`,
      thin: (words) => `Solo ${words} palabras se renderizan en el servidor. Las páginas escasas rara vez se citan.`,
      empty: (words) =>
        `Casi nada se renderiza en el servidor (${words} palabras). Los rastreadores de IA ven una página vacía.`,
      words: (count) => `${count} palabras de texto visible en el HTML`,
      size: (kb) => `${kb} KB de HTML recibidos`,
      fix: 'Renderiza el contenido principal en el servidor. En Next.js mantenlo en un Server Component (sin `use client` por encima); en Nuxt usa SSR o `nuxt generate`; en una SPA pura, prerenderiza las rutas para rastreadores. Compruébalo con `curl -s <url>`: lo que no ves ahí, no lo ve ningún rastreador de IA.',
    },
    clientShell: {
      title: 'Sin contenedor vacío renderizado en el cliente',
      fail: (selectors) => `Se encontró un punto de montaje vacío (${selectors}) que JavaScript rellena después.`,
      ok: 'No se detectó ningún punto de montaje vacío.',
      empty: (selector) => `${selector} existe pero no contiene texto`,
      scripts: (count) => `${count} script(s) externos en la página`,
      fix: 'Es el error de visibilidad más caro: el rastreador recibe un contenedor vacío y se va. Lleva el renderizado al servidor o prerenderiza cada ruta a HTML estático al compilar.',
    },
    llmsTxt: {
      title: 'llms.txt ofrece a los asistentes un mapa del sitio',
      ok: 'Hay un /llms.txt bien formado publicado.',
      malformed: '/llms.txt existe pero no sigue la estructura Markdown esperada.',
      missing: 'No hay /llms.txt. Los asistentes tienen que adivinar qué páginas importan.',
      lines: (count) => `${count} líneas`,
      fix: (host, origin) =>
        `Publica /llms.txt como Markdown estático con enlaces a las páginas que quieres ver citadas:\n\n# ${host}\n\n> Una frase que describa qué es este sitio.\n\n## Docs\n- [Getting started](${origin}/docs/start): qué cubre\n- [Pricing](${origin}/pricing): planes y límites`,
    },
    sitemap: {
      title: 'Hay un sitemap XML válido accesible',
      ok: (count) => `Sitemap encontrado con ${count} URLs.`,
      missing: 'No se encontró un sitemap XML válido: los indexadores deben descubrir las páginas siguiendo enlaces.',
      fix: (origin) =>
        `Genera /sitemap.xml con fechas <lastmod> y decláralo en robots.txt:\n\nSitemap: ${origin}/sitemap.xml`,
    },
    textRatio: {
      title: 'El HTML es sobre todo contenido, no marcado',
      summary: (percent) => `El ${percent}% de la respuesta es texto legible.`,
      text: (count) => `${count} caracteres de texto`,
      html: (count) => `${count} caracteres de HTML`,
      fix: 'Los sistemas de extracción recortan los documentos largos antes de que el modelo los vea, así que el marcado pesado desplaza tu contenido. Saca los estilos en línea y los bloques JSON grandes del documento y reduce los envoltorios.',
    },

    jsonLd: {
      title: 'Hay datos estructurados JSON-LD válidos',
      parseError: (count) =>
        `Hay datos estructurados pero ${count} bloque(s) no se pudieron analizar, así que se ignoran por completo.`,
      ok: (types) => `Declara ${types}.`,
      missing: 'No hay JSON-LD útil. Los modelos tienen que deducir de qué trata la página solo por el texto.',
      entities: (count) => `${count} entidades schema.org encontradas`,
      types: (list) => `Tipos: ${list}`,
      invalidBlock: (index) => `El bloque n.º ${index} no es JSON válido`,
      fix: 'Añade un bloque JSON-LD en <head>. Es la forma más barata de decirle a un modelo exactamente quién eres:\n\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "Page title",\n  "author": { "@type": "Person", "name": "Author name" },\n  "datePublished": "2026-01-15",\n  "dateModified": "2026-09-01",\n  "publisher": { "@type": "Organization", "name": "Your company" }\n}\n</script>',
    },
    authorship: {
      title: 'La autoría es legible por máquinas',
      ok: 'Se declara un autor en los datos estructurados.',
      metaOnly: 'El autor solo aparece en etiquetas meta, una señal más débil.',
      missing: 'No hay información de autor. El contenido anónimo se elige menos como fuente.',
      jsonLd: (present) => `Propiedad author en JSON-LD: ${present}`,
      meta: (present) => `Etiqueta meta de autor o microdatos: ${present}`,
      fix: 'Añade la propiedad `author` a tu JSON-LD de Article/BlogPosting, apuntando a una Person con `url` a una página de biografía real. Ante dos fuentes igual de relevantes, los motores eligen la experiencia identificable.',
    },
    freshness: {
      title: 'Las fechas de publicación y actualización están expuestas',
      ok: 'Se declaran datePublished y dateModified.',
      partial: 'Solo aparece una de las dos: datePublished o dateModified.',
      missing: 'No hay fechas legibles por máquinas. En preguntas sensibles al tiempo, el contenido sin fecha pierde.',
      published: (value) => `datePublished: ${value}`,
      modified: (value) => `dateModified: ${value}`,
      header: (value) => `Cabecera Last-Modified: ${value}`,
      fix: 'Emite `datePublished` y `dateModified` en ISO-8601 en el JSON-LD y actualiza `dateModified` con cada cambio real. Los asistentes filtran por actualidad cuando la pregunta implica "ahora".',
    },
    faqSchema: {
      title: 'Se usa marcado de preguntas y respuestas donde encaja',
      ok: (types) => `Hay marcado en formato de respuesta: ${types}.`,
      missing: 'No hay marcado FAQPage ni HowTo. El formato pregunta-respuesta es el que más se extrae.',
      detected: (types) => `Tipos detectados: ${types}`,
      fix: 'Si la página responde a preguntas concretas, envuélvelas en FAQPage para que cada par pueda extraerse literalmente:\n\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "How much does it cost?",\n    "acceptedAnswer": { "@type": "Answer", "text": "Plans start at $7/month." }\n  }]\n}',
    },

    headings: {
      title: 'Los encabezados forman un esquema claro',
      noH1: 'No hay ningún H1: la página no tiene un título inequívoco.',
      manyH1: (count) => `${count} elementos H1 compiten por el tema de la página.`,
      fewH2: 'Un H1 pero casi sin secciones H2: la página es un único bloque indiferenciado.',
      ok: (h2) => `Esquema claro: 1 H1 y ${h2} secciones H2.`,
      counts: (h1, h2, h3) => `H1: ${h1}, H2: ${h2}, H3: ${h3}`,
      fix: 'Los sistemas de recuperación dividen las páginas en fragmentos por encabezados antes de vectorizarlas. Usa exactamente un H1 para el tema y un H2 por cada respuesta independiente, para que cada fragmento tenga sentido por sí solo.',
    },
    questionHeadings: {
      title: 'Los encabezados coinciden con cómo pregunta la gente',
      ok: (questions, total) => `${questions} de ${total} encabezados están formulados como preguntas o consultas directas.`,
      none: 'No hay encabezados en forma de pregunta. Nada en la página coincide con una consulta natural.',
      fix: 'Reescribe los encabezados como la pregunta que escribiría un usuario y respóndela en las dos primeras frases. "Precios" pasa a ser "¿Cuánto cuesta X?": la coincidencia semántica con la consulta es lo que hace que se recupere el fragmento.',
    },
    formatting: {
      title: 'Los datos están en listas o tablas',
      ok: (items, tables) => `${items} elementos de lista y ${tables} tabla(s) dan al modelo algo que citar directamente.`,
      prose: 'El contenido es casi todo prosa, más difícil de citar con precisión.',
      items: (count) => `${count} elementos de lista`,
      tables: (count) => `${count} tablas`,
      fix: 'Convierte comparaciones, pasos y especificaciones en marcado real <ul>/<ol>/<table>. Los fragmentos estructurados sobreviven intactos a la división y se reproducen con muchos menos detalles inventados.',
    },
    paragraphs: {
      title: 'Los párrafos son lo bastante cortos para citarlos',
      none: 'No se encontraron párrafos sustanciales en el HTML del servidor.',
      summary: (average, count) => `La longitud media es de ${average} palabras en ${count} párrafos.`,
      analysed: (count) => `${count} párrafos analizados`,
      fix: 'Mantén los párrafos por debajo de unas 80 palabras y pon la afirmación en la primera frase. Los párrafos largos se cortan a mitad del argumento y la mitad recuperada suele perder la conclusión.',
    },
    depth: {
      title: 'La página tiene suficiente contenido para ser una fuente',
      summary: (words) => `${words} palabras de contenido legible.`,
      words: (count) => `${count} palabras`,
      sentences: (count) => `unas ${count} frases`,
      fix: 'Las páginas escasas rara vez se eligen como cita porque no aportan datos únicos. Añade datos propios, ejemplos o cifras que un modelo no encuentre en otras tres fuentes.',
    },
    semanticHtml: {
      title: 'El contenido principal está en contenedores semánticos',
      ok: 'El contenido está dentro de <main> o <article>.',
      missing: 'No hay <main> ni <article>: el contenido y los elementos repetidos son indistinguibles.',
      fix: 'Envuelve el texto principal en <main> o <article> y deja la navegación en <nav>/<footer>. Los extractores usan estas marcas para descartar lo accesorio; sin ellas, tu menú puede acabar dentro del contenido extraído.',
    },

    titleTag: {
      title: 'La etiqueta title es descriptiva y de buen tamaño',
      missing: 'No hay etiqueta title. La página no tiene un nombre con el que ser citada.',
      summary: (length, text) => `El title tiene ${length} caracteres: "${text}".`,
      fix: 'Escribe un title de 15 a 65 caracteres que exprese la idea concreta de la página, empezando por el nombre de la entidad. Es el texto que el asistente muestra como enlace cuando te cita.',
    },
    metaDescription: {
      title: 'La meta description resume la respuesta',
      missing: 'No hay meta description.',
      summary: (length) => `La description tiene ${length} caracteres.`,
      fix: 'Escribe una description de 70 a 175 caracteres que responda la pregunta de la página en una frase. Los sistemas de recuperación la usan a menudo como resumen al ordenar fuentes candidatas.',
    },
    canonical: {
      title: 'La URL canónica existe y es coherente',
      ok: 'Se declara una URL canónica del mismo origen.',
      crossOrigin: (url) => `La canónica apunta a otro origen: ${url}`,
      missing: 'No hay URL canónica: las variantes duplicadas compiten entre sí.',
      finalUrl: (url) => `URL final: ${url}`,
      fix: (url) =>
        `Añade <link rel="canonical" href="${url}"> para que la autoridad de las citas se concentre en una sola dirección en vez de repartirse entre variantes con parámetros o barra final.`,
    },
    openGraph: {
      title: 'Los metadatos Open Graph están completos',
      summary: (present, total) => `${present} de ${total} etiquetas Open Graph básicas presentes.`,
      tag: (tag, present) => `${tag}: ${present ? 'presente' : 'falta'}`,
      fix: 'Añade og:title, og:description, og:url y og:image. Varios asistentes muestran tarjetas de enlace con estas etiquetas, y una URL desnuda recibe muchos menos clics.',
    },
    language: {
      title: 'El idioma del documento está declarado',
      ok: (lang) => `Idioma declarado: ${lang}.`,
      missing: 'No hay atributo lang en <html>.',
      fix: 'Define <html lang="es"> (o tu idioma real). El enrutado por idioma decide si tu página se considera siquiera para una consulta en ese idioma.',
    },

    httpStatus: {
      title: 'La página devuelve una respuesta correcta',
      ok: (status, url) => `HTTP ${status} desde ${url}.`,
      error: (message) => `La petición falló: ${message}`,
      bad: (status) => `HTTP ${status}: los rastreadores descartarán esta página.`,
      status: (status) => `Estado: ${status}`,
      contentType: (type) => `Content-Type: ${type}`,
      noResponse: 'sin respuesta',
      unknown: 'desconocido',
      fix: 'Asegúrate de que la URL responde 200 a una petición anónima. Las capas antibots (reglas WAF agresivas, modos "bajo ataque") suelen devolver 403 a los rastreadores de IA aunque en el navegador se vea bien.',
    },
    https: {
      title: 'Se sirve por HTTPS',
      ok: 'La página se sirve por HTTPS.',
      fail: 'La página se sirve por HTTP sin cifrar.',
      fix: 'Sirve el sitio por HTTPS y redirige HTTP con un 301. Algunos rastreadores ignoran directamente los orígenes inseguros.',
    },
    responseTime: {
      title: 'El servidor responde rápido',
      summary: (ms) => `La respuesta completa tardó ${ms} ms.`,
      evidence: (ms) => `${ms} ms desde la petición hasta el cuerpo completo`,
      fix: 'Los agentes en vivo trabajan con un límite de tiempo estricto mientras el usuario espera. Las páginas lentas se descartan aunque sean la mejor fuente. Cachea el HTML en el edge y aparta el trabajo pesado del camino crítico.',
    },
    redirects: {
      title: 'Hay pocas redirecciones hasta la página',
      none: 'Sin redirecciones.',
      summary: (hops) => `${hops} salto(s) de redirección hasta la URL final.`,
      hops: (count) => `${count} salto(s)`,
      requested: (url) => `Solicitada: ${url}`,
      final: (url) => `Final: ${url}`,
      fix: 'Reduce la cadena de redirecciones a un solo salto. Algunos rastreadores dejan de seguirlas tras dos, y cada salto añade latencia a una descarga con tiempo limitado.',
    },
    htmlWeight: {
      title: 'El tamaño del HTML es razonable',
      summary: (kb) => `${kb} KB de HTML.`,
      fix: 'Aligera el documento. Los sistemas de extracción recortan las páginas enormes y lo que se pierde es el final, a menudo tu conclusión.',
    },
    imageAlt: {
      title: 'Las imágenes tienen texto alternativo descriptivo',
      noImages: 'No hay imágenes en la página.',
      summary: (withAlt, total, percent) => `${withAlt} de ${total} imágenes tienen alt (${percent}%).`,
      images: (count) => `${count} imágenes`,
      withAlt: (count) => `${count} con alt no vacío`,
      fix: 'Describe lo que muestra cada imagen informativa. El alt es lo único de una imagen que llega a un rastreador de texto, y los gráficos o capturas suelen contener los datos que merece la pena citar.',
    },
  },
};
