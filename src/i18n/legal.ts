import type { Locale } from './config';

/**
 * Legal page templates (Terms, Privacy, Refunds).
 *
 * These are reasonable starting points for a small SaaS, NOT legal advice. The
 * owner's identity is injected from `config/site.ts`; missing values render as a
 * visible ‹placeholder› and the page shows a banner until they are filled in.
 * Full texts exist in English and Russian; Spanish and German visitors get the
 * English text with a note, rather than an unreviewed machine translation.
 */

export type LegalSlug = 'terms' | 'privacy' | 'refund';

export interface LegalContext {
  brand: string;
  entity: string;
  country: string;
  address: string;
  registration: string;
  email: string;
  refundDays: number;
  updated: string;
  siteUrl: string;
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
}

interface LegalPack {
  templateNotice: string;
  translationNotice: string | null;
  updated: (date: string) => string;
  titles: Record<LegalSlug, string>;
  build: Record<LegalSlug, (c: LegalContext) => LegalDocument>;
}

const en: LegalPack = {
  templateNotice:
    'This page is a template. The site owner has not yet filled in their legal details, so it is not a binding agreement yet.',
  translationNotice: null,
  updated: (date) => `Last updated: ${date}`,
  titles: { terms: 'Terms of Service', privacy: 'Privacy Policy', refund: 'Refund Policy' },
  build: {
    terms: (c) => ({
      title: 'Terms of Service',
      intro: `These Terms govern your use of ${c.brand} (${c.siteUrl}), operated by ${c.entity}${c.address ? `, ${c.address}` : ''}${c.registration ? ` (registration no. ${c.registration})` : ''}. By using the service you agree to them.`,
      sections: [
        {
          heading: '1. The service',
          paragraphs: [
            `${c.brand} analyses publicly accessible web pages and reports how well they can be read, indexed and cited by AI search assistants. Scores and recommendations are informed guidance based on publicly documented crawler behaviour. They are not a guarantee of any ranking, traffic or citation by any third-party system.`,
          ],
        },
        {
          heading: '2. Plans and license keys',
          paragraphs: [
            'Free use is limited as described on the pricing page. Paid plans are activated with a license key that is personal to the purchaser. You may not resell, publish or share the key outside your organisation. We may deactivate keys that are shared publicly or used abusively.',
          ],
        },
        {
          heading: '3. Payments and renewals',
          paragraphs: [
            'Payments are processed by our payment provider, which may act as the merchant of record and may collect applicable taxes. Subscriptions renew automatically at the end of each billing period until cancelled. You can cancel at any time; access continues until the end of the paid period. Lifetime purchases are a one-time payment for continued access to the Pro plan for as long as the service is operated.',
          ],
        },
        {
          heading: '4. Acceptable use',
          paragraphs: [
            'Only scan pages you are entitled to analyse. Do not use the service to overload third-party websites, to attempt to access non-public resources, or to circumvent usage limits. Automated use is permitted only through the documented API within its quotas.',
          ],
        },
        {
          heading: '5. Liability',
          paragraphs: [
            `The service is provided "as is". To the extent permitted by law, ${c.entity} is not liable for indirect or consequential losses, and total liability is limited to the amount you paid in the twelve months before the claim.`,
          ],
        },
        {
          heading: '6. Changes and termination',
          paragraphs: [
            'We may update these Terms; material changes will be announced on the site before they take effect. We may suspend accounts that breach these Terms.',
          ],
        },
        {
          heading: '7. Governing law and contact',
          paragraphs: [
            `These Terms are governed by the laws of ${c.country}. Questions: ${c.email}.`,
          ],
        },
      ],
    }),
    privacy: (c) => ({
      title: 'Privacy Policy',
      intro: `This policy explains what personal data ${c.entity} ("we") processes when you use ${c.brand}, and why.`,
      sections: [
        {
          heading: '1. What we collect',
          paragraphs: [
            'Scanned URLs and the resulting reports. A salted, one-way hash of your IP address, used only to enforce the free daily scan limit — we never store the raw IP. Your email address, if you submit it in a form or at checkout. Contact form messages. Licence and subscription status received from our payment provider.',
            'We do not receive or store your card details: payments are handled entirely by the payment provider.',
          ],
        },
        {
          heading: '2. Why we use it',
          paragraphs: [
            'To run scans and show reports; to prevent abuse of free limits; to deliver license keys and answer your messages; to send product updates you asked for (you can unsubscribe at any time).',
          ],
        },
        {
          heading: '3. Shared reports',
          paragraphs: [
            'Each stored report has an unguessable link. Anyone you give that link to can view the report. Reports contain only data that was already publicly accessible on the scanned page.',
          ],
        },
        {
          heading: '4. Service providers',
          paragraphs: [
            'Hosting (Vercel), database hosting, the payment provider (Lemon Squeezy or Stripe) and the email provider (Resend) process data on our behalf, only as needed to provide the service.',
          ],
        },
        {
          heading: '5. Cookies and storage',
          paragraphs: [
            'We use no advertising or tracking cookies. We store your language and theme preference, and your license key if you enter one, in your browser. The admin area uses a strictly necessary session cookie.',
          ],
        },
        {
          heading: '6. Retention and your rights',
          paragraphs: [
            `We keep scan reports for up to 12 months and account-related records for as long as legally required. You can ask us to access, correct or delete your data by writing to ${c.email}.`,
          ],
        },
      ],
    }),
    refund: (c) => ({
      title: 'Refund Policy',
      intro: `We want you to be happy with ${c.brand}. If it does not work for you, here is how refunds work.`,
      sections: [
        {
          heading: '1. First payment',
          paragraphs: [
            `You can request a full refund within ${c.refundDays} days of your first payment for any plan, including Lifetime. No explanation is required.`,
          ],
        },
        {
          heading: '2. Renewals',
          paragraphs: [
            'Cancel before the renewal date to avoid being charged for the next period. Renewal charges are generally not refunded, but write to us if something went wrong and we will look at it.',
          ],
        },
        {
          heading: '3. How to request',
          paragraphs: [
            `Email ${c.email} from the address used at checkout, or reply to your receipt. Refunds are returned to the original payment method and the license key is deactivated.`,
          ],
        },
      ],
    }),
  },
};

