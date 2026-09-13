import type { Locale } from './config';

interface EmailMessages {
  license: {
    subject: string;
    heading: string;
    intro: (plan: string) => string;
    howTo: string;
    cta: string;
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
  },
  ru: {
    license: {
      subject: 'Ваш лицензионный ключ Citable',
      heading: 'Спасибо за покупку',
      intro: (plan) => `Тариф ${plan} активирован. Ваш лицензионный ключ:`,
      howTo: 'Вставьте его в поле «Есть лицензионный ключ?» под сканером. Не передавайте ключ другим — он даёт доступ к вашему тарифу.',
      cta: 'Открыть Citable',
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
  },
  de: {
    license: {
      subject: 'Ihr Citable-Lizenzschlüssel',
      heading: 'Vielen Dank für Ihren Kauf',
      intro: (plan) => `Ihr ${plan}-Tarif ist aktiv. Hier ist Ihr Lizenzschlüssel:`,
      howTo: 'Fügen Sie ihn unter „Lizenzschlüssel vorhanden?“ unterhalb des Scanners ein. Geben Sie ihn nicht weiter – wer ihn hat, nutzt Ihren Tarif.',
      cta: 'Citable öffnen',
    },
  },
};

export function getEmailMessages(locale: Locale): EmailMessages {
  return MESSAGES[locale];
}
