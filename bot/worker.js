// Пінолист — Telegram-бот на Cloudflare Workers (безкоштовно, без власного сервера).
// Токен бота НЕ вписується в код: він зберігається в Cloudflare як секрет BOT_TOKEN.
// Файл згенеровано скриптом tools/build.py з content/*.json.

const SHOP = "https://elizavetboiko.github.io/pinolyst-lab11/";

const PRODUCTS = [["hyaluron-serum", "Сироватка з гіалуроновою кислотою", 389], ["day-cream-spf", "Денний крем SPF 30", 429], ["micellar-water", "Міцелярна вода для чутливої шкіри", 189], ["shower-gel-lavender", "Гель для душу «Лавандове поле»", 159], ["hand-cream", "Крем для рук «Півонія»", 89], ["mascara", "Туш для вій «Об'єм і довжина»", 249], ["eau-de-toilette", "Туалетна вода «Квітковий ранок»", 649], ["laundry-gel", "Гель для прання кольорових речей", 349]];

const uah = (n) => n.toLocaleString("uk-UA").replace(/\u00a0/g, " ") + " грн";

const MAIN_KEYBOARD = {
  inline_keyboard: [
    [{ text: "🛍 Відкрити магазин", web_app: { url: SHOP } }],
    [{ text: "📦 Каталог", callback_data: "catalog" }, { text: "🚚 Доставка й оплата", callback_data: "rules" }],
    [{ text: "📞 Контакти", callback_data: "contacts" }],
  ],
};

const TEXTS = {
  start: "Вітаємо у <b>«Пінолист»</b>! Натисніть <b>«🛍 Відкрити магазин»</b>, щоб перейти до товарів і навчального кошика.\n\n/catalog — добірка товарів\n/rules — доставка й оплата\n/contacts — адреса та години видачі",
  catalog: () =>
    "📦 <b>Хіти каталогу</b>\n\n" +
    PRODUCTS.map(([id, name, price]) => `• <a href="${SHOP}product/${id}.html">${name}</a> — ${uah(price)}`).join("\n") +
    "\n\nУ магазині ще більше товарів для обличчя, тіла, волосся й дому.",
  rules: `🚚 <b>Доставка</b>
• Нова Пошта — 1–3 дні
• Укрпошта — 2–7 днів
• Самовивіз: м. Київ, вул. Саксаганського, 41 (ст. м. «Університет»), пн–сб 10:00–20:00
• Від 1000 грн у відділення Нової Пошти — безкоштовно

💳 <b>Оплата</b>
Онлайн карткою Visa / Mastercard, Apple Pay чи Google Pay через WayForPay або під час отримання.

Повні правила: ${SHOP}rules/`,
  contacts: `📞 <b>Контакти магазину «Пінолист»</b>
E-mail: hello@pinolyst.example
Телефон: +380 44 765 43 21
Самовивіз: м. Київ, вул. Саксаганського, 41
Графік: пн–сб 10:00–20:00, нд 11:00–18:00
Сайт: ${SHOP}`,
  unknown: "Оберіть кнопку під повідомленням або введіть /start, щоб повернутися до меню.",
};

async function tg(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function reply(env, chatId, key) {
  const t = TEXTS[key];
  return tg(env, "sendMessage", {
    chat_id: chatId,
    text: typeof t === "function" ? t() : t,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: MAIN_KEYBOARD,
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Пінолист bot працює ✅");
    const update = await request.json().catch(() => null);
    if (!update) return new Response("ok");

    if (update.callback_query) {
      const q = update.callback_query;
      await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
      if (TEXTS[q.data]) await reply(env, q.message.chat.id, q.data);
      return new Response("ok");
    }

    const msg = update.message;
    if (msg && msg.text) {
      const cmd = msg.text.trim().split(/[\s@]/)[0].toLowerCase();
      const map = { "/start": "start", "/catalog": "catalog", "/rules": "rules", "/contacts": "contacts" };
      await reply(env, msg.chat.id, map[cmd] || "unknown");
    }
    return new Response("ok");
  },
};
