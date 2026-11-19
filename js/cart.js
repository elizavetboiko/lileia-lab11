/* Кошик і тестова оплата WayForPay.
   Кошик зберігається в localStorage браузера, тож товари не зникають при переході між сторінками.
   Оплата: форма POST на https://secure.wayforpay.com/pay з ПУБЛІЧНИМ ТЕСТОВИМ мерчантом WayForPay.
   УВАГА: секретний ключ у браузері допустимий лише для тестового мерчанта. Для справжнього магазину
   підпис (merchantSignature) рахують тільки на сервері, а ключ ніколи не кладуть у JS. */
(function () {
  "use strict";

  var WFP = {
    url: "https://secure.wayforpay.com/pay",
    merchantAccount: "test_merch_n1",                 // публічні тестові дані WayForPay
    secretKey: "flk3409refn54t54t*FNJRET",
    currency: "UAH",
    language: "UA"
  };
  var RATE = 49.99;                                   // курс НБУ на 17.11.2026, 1 € = 49,99 грн
  var KEY = "pinolyst-cart-v1";
  var PRODUCTS = window.SHOP_PRODUCTS || {};
  var ROOT = document.documentElement.getAttribute("data-root") || "";
  var memory = [];

  /* ---------- зберігання ---------- */
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data.filter(function (l) { return PRODUCTS[l.id] && l.qty > 0; }) : [];
    } catch (e) {
      return memory.slice();
    }
  }

  function save(lines) {
    memory = lines.slice();
    try { window.localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* приватний режим — лишаємо в пам'яті */ }
    updateBadge(true);
  }

  function count(lines) {
    return lines.reduce(function (s, l) { return s + l.qty; }, 0);
  }

  function total(lines) {
    return lines.reduce(function (s, l) { return s + PRODUCTS[l.id].price * l.qty; }, 0);
  }

  function fmt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function lineKey(l) {
    return l.id + "|" + (l.opt || "");
  }

  function lineTitle(l) {
    var p = PRODUCTS[l.id];
    return l.opt ? p.name + " (" + l.opt + ")" : p.name;
  }

  /* ---------- лічильник у шапці й повідомлення ---------- */
  function updateBadge(bump) {
    var n = count(load());
    var els = document.querySelectorAll("[data-cart-count]");
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = n;
      els[i].classList.toggle("is-empty", n === 0);
      if (bump) {
        els[i].classList.remove("bump");
        void els[i].offsetWidth;                      // перезапуск CSS-анімації
        els[i].classList.add("bump");
      }
    }
  }

  var toastTimer;
  function toast(html) {
    var t = document.getElementById("cart-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "cart-toast";
      t.className = "cart-toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.innerHTML = html;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- додавання в кошик ---------- */
  function selected(name) {
    var input = document.querySelector('input[name="' + name + '"]:checked');
    if (input && input.nextElementSibling) return input.nextElementSibling.textContent.trim();
    return "";
  }

  function add(id, opts) {
    if (!PRODUCTS[id]) return;
    var lines = load();
    var line = { id: id, opt: opts.opt || "", qty: 1 };
    var k = lineKey(line);
    var found = lines.filter(function (l) { return lineKey(l) === k; })[0];
    if (found) found.qty = Math.min(found.qty + 1, 99); else lines.push(line);
    save(lines);
    toast("<strong>Додано в кошик:</strong> " + escapeHtml(lineTitle(line)) +
          ' <a href="' + ROOT + 'cart.html">Перейти в кошик →</a>');
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-add]") : null;
    if (!btn) return;
    e.preventDefault();
    var onProductPage = btn.hasAttribute("data-with-options");
    var id = btn.getAttribute("data-add");
    add(id, { opt: onProductPage ? selected("opt") : ((PRODUCTS[id] || {}).opt0 || "") });
    btn.classList.remove("added");
    void btn.offsetWidth;
    btn.classList.add("added");
  });

  /* ---------- сторінка кошика ---------- */
  function renderCart() {
    var root = document.getElementById("cart-app");
    if (!root) return;
    var lines = load();
    var list = document.getElementById("cart-lines");
    var empty = document.getElementById("cart-empty");
    var checkout = document.getElementById("checkout");
    root.classList.toggle("is-empty", lines.length === 0);
    empty.hidden = lines.length !== 0;
    checkout.hidden = lines.length === 0;
    list.innerHTML = "";
    lines.forEach(function (l, i) {
      var p = PRODUCTS[l.id];
      var opts = l.opt ? escapeHtml(l.opt) : "";
      var li = document.createElement("li");
      li.className = "cart-line";
      li.innerHTML =
        '<a class="cl-img" href="' + p.url + '"><img src="' + (p.img || ("images/products/" + p.id + "-1.svg")) + '" alt="" width="96" height="96"></a>' +
        '<div class="cl-info"><a class="cl-name" href="' + p.url + '">' + escapeHtml(p.name) + "</a>" +
        (opts ? '<span class="cl-opts">' + opts + "</span>" : "") +
        '<span class="cl-unit">' + fmt(p.price) + " грн / шт.</span></div>" +
        '<div class="cl-qty" role="group" aria-label="Кількість">' +
        '<button type="button" data-qty="-1" data-i="' + i + '" aria-label="Менше">−</button>' +
        '<input type="number" min="1" max="99" value="' + l.qty + '" data-i="' + i + '" aria-label="Кількість">' +
        '<button type="button" data-qty="1" data-i="' + i + '" aria-label="Більше">+</button></div>' +
        '<div class="cl-sum"><strong>' + fmt(p.price * l.qty) + " грн</strong><span>≈ " + fmt(p.price * l.qty / RATE) + " €</span></div>" +
        '<button type="button" class="cl-remove" data-remove="' + i + '" aria-label="Видалити ' + escapeHtml(p.name) + '">×</button>';
      list.appendChild(li);
    });
    var sum = total(lines);
    document.getElementById("sum-count").textContent = count(lines);
    document.getElementById("sum-uah").textContent = fmt(sum) + " грн";
    document.getElementById("sum-eur").textContent = "≈ " + fmt(sum / RATE) + " €";
  }

  function bindCart() {
    var root = document.getElementById("cart-app");
    if (!root) return;
    root.addEventListener("click", function (e) {
      var t = e.target;
      var lines = load();
      if (t.hasAttribute("data-qty")) {
        var i = +t.getAttribute("data-i");
        lines[i].qty = Math.max(1, Math.min(99, lines[i].qty + (+t.getAttribute("data-qty"))));
        save(lines); renderCart();
      } else if (t.hasAttribute("data-remove")) {
        lines.splice(+t.getAttribute("data-remove"), 1);
        save(lines); renderCart();
      } else if (t.id === "cart-clear") {
        save([]); renderCart();
      }
    });
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.type === "number" && t.hasAttribute("data-i")) {
        var lines = load();
        var v = parseInt(t.value, 10);
        lines[+t.getAttribute("data-i")].qty = isNaN(v) ? 1 : Math.max(1, Math.min(99, v));
        save(lines); renderCart();
      }
    });
    // Доставка: для самовивозу поля міста й відділення не потрібні
    var form = document.getElementById("checkout");
    function syncDelivery() {
      var pickup = form.querySelector('input[name="delivery"]:checked').value === "Самовивіз";
      var courier = form.querySelector('input[name="delivery"]:checked').value.indexOf("кур'єр") !== -1;
      var bl = document.getElementById("branch-label");
      if (bl) bl.textContent = courier ? "Адреса доставки (вулиця, будинок, квартира)" : "Відділення / поштомат / індекс";
      form.querySelectorAll("[data-ship]").forEach(function (el) {
        el.hidden = pickup;
        el.querySelectorAll("input").forEach(function (inp) { inp.required = !pickup; });
      });
    }
    form.addEventListener("change", function (e) { if (e.target.name === "delivery") syncDelivery(); });
    syncDelivery();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      pay(form);
    });
    renderCart();
  }

  /* ---------- оплата WayForPay (тестовий режим) ---------- */
  function pay(form) {
    var lines = load();
    if (!lines.length) return;
    var f = new FormData(form);
    var order = {
      merchantAccount: WFP.merchantAccount,
      merchantAuthType: "SimpleSignature",
      merchantDomainName: location.hostname || "pinolyst.example.com",
      orderReference: "LL-" + Date.now(),
      orderDate: Math.floor(Date.now() / 1000),
      amount: String(total(lines)),
      currency: WFP.currency,
      productName: lines.map(lineTitle),
      productPrice: lines.map(function (l) { return String(PRODUCTS[l.id].price); }),
      productCount: lines.map(function (l) { return String(l.qty); })
    };
    var signString = [order.merchantAccount, order.merchantDomainName, order.orderReference, order.orderDate,
                      order.amount, order.currency].concat(order.productName, order.productCount, order.productPrice).join(";");
    order.merchantSignature = hmacMd5Hex(WFP.secretKey, signString);
    var client = {
      clientFirstName: f.get("firstName"), clientLastName: f.get("lastName"),
      clientEmail: f.get("email"), clientPhone: f.get("phone"), language: WFP.language
    };
    var delivery = f.get("delivery") + (f.get("delivery") === "Самовивіз" ? "" : ", " + f.get("city") + ", " + f.get("branch"));
    try {
      window.localStorage.setItem("pinolyst-last-order", JSON.stringify({
        ref: order.orderReference, amount: order.amount, delivery: delivery, comment: f.get("comment") || "", items: order.productName
      }));
    } catch (e) { /* не критично */ }

    var post = document.createElement("form");
    post.method = "POST";
    post.action = WFP.url;
    post.acceptCharset = "utf-8";
    post.target = form.querySelector("#pay-new-tab").checked ? "_blank" : "_self";
    function field(name, value) {
      var i = document.createElement("input");
      i.type = "hidden"; i.name = name; i.value = value;
      post.appendChild(i);
    }
    ["merchantAccount", "merchantAuthType", "merchantDomainName", "merchantSignature", "orderReference",
     "orderDate", "amount", "currency"].forEach(function (k) { field(k, order[k]); });
    order.productName.forEach(function (v) { field("productName[]", v); });
    order.productPrice.forEach(function (v) { field("productPrice[]", v); });
    order.productCount.forEach(function (v) { field("productCount[]", v); });
    Object.keys(client).forEach(function (k) { if (client[k]) field(k, client[k]); });
    document.body.appendChild(post);
    document.getElementById("pay-status").textContent =
      "Замовлення " + order.orderReference + " на " + fmt(order.amount) + " грн передано на тестову сторінку оплати WayForPay.";
    post.submit();
  }

  /* ---------- MD5 і HMAC-MD5 (WayForPay вимагає HMAC_MD5; у Web Crypto API MD5 немає) ---------- */
  var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
           4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  var K = [];
  for (var ki = 0; ki < 64; ki++) K[ki] = Math.floor(Math.abs(Math.sin(ki + 1)) * 4294967296) >>> 0;

  function md5Bytes(bytes) {
    var len = bytes.length;
    var total = (((len + 8) >>> 6) + 1) * 64;
    var buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, (len * 8) >>> 0, true);
    dv.setUint32(total - 4, Math.floor(len / 536870912), true);
    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    var M = new Array(16);
    for (var off = 0; off < total; off += 64) {
      for (var j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);
      var A = a0, B = b0, C = c0, D = d0;
      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    var out = new Uint8Array(16), odv = new DataView(out.buffer);
    odv.setUint32(0, a0, true); odv.setUint32(4, b0, true); odv.setUint32(8, c0, true); odv.setUint32(12, d0, true);
    return out;
  }

  function hmacMd5Hex(key, message) {
    var enc = new TextEncoder();
    var k = enc.encode(key);
    if (k.length > 64) k = md5Bytes(k);
    var ipad = new Uint8Array(64), opad = new Uint8Array(64);
    for (var i = 0; i < 64; i++) {
      var b = i < k.length ? k[i] : 0;
      ipad[i] = b ^ 0x36; opad[i] = b ^ 0x5c;
    }
    var msg = enc.encode(message);
    var inner = new Uint8Array(64 + msg.length);
    inner.set(ipad); inner.set(msg, 64);
    var ih = md5Bytes(inner);
    var outer = new Uint8Array(80);
    outer.set(opad); outer.set(ih, 64);
    return Array.prototype.map.call(md5Bytes(outer), function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join("");
  }

  window.SHOP_CART = { add: add, load: load, hmacMd5Hex: hmacMd5Hex };

  document.addEventListener("DOMContentLoaded", function () {
    updateBadge(false);
    bindCart();
  });
  window.addEventListener("storage", function (e) { if (e.key === KEY) { updateBadge(false); renderCart(); } });
})();
