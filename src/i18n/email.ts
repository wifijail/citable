import type { Locale } from './config';

interface EmailMessages {
  license: {
    subject: string;
    heading: string;
    intro: (plan: string) => string;
    howTo: string;
    cta: string;
  };
  rejected: {
    subject: string;
    heading: string;
    body: string;
  };
}

const MESSAGES: Record<Locale, EmailMessages> = {
  en: {
    license: {
      subject: 'Your Citable license key',
      heading: 'Thank you for your purchase',
      intro: (plan) => `Your ${plan} plan is active. Here is your license key:`,
      howTo: 'Paste it into "Have a license key?" under the scanner. Keep it private — anyone with the key gets your plan.',
      cta: 'Open Citable',
    },
    rejected: {
      subject: 'We could not confirm your Citable payment',
      heading: 'Payment not found',
      body: 'We could not find a payment matching your request. If you did pay, reply to this email with a screenshot or receipt and we will sort it out.',
    },
  },
  ru: {
    license: {
      subject: 'Ваш лицензионный ключ Citable',
      heading: 'Спасибо за покупку',
      intro: (plan) => `Тариф ${plan} активирован. Ваш лицензионный ключ:`,
      howTo: 'Вставьте его в поле «Есть лицензионный ключ?» под сканером. Не передавайте ключ другим — он даёт доступ к вашему тарифу.',
      cta: 'Открыть Citable',
    },
    rejected: {
      subject: 'Не удалось подтвердить оплату Citable',
      heading: 'Оплата не найдена',
      body: 'Мы не нашли платёж, соответствующий вашей заявке. Если вы оплатили, ответьте на это письмо и приложите чек или скриншот — разберёмся.',
    },
  },
  kk: {
    license: {
      subject: 'Citable лицензиялық кілтіңіз',
      heading: 'Сатып алғаныңызға рахмет',
      intro: (plan) => `${plan} тарифі іске қосылды. Лицензиялық кілтіңіз:`,
      howTo: 'Кілтті сканер астындағы «Лицензиялық кілтіңіз бар ма?» өрісіне қойыңыз. Кілтті ешкімге бермеңіз — ол тарифіңізге қолжетімділік береді.',
      cta: 'Citable ашу',
    },
    rejected: {
      subject: 'Citable төлемін растау мүмкін болмады',
      heading: 'Төлем табылмады',
      body: 'Өтінішіңізге сәйкес төлем табылмады. Егер төлеген болсаңыз, осы хатқа түбіртек немесе скриншот тіркеп жауап беріңіз — анықтаймыз.',
    },
  },
  es: {
    license: {
      subject: 'Tu clave de licencia de Citable',
      heading: 'Gracias por tu compra',
      intro: (plan) => `Tu plan ${plan} está activo. Esta es tu clave de licencia:`,
      howTo: 'Pégala en "¿Tienes una clave de licencia?" debajo del analizador. Mantenla en privado: quien la tenga obtiene tu plan.',
      cta: 'Abrir Citable',
    },
    rejected: {
      subject: 'No pudimos confirmar tu pago de Citable',
      heading: 'Pago no encontrado',
      body: 'No encontramos un pago que coincida con tu solicitud. Si pagaste, responde a este correo con el recibo o una captura y lo resolveremos.',
    },
  },
  de: {
    license: {
      subject: 'Ihr Citable-Lizenzschlüssel',
      heading: 'Vielen Dank für Ihren Kauf',
      intro: (plan) => `Ihr ${plan}-Tarif ist aktiv. Hier ist Ihr Lizenzschlüssel:`,
      howTo: 'Fügen Sie ihn unter „Lizenzschlüssel vorhanden?“ unterhalb des Scanners ein. Geben Sie ihn nicht weiter – wer ihn hat, nutzt Ihren Tarif.',
      cta: 'Citable öffnen',
    },
    rejected: {
      subject: 'Wir konnten Ihre Citable-Zahlung nicht bestätigen',
      heading: 'Zahlung nicht gefunden',
      body: 'Wir haben keine Zahlung zu Ihrer Anfrage gefunden. Falls Sie bezahlt haben, antworten Sie bitte mit Beleg oder Screenshot auf diese E-Mail.',
    },
  },
};

export function getEmailMessages(locale: Locale): EmailMessages {
  return MESSAGES[locale];
}
