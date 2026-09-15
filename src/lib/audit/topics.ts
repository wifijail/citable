import type { CheerioAPI } from 'cheerio';
import type { TopicTerm } from './types';

/**
 * Function words in the five supported languages. A plain frequency count is a
 * crude but transparent stand-in for "what is this page about": it shows which
 * words a text-only reader meets most, weighted towards title and headings.
 */
const STOPWORDS = new Set(
  `
a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours get new use using one two via per
и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это наш ваш ваши наши свой свои также которые который которая которое
және мен бен пен да де та те бұл осы сол ол олар біз сіз сен мен үшін туралы бойынша арқылы дейін кейін бар жоқ емес еді болып болады бола керек ғана тек әр барлық қандай қалай неге кім не қай бір екі
el la los las un una unos unas y o de del al a en por para con sin sobre entre que es son fue ser se su sus lo le les como más pero muy ya también este esta estos estas ese esa nuestro nuestra
der die das den dem des ein eine einer eines und oder aber in im an am auf aus bei mit nach von vor zu zum zur für über unter ist sind war sein wird werden hat haben nicht auch nur noch wie als so sich sie er es wir ihr ihre dass mehr sehr
`
    .split(/\s+/)
    .filter(Boolean),
);

const WORD_RE = /[\p{L}][\p{L}\p{N}'’-]{2,}/gu;

function tokens(text: string): string[] {
  return (text.toLowerCase().match(WORD_RE) ?? [])
    .map((word) => word.replace(/['’-]+$/g, ''))
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

/** Top terms, weighting the title ×4, H1 ×3, H2/H3 ×2 and body text ×1. */
export function extractTopics($: CheerioAPI, bodyText: string, limit = 8): TopicTerm[] {
  const counts = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const word of tokens(text)) counts.set(word, (counts.get(word) ?? 0) + weight);
  };

  // Join element texts with spaces; `.text()` on a collection glues words together.
  const joined = (selector: string) => $(selector).map((_, element) => $(element).text()).get().join(' ');
  add($('head title').first().text(), 4);
  add(joined('h1'), 3);
  add(joined('h2, h3'), 2);
  add(bodyText.slice(0, 50_000), 1);

  return [...counts.entries()]
    .filter(([, weight]) => weight >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, weight]) => ({ term, weight }));
}

/** Words shared by two short texts (title vs H1, etc.). */
export function sharedTerms(a: string, b: string): string[] {
  const left = new Set(tokens(a));
  return [...new Set(tokens(b))].filter((word) => left.has(word));
}

export { tokens as topicTokens };