const ru: LegalPack = {
  templateNotice:
    'Эта страница — шаблон. Владелец сайта ещё не заполнил свои юридические данные, поэтому документ пока не является действующим соглашением.',
  translationNotice: null,
  updated: (date) => `Последнее обновление: ${date}`,
  titles: { terms: 'Условия использования', privacy: 'Политика конфиденциальности', refund: 'Политика возвратов' },
  build: {
    terms: (c) => ({
      title: 'Условия использования',
      intro: `Настоящие Условия регулируют использование сервиса ${c.brand} (${c.siteUrl}), которым управляет ${c.entity}${c.address ? `, ${c.address}` : ''}${c.registration ? ` (рег. номер ${c.registration})` : ''}. Пользуясь сервисом, вы соглашаетесь с ними.`,
      sections: [
        {
          heading: '1. Сервис',
          paragraphs: [
            `${c.brand} анализирует общедоступные веб-страницы и показывает, насколько хорошо их могут прочитать, проиндексировать и процитировать AI-ассистенты. Оценки и рекомендации основаны на публично описанном поведении краулеров и носят рекомендательный характер. Они не гарантируют позиции, трафик или цитирование в сторонних системах.`,
          ],
        },
        {
          heading: '2. Тарифы и лицензионные ключи',
          paragraphs: [
            'Бесплатное использование ограничено, как указано на странице цен. Платные тарифы активируются лицензионным ключом, выданным покупателю. Запрещено перепродавать, публиковать или передавать ключ за пределы своей организации. Мы можем деактивировать ключи, опубликованные в открытом доступе или используемые недобросовестно.',
          ],
        },
        {
          heading: '3. Оплата и продление',
          paragraphs: [
            'Платежи обрабатывает наш платёжный провайдер, который может выступать продавцом (merchant of record) и взимать применимые налоги. Подписка продлевается автоматически в конце каждого периода, пока вы её не отмените. Отменить можно в любой момент; доступ сохраняется до конца оплаченного периода. Покупка Lifetime — разовый платёж за доступ к тарифу Pro на всё время работы сервиса.',
          ],
        },
        {
          heading: '4. Допустимое использование',
          paragraphs: [
            'Проверяйте только страницы, которые вы вправе анализировать. Не используйте сервис для перегрузки сторонних сайтов, попыток доступа к закрытым ресурсам или обхода лимитов. Автоматизированное использование допускается только через документированный API в пределах квот.',
          ],
        },
        {
          heading: '5. Ответственность',
          paragraphs: [
            `Сервис предоставляется «как есть». В пределах, допустимых законом, ${c.entity} не несёт ответственности за косвенные убытки, а совокупная ответственность ограничена суммой, уплаченной вами за 12 месяцев до претензии.`,
          ],
        },
        {
          heading: '6. Изменения и прекращение',
          paragraphs: [
            'Мы можем обновлять Условия; о существенных изменениях сообщим на сайте до вступления их в силу. Мы можем приостановить доступ при нарушении Условий.',
          ],
        },
        {
          heading: '7. Применимое право и контакты',
          paragraphs: [`Условия регулируются законодательством: ${c.country}. Вопросы: ${c.email}.`],
        },
      ],
    }),
    privacy: (c) => ({
      title: 'Политика конфиденциальности',
      intro: `Здесь описано, какие персональные данные обрабатывает ${c.entity} («мы») при использовании ${c.brand} и зачем.`,
      sections: [
        {
          heading: '1. Что мы собираем',
          paragraphs: [
            'Проверенные адреса и результаты проверок. Необратимый хэш вашего IP-адреса с «солью» — только для соблюдения дневного лимита бесплатных проверок; сам IP мы не храним. Вашу почту, если вы указали её в форме или при оплате. Сообщения из формы обратной связи. Статус лицензии и подписки, полученный от платёжного провайдера.',
            'Данные банковских карт мы не получаем и не храним: оплату полностью обрабатывает платёжный провайдер.',
          ],
        },
        {
          heading: '2. Зачем',
          paragraphs: [
            'Чтобы выполнять проверки и показывать отчёты; предотвращать злоупотребление бесплатными лимитами; выдавать лицензионные ключи и отвечать на сообщения; присылать новости продукта, на которые вы подписались (отписаться можно в любой момент).',
          ],
        },
        {
          heading: '3. Отчёты по ссылке',
          paragraphs: [
            'У каждого сохранённого отчёта есть ссылка, которую невозможно угадать. Любой, кому вы её передадите, сможет открыть отчёт. В отчёте только данные, которые и так были публично доступны на проверенной странице.',
          ],
        },
        {
          heading: '4. Поставщики услуг',
          paragraphs: [
            'Хостинг (Vercel), хостинг базы данных, платёжный провайдер (Lemon Squeezy или Stripe) и почтовый сервис (Resend) обрабатывают данные по нашему поручению и только в объёме, необходимом для работы сервиса.',
          ],
        },
        {
          heading: '5. Cookie и хранилище браузера',
          paragraphs: [
            'Мы не используем рекламные и отслеживающие cookie. В вашем браузере хранятся выбранный язык, тема и — если вы его ввели — лицензионный ключ. В админ-панели используется строго необходимая сессионная cookie.',
          ],
        },
        {
          heading: '6. Сроки хранения и ваши права',
          paragraphs: [
            `Отчёты хранятся до 12 месяцев, записи об оплатах — столько, сколько требует закон. Чтобы получить, исправить или удалить свои данные, напишите на ${c.email}.`,
          ],
        },
      ],
    }),
    refund: (c) => ({
      title: 'Политика возвратов',
      intro: `Мы хотим, чтобы ${c.brand} вам подошёл. Если нет — вот как устроен возврат.`,
      sections: [
        {
          heading: '1. Первый платёж',
          paragraphs: [
            `Вы можете запросить полный возврат в течение ${c.refundDays} дней после первого платежа по любому тарифу, включая Lifetime. Объяснять причину не нужно.`,
          ],
        },
        {
          heading: '2. Продления',
          paragraphs: [
            'Отмените подписку до даты продления, чтобы не было списания за следующий период. Платежи за продление обычно не возвращаются, но если что-то пошло не так — напишите нам, разберёмся.',
          ],
        },
        {
          heading: '3. Как запросить',
          paragraphs: [
            `Напишите на ${c.email} с почты, указанной при оплате, или ответьте на письмо с чеком. Деньги вернутся на исходный способ оплаты, а лицензионный ключ будет деактивирован.`,
          ],
        },
      ],
    }),
  },
};

const PACKS: Record<Locale, LegalPack> = {
  en,
  ru,
  es: { ...en, translationNotice: 'Este documento legal está disponible en inglés.' },
  de: { ...en, translationNotice: 'Dieses Rechtsdokument ist auf Englisch verfügbar.' },
};

export function getLegalPack(locale: Locale): LegalPack {
  return PACKS[locale];
}

export const LEGAL_SLUGS: readonly LegalSlug[] = ['terms', 'privacy', 'refund'];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}
