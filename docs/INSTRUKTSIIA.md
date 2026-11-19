# Інструкція до Лаби 11 — публікація магазину й запуск бота

## 1. Магазин на GitHub Pages
1. Опублікуйте папку `lileia-lab11` як **публічний** репозиторій (GitHub Desktop → Add existing repository → create a repository → Publish, без галочки «Keep this code private»).
2. Settings → Pages → Deploy from a branch → `main` / `(root)` → Save. Через 1–3 хв магазин буде на `https://ВАШ-ЛОГІН.github.io/lileia-lab11/`.
3. Перевірка: додайте товар у кошик → «Оплатити через WayForPay» → має відкритися сторінка оплати WayForPay з сумою. Тестова картка `4111 1111 1111 1111`.

## 2. Створення бота в @BotFather
1. `/newbot` → Name: **Лілея Shop**, username: **LileiaShopBot** (якщо зайнятий — інший, що закінчується на `bot`). Збережіть **токен** і нікому його не показуйте (на скріншотах замазуйте).
2. `/setuserpic` → `assets/logo_640.png`.
3. `/setabouttext` → `Косметика, догляд і товари для дому. Оплата онлайн, доставка по Україні.`
4. `/setdescription` → `💜 Лілея: косметика, засоби догляду та товари для дому. Відкрийте «Магазин», додайте товари в кошик і оплатіть онлайн. Доставка Новою Поштою, Укрпоштою або самовивіз у Києві. Правила: https://ВАШ-ЛОГІН.github.io/lileia-lab11/rules/`
5. `/setcommands` →
   ```
   start - Відкрити магазин Лілея
   catalog - Хіти каталогу
   rules - Доставка та оплата
   contacts - Контакти
   ```
6. `/setmenubutton` → адреса магазину → назва `Магазин`.

## 3. Код бота на Cloudflare Workers (безкоштовно)
1. У `content/site.json` впишіть `links.lab11_public_url` (адреса магазину) і `links.bot_username`, запустіть `python tools/build.py lab11` — оновиться `bot/worker.js`. (Або замініть `ВАШ-ЛОГІН` прямо в `bot/worker.js`.)
2. https://dash.cloudflare.com → Compute → Workers & Pages → Create → Start with Hello World → назва `lileia-bot` → Deploy.
3. **Edit code** → замініть увесь код вмістом `bot/worker.js` → Deploy.
4. Settings → Variables and Secrets → Add: Type **Secret**, Key `BOT_TOKEN`, Value — токен → Deploy.
5. Відкрийте в браузері (замінивши ТОКЕН і адресу Worker'а):
   `https://api.telegram.org/botТОКЕН/setWebhook?url=https://lileia-bot.ВАШ-ПІДДОМЕН.workers.dev`
   Має бути `"Webhook was set"`.
6. Надішліть боту `/start`.

## 4. WayForPay
Для реальних платежів потрібен власний мерчант (український номер +380, верифікація). Після реєстрації замініть у `js/cart.js` `merchantAccount` і секретний ключ (а для справжнього магазину підпис рахують на сервері). Поки — тестовий режим.

## 5. Скріншоти для звіту
Готові (у `docs/screenshots/`): сторінки магазину, кошик (порожній, додавання, повний, оформлення із самовивозом, мобільний), правила.
Зробіть самі: BotFather (токен замазати), налаштування бота, Cloudflare Worker і секрет `BOT_TOKEN`, `Webhook was set` (токен в адресі обрізати), відповідь на `/start`, магазин у Telegram, сторінка оплати WayForPay, GitHub Pages «Your site is live».
