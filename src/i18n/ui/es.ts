import type { Dictionary } from './en';

export const es: Dictionary = {
  meta: {
    title: 'Citable — ¿puede la búsqueda con IA citar tu web?',
    description:
      'Analiza cualquier URL y descubre si ChatGPT, Claude, Perplexity y Google AI Overviews pueden leerla, indexarla y citarla, con las correcciones exactas para lo que falla.',
  },

  common: {
    copy: 'Copiar',
    copied: 'Copiado',
    close: 'Cerrar',
    loading: 'Cargando…',
    backHome: 'Volver al inicio',
  },

  nav: {
    product: 'Producto',
    pricing: 'Precios',
    docs: 'API',
    contact: 'Contacto',
    scanCta: 'Analizar gratis',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    home: 'Inicio de Citable',
  },

  theme: { label: 'Tema', light: 'Claro', dark: 'Oscuro', system: 'Sistema' },
  language: { label: 'Idioma' },

  hero: {
    badge: '16 agentes de IA · 31 comprobaciones · ~5 segundos',
    titleLead: '¿Puede la IA',
    titleAccent: 'citar',
    titleTail: 'tu web?',
    subtitle:
      'Tus clientes preguntan a ChatGPT, Claude y Perplexity antes de abrir Google. Citable muestra si esos asistentes pueden leer, indexar y citar tus páginas, y te da las líneas exactas que cambiar cuando no pueden.',
    trust: 'Sin registro. Análisis gratis. Resultados en segundos.',
    globeLabel: 'Agentes de IA orbitando tu web',
  },

  scanner: {
    placeholder: 'tudominio.com/tu-mejor-pagina',
    submit: 'Analizar gratis',
    scanning: 'Analizando…',
    examples: 'Prueba:',
    haveKey: '¿Tienes una clave de licencia?',
    hideKey: 'Ocultar clave',
    keyPlaceholder: 'CITE-PRO-XXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
    keyHint: 'Se guarda solo en este navegador y se envía con cada análisis.',
    keyChecking: 'Comprobando la clave…',
    keyValid: (plan) => `Clave activa: plan ${plan} desbloqueado.`,
    keyInvalid: 'La clave no es válida. Revisa si hay errores.',
    keyInactive: 'La clave ya no está activa. Renueva tu plan para volver a ver todas las correcciones.',
    stages: [
      'Descargando la página como un rastreador de IA…',
      'Comprobando robots.txt con 16 agentes de IA…',
      'Buscando llms.txt y el sitemap…',
      'Leyendo datos estructurados y encabezados…',
      'Calculando la puntuación…',
    ],
    errors: {
      quota: (limit) =>
        `El plan gratuito incluye ${limit} análisis al día. Mejora tu plan para análisis ilimitados o vuelve mañana.`,
      network: 'No se pudo contactar con el analizador. Revisa tu conexión e inténtalo de nuevo.',
      generic: 'El análisis falló. Inténtalo de nuevo en un momento.',
    },
  },

  report: {
    scoreLabel: 'Puntuación de visibilidad IA',
    grade: 'nota',
    crawlersTitle: 'Quién puede leer esta página',
    crawlersAllOk: 'Todos los motores de respuesta pueden acceder a esta URL.',
    crawlersBlocked: (count) =>
      count === 1 ? '1 motor de respuesta está bloqueado por robots.txt.' : `${count} motores de respuesta están bloqueados por robots.txt.`,
    rule: 'Regla',
    noRule: 'Sin regla aplicable: permitido por defecto',
    fixFirst: 'Corrige esto primero',
    fixFirstHint: 'Ordenado por cuántas citas te cuesta cada problema.',
    howToFix: 'Cómo corregirlo',
    locked: 'La corrección paso a paso y la evidencia están incluidas en Pro.',
    critical: 'Crítico',
    status: { pass: 'Correcto', warn: 'Mejorable', fail: 'Falla', info: 'Aviso' },
    paywallTitle: (count) => `${count} correcciones más te esperan`,
    paywallBody:
      'Estás viendo las tres correcciones de mayor impacto. Pro desbloquea todas las demás con fragmentos listos para copiar, la evidencia completa, análisis ilimitados y acceso a la API.',
    paywallCta: 'Desbloquear todo — $7/mes',
    paywallCompare: 'Comparar planes',
    emailPrompt: '¿Aún no? Recibe este informe por email:',
    breakdown: 'Desglose completo',
    failing: (count) => `${count} con fallos`,
    meta: (date, ms) => `Analizado ${date} en ${(ms / 1000).toFixed(1)} s`,
    share: 'Copiar enlace',
    shareCopied: 'Enlace copiado',
    exportJson: 'Descargar JSON',
    warnings: 'Notas',
    points: 'pts',
  },

  lead: {
    placeholder: 'tu@empresa.com',
    submit: 'Enviar',
    sending: 'Enviando…',
    done: 'Listo, ya estás en la lista.',
    noSpam: 'Sin spam. Baja con un clic.',
    error: 'No se pudo guardar tu email. Inténtalo de nuevo.',
  },

  marquee: { label: 'Comprobado con los agentes que deciden a quién se cita' },

  stats: {
    checks: 'comprobaciones por análisis',
    agents: 'agentes de IA',
    categories: 'categorías ponderadas',
    seconds: 'segundos por análisis',
  },

  problem: {
    eyebrow: 'Por qué ahora',
    title: 'La búsqueda se mudó a la respuesta. La mayoría de webs, no.',
    items: [
      {
        title: 'El tráfico se fue sin avisar',
        body: 'Las respuestas sin clic absorben las preguntas por las que antes posicionabas. Tu analítica no dice que no estabas en la respuesta.',
      },
      {
        title: 'Invisibles por accidente',
        body: 'Una regla comodín en robots.txt o una página que solo se renderiza en el navegador te borran de todos los motores de respuesta a la vez.',
      },
      {
        title: 'Ser citado es el nuevo posicionamiento',
        body: 'Como fuente citada, tu marca llega al comprador en el momento de decidir, con el asistente respaldándote.',
      },
    ],
  },

  steps: {
    eyebrow: 'Cómo funciona',
    title: 'De una URL a una lista de correcciones en tres pasos',
    items: [
      { title: 'Pega una URL', body: 'Cualquier página pública: inicio, precios, documentación o tu mejor artículo.' },
      {
        title: 'La leemos como una IA',
        body: 'Descargamos la página, robots.txt, llms.txt y el sitemap sin JavaScript y los comprobamos con 16 agentes reales.',
      },
      {
        title: 'Aplica las correcciones',
        body: 'Cada problema llega con evidencia y una corrección lista para copiar, ordenado por impacto.',
      },
    ],
  },

  categories: {
    eyebrow: 'Qué medimos',
    title: 'Seis categorías. Una puntuación honesta.',
    subtitle: 'Cada categoría pesa según cuánto cambia realmente la probabilidad de ser citado.',
  },

  agents: {
    title: 'Todos los agentes que comprobamos',
    body: 'Los agentes en vivo se evalúan con mucho más rigor que los de entrenamiento: bloquear los primeros te cuesta citas hoy; bloquear los segundos es una decisión de licencia.',
  },

  pricing: {
    eyebrow: 'Precios',
    title: 'Precios simples. Cancela cuando quieras.',
    subtitle: 'Empieza gratis. Mejora cuando quieras todas las correcciones, análisis ilimitados y la API.',
    popular: 'Más popular',
    launch: 'Precio de lanzamiento',
    billing: { forever: 'para siempre', monthly: '/mes', once: 'pago único' },
    plans: {
      free: {
        name: 'Free',
        tagline: 'Descubre dónde estás.',
        cta: 'Analizar gratis',
        features: [
          '5 análisis al día',
          'Puntuación completa y desglose por categorías',
          'Los 16 agentes de IA comprobados',
          'Las 3 correcciones principales con instrucciones',
        ],
      },
      pro: {
        name: 'Pro',
        tagline: 'Para quien es responsable del tráfico.',
        cta: 'Obtener Pro',
        features: [
          'Análisis ilimitados',
          'Todas las correcciones, con fragmentos',
          'Evidencia completa de cada comprobación',
          'Enlaces completos y exportación JSON',
          'Acceso a la API para CI',
        ],
      },
      agency: {
        name: 'Agency',
        tagline: 'Audita webs de clientes a escala.',
        cta: 'Obtener Agency',
        features: [
          'Todo lo de Pro',
          '2.000 análisis por API al día (4× Pro)',
          'Informes completos para compartir con clientes',
          'Soporte prioritario por email',
        ],
      },
      lifetime: {
        name: 'Lifetime',
        tagline: 'Paga una vez y quédate con Pro.',
        cta: 'Comprar de por vida',
        features: ['Todo lo de Pro, para siempre', 'Un solo pago, sin suscripción', 'Precio para primeros clientes'],
      },
    },
    redirecting: 'Abriendo el pago…',
    unavailableTitle: 'Estamos configurando los pagos',
    unavailableBody:
      'El pago online aún no está activo. Déjanos tu email y te avisaremos en cuanto abra, o escríbenos y gestionamos el acceso directamente.',
    contactCta: 'Contactar',
    error: 'No se pudo abrir el pago. Inténtalo de nuevo.',
    secure: 'Pago seguro. Impuestos calculados al pagar.',
    cancelled: 'Pago cancelado: no se ha cobrado nada.',
  },

  faq: {
    eyebrow: 'FAQ',
    title: 'Preguntas frecuentes',
    items: [
      {
        q: '¿Qué mide exactamente Citable?',
        a: 'Si un asistente de IA puede llegar a tu página, leerla sin ejecutar JavaScript, entender de qué trata y extraer una respuesta fiable. Es una pregunta distinta a “¿posiciono en Google?” y falla por motivos distintos.',
      },
      {
        q: '¿Por qué no basta mi herramienta SEO?',
        a: 'Las herramientas SEO clásicas auditan el índice de Google. No te dirán que ChatGPT-User está bloqueado por una regla comodín, que te falta llms.txt o que tu página de precios es un div vacío para los rastreadores que importan.',
      },
      {
        q: '¿Bloquear GPTBot me perjudica?',
        a: 'Bloquear rastreadores de entrenamiento es una decisión de licencia defendible y lo puntuamos con suavidad. Bloquear agentes en vivo como ChatGPT-User o Perplexity-User es distinto: solo descargan tu página porque un usuario acaba de preguntar algo que responde.',
      },
      {
        q: '¿Rastreáis toda mi web?',
        a: 'No. Un análisis hace cuatro peticiones GET: la página, robots.txt, llms.txt y el sitemap. Se identifica como CitableBot.',
      },
      {
        q: '¿Cómo recibo mi clave tras pagar?',
        a: 'La verás en pantalla nada más pagar y también te llegará por email. Pégala bajo el analizador y se desbloquean todas las correcciones.',
      },
      {
        q: '¿Puedo cancelar?',
        a: 'Sí, cuando quieras. Tu plan sigue activo hasta el final del periodo ya pagado.',
      },
    ],
  },

  cta: {
    title: 'Descúbrelo en cinco segundos.',
    subtitle: 'El primer análisis es gratis, igual que saber si la IA puede verte.',
    button: 'Analizar mi web',
  },

  footer: {
    tagline: 'Auditorías de visibilidad en búsqueda con IA para equipos que quieren ser citados.',
    product: 'Producto',
    company: 'Empresa',
    legal: 'Legal',
    rights: (year, name) => `© ${year} ${name}. Todos los derechos reservados.`,
    links: {
      scanner: 'Analizador',
      pricing: 'Precios',
      docs: 'Documentación API',
      contact: 'Contacto',
      terms: 'Términos',
      privacy: 'Privacidad',
      refund: 'Reembolsos',
    },
  },

  contact: {
    eyebrow: 'Contacto',
    title: 'Habla con una persona',
    subtitle: 'Preguntas sobre planes, facturas, colaboraciones o un resultado: leemos todos los mensajes.',
    form: {
      name: 'Nombre',
      email: 'Email',
      topic: 'Asunto',
      topics: {
        sales: 'Planes y precios',
        support: 'Ayuda con un análisis',
        billing: 'Pagos y facturas',
        partnership: 'Colaboración',
        other: 'Otra cosa',
      },
      message: 'Mensaje',
      messagePlaceholder: 'Cuéntanos qué necesitas…',
      submit: 'Enviar mensaje',
      sending: 'Enviando…',
      success: 'Mensaje enviado. Te responderemos por email.',
      error: 'No se pudo enviar el mensaje. Inténtalo de nuevo.',
      rateLimited: 'Demasiados mensajes. Inténtalo más tarde.',
      tooShort: 'Escribe al menos 10 caracteres.',
    },
    direct: 'Otras formas de contactarnos',
    emailLabel: 'Email',
    telegramLabel: 'Telegram',
    socialLabel: 'Redes',
    responseTime: (time) => `Tiempo habitual de respuesta: ${time}`,
    noDirect: 'El formulario es la forma más rápida de contactarnos.',
  },

  docs: {
    eyebrow: 'Desarrolladores',
    title: 'API de Citable',
    subtitle: 'El mismo análisis de la web en una sola llamada HTTP. Incluida en Pro, Agency y Lifetime.',
    endpoint: 'Endpoint',
    auth: 'Autentícate con tu clave de licencia como token Bearer.',
    request: 'Petición',
    params: 'Parámetros',
    field: 'Campo',
    type: 'Tipo',
    description: 'Descripción',
    paramUrl: 'Obligatorio. La página pública que auditar.',
    paramMinScore: 'Umbral opcional 0–100. Responde HTTP 422 si la puntuación es menor, para que una regresión rompa tu pipeline.',
    paramLang: 'Idioma opcional de los resultados: en, ru, es o de. Por defecto: en.',
    response: 'Respuesta',
    codes: 'Códigos de estado',
    code200: 'análisis completado',
    code400: 'URL o cuerpo no válidos',
    code401: 'clave ausente, no válida o inactiva',
    code422: 'análisis completado, puntuación por debajo de minScore',
    code429: 'cuota diaria agotada',
    ciTitle: 'Úsala como control antes de desplegar',
    scoringTitle: 'Modelo de puntuación',
    scoringBody: 'La puntuación final es la media ponderada de seis categorías.',
  },

  checkout: {
    pendingTitle: 'Confirmando tu pago…',
    pendingBody: 'Suele tardar unos segundos. Mantén esta página abierta.',
    readyTitle: 'Todo listo',
    readyBody: 'Tu plan está activo. Esta es tu clave de licencia; ya está guardada en este navegador.',
    keyLabel: 'Clave de licencia',
    useNow: 'Empezar a analizar',
    emailed: 'Te hemos enviado una copia por email.',
    keepSafe: 'Mantenla en privado: quien tenga la clave puede usar tu plan.',
    slowTitle: 'Seguimos esperando al proveedor de pagos',
    slowBody: 'Puede que el pago siga procesándose. Tu clave llegará por email; si no llega en 15 minutos, escríbenos y lo resolvemos.',
    inactiveTitle: 'Esta compra ya no está activa',
    inactiveBody: 'El pago se reembolsó o la suscripción terminó.',
    unknownTitle: 'No encontramos este pago',
    unknownBody: 'Puede que el enlace esté incompleto. Si se te cobró, escríbenos con tu recibo.',
    contactSupport: 'Contactar con soporte',
  },

  shared: {
    title: (host) => `Informe de visibilidad IA de ${host}`,
    notFound: 'Este informe no existe o se ha eliminado.',
    cta: 'Analiza tu propia web',
    scannedOn: (date) => `Analizado el ${date}`,
  },

  notFound: {
    title: 'Página no encontrada',
    body: 'La página que buscas no existe o se ha movido.',
  },
};
