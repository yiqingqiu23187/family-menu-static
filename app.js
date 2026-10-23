(function () {
  "use strict";
  const menu = window.FAMILY_MENU;
  const core = window.MenuCore;
  const $ = id => document.getElementById(id);
  const DRAFT_KEY = "jiachang.draft.v1";
  const SEND_KEY = "jiachang.sendkey.v1";
  const narrow = window.matchMedia("(max-width: 760px)");
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
  }
  const rawDraft = read(DRAFT_KEY, {});
  const draft = rawDraft && typeof rawDraft === "object" ? rawDraft : {};
  const storedKey = read(SEND_KEY, "");
  const state = {
    cart: core.normalizeCart(draft.cart, menu.dishes),
    meal: ["午餐", "晚餐"].includes(draft.meal) ? draft.meal : (new Date().getHours() < 13 ? "午餐" : "晚餐"),
    remark: typeof draft.remark === "string" ? draft.remark.slice(0,300) : "",
    key: typeof storedKey === "string" && core.validKey(storedKey) ? storedKey : "",
    category: "全部", sending: false, result: null, attempt: null, cartOpen: false
  };
  let toastTimer;
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function selected() { return core.items(state.cart, menu.dishes); }
  function fingerprint() { return JSON.stringify([selected().map(item => [item.id, item.count]), state.meal, state.remark]); }
  if (draft.attempt && draft.attempt.fingerprint === fingerprint() && typeof draft.attempt.id === "string") {
    state.attempt = draft.attempt;
    if (draft.attempt.state === "accepted") state.result = { state:"accepted", message:"这份菜单之前已提交给推送服务，请查看微信。" };
    if (["sending", "unknown"].includes(draft.attempt.state)) state.result = { state:"unknown", message:"上一笔发送结果未确认。请先查看微信，再决定是否重试。" };
  }
  function persist() { return write(DRAFT_KEY, { cart:state.cart, meal:state.meal, remark:state.remark, attempt:state.attempt }); }
  function changed() { state.result = null; state.attempt = null; persist(); }
  function toast(message) { $("toast").textContent = message; $("toast").hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").hidden = true, 2800); }
  function imageFor(dish, eager = false) {
    const img = node("img"); img.src = dish.image; img.alt = dish.name; img.loading = eager ? "eager" : "lazy"; img.decoding = "async";
    img.addEventListener("error", () => { img.src = "./favicon.svg"; img.classList.add("image-fallback"); }, { once:true });
    return img;
  }
  function stepper(dish) {
    const box = node("div", "stepper");
    const minus = node("button", "", "−"); minus.type = "button"; minus.dataset.change = "-1"; minus.dataset.id = dish.id; minus.setAttribute("aria-label", "减少一份" + dish.name); minus.disabled = state.sending;
    const count = node("span", "quantity", String(state.cart[dish.id] || 0));
    const plus = node("button", "", "+"); plus.type = "button"; plus.dataset.change = "1"; plus.dataset.id = dish.id; plus.setAttribute("aria-label", "增加一份" + dish.name); plus.disabled = state.sending || state.cart[dish.id] >= core.MAX_QUANTITY;
    box.append(minus, count, plus); return box;
  }
  function renderCategories() {
    $("categories").replaceChildren();
    for (const category of menu.categories) {
      const button = node("button", category === state.category ? "active" : "", category); button.type = "button"; button.dataset.category = category; button.setAttribute("aria-pressed", String(category === state.category)); $("categories").append(button);
    }
  }
  function renderDishes() {
    $("dishes").replaceChildren();
    const visible = menu.dishes.filter(dish => state.category === "全部" || dish.category === state.category);
    $("menu-total").textContent = visible.length + " 道家常味";
    visible.forEach((dish, index) => {
      const card = node("article", "dish-card" + (state.cart[dish.id] ? " selected" : "")); card.dataset.dish = dish.id;
      const wrap = node("div", "dish-image-wrap"); wrap.append(imageFor(dish, index < 2), node("span", "dish-tag", dish.tag));
      const details = node("div", "dish-details"); const text = node("div", "dish-text"); text.append(node("h2", "dish-name", dish.name), node("p", "dish-description", dish.description));
      const control = node("div", "dish-control");
      if (state.cart[dish.id]) control.append(stepper(dish));
      else { const add = node("button", "add-button", "+"); add.type = "button"; add.dataset.change = "1"; add.dataset.id = dish.id; add.disabled = state.sending; add.setAttribute("aria-label", "添加" + dish.name); control.append(add); }
      details.append(text, control); card.append(wrap, details); $("dishes").append(card);
    });
  }
  function renderOrder() {
    const list = selected(); const total = list.reduce((sum,item) => sum + item.count,0);
    $("order-items").replaceChildren();
    if (!list.length) { const empty = node("div", "empty-order"); empty.append(node("span", "", "留点位置，给喜欢的菜"), node("div", "", "点一下菜品旁的 +，就加进来啦。")); $("order-items").append(empty); }
    for (const dish of list) { const row = node("div", "order-item"); row.append(imageFor(dish), node("span", "order-item-name", dish.name), stepper(dish)); $("order-items").append(row); }
    $("total-count").textContent = total; $("mobile-count").textContent = total;
    $("mobile-summary").textContent = list.length ? list.map(dish => dish.name).join("、") : "今天想吃什么？";
    const accepted = state.result?.state === "accepted";
    $("send-order").disabled = !total || state.sending || accepted;
    $("send-order").firstElementChild.textContent = state.sending ? "正在送往微信…" : accepted ? "这份菜单已提交" : "发给主厨";
    $("copy-order").disabled = !total;
    $("order-help").textContent = !total ? "选好菜，再把期待告诉主厨。" : state.key ? "通过 Server酱发送，主厨在微信里查看。" : "首次发送前，设置一下微信通知。";
    $("order-status").hidden = !state.result;
    $("order-status").textContent = state.result?.message || "";
    $("order-status").className = "order-status" + (state.result && !accepted ? " error" : "");
    $("start-over").hidden = !accepted;
    $("remark").disabled = state.sending;
    document.querySelectorAll("[data-meal]").forEach(button => { button.classList.toggle("active", button.dataset.meal === state.meal); button.setAttribute("aria-pressed", String(button.dataset.meal === state.meal)); button.disabled = state.sending; });
    document.querySelectorAll("[data-note]").forEach(button => { button.classList.toggle("active", state.remark.includes(button.dataset.note)); button.setAttribute("aria-pressed", String(state.remark.includes(button.dataset.note))); button.disabled = state.sending; });
  }
  function renderConnection() { $("connection-dot").classList.toggle("connected", !!state.key); $("connection-label").textContent = state.key ? "通知已配置" : "设置微信通知"; }
  function render() { renderDishes(); renderOrder(); renderConnection(); }
  function openSettings() {
    $("sendkey").value = state.key; $("sendkey").type = "password"; $("toggle-key").textContent = "显示"; $("toggle-key").setAttribute("aria-label", "显示 SendKey"); $("settings-error").hidden = true;
    $("settings-dialog").showModal();
  }
  function closeCart() { state.cartOpen = false; $("order-panel").classList.remove("is-open"); $("cart-backdrop").hidden = true; document.body.classList.remove("modal-open"); $("order-panel").removeAttribute("role"); $("order-panel").removeAttribute("aria-modal"); if (narrow.matches) $("open-cart").focus(); }
  function currentOrder() {
    const now = new Date(); const stamp = fingerprint();
    if (!state.attempt || state.attempt.fingerprint !== stamp) state.attempt = { id:"JC-" + now.getTime().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,6).toUpperCase(), fingerprint:stamp, time:now.toLocaleString("zh-CN", { hour12:false }), state:"draft" };
    return { items:selected(), meal:state.meal, remark:state.remark, id:state.attempt.id, time:state.attempt.time };
  }
  $("categories").addEventListener("click", event => { const button = event.target.closest("[data-category]"); if (!button) return; state.category = button.dataset.category; renderCategories(); renderDishes(); });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-change]"); if (!button || state.sending) return;
    const id = button.dataset.id; if (!menu.dishes.some(dish => dish.id === id)) return;
    const count = Math.max(0, Math.min(core.MAX_QUANTITY, (state.cart[id] || 0) + Number(button.dataset.change)));
    if (count) state.cart[id] = count; else delete state.cart[id];
    const inCart = button.closest("#order-panel"); const delta = button.dataset.change;
    changed(); render();
    const target = (inCart ? $("order-items") : $("dishes")).querySelector('[data-id="' + id + '"][data-change="' + delta + '"]');
    if (target && !target.disabled) target.focus({ preventScroll:true });
  });
  document.querySelectorAll("[data-meal]").forEach(button => button.addEventListener("click", () => { if (state.sending) return; state.meal = button.dataset.meal; changed(); renderOrder(); }));
  document.querySelectorAll("[data-note]").forEach(button => button.addEventListener("click", () => {
    if (state.sending) return; const note = button.dataset.note;
    if (state.remark.includes(note)) state.remark = state.remark.replace(note, "").replace(/^[、，\s]+|[、，\s]+$/g, "");
    else state.remark = (state.remark + (state.remark ? "，" : "") + note).slice(0,300);
    $("remark").value = state.remark; changed(); renderOrder();
  }));
  $("remark").value = state.remark;
  $("remark").addEventListener("input", () => { state.remark = $("remark").value.slice(0,300); changed(); renderOrder(); });
  $("open-settings").addEventListener("click", openSettings);
  $("close-settings").addEventListener("click", () => $("settings-dialog").close());
  $("settings-dialog").addEventListener("close", () => { $("sendkey").value = ""; });
  $("toggle-key").addEventListener("click", () => { const show = $("sendkey").type === "password"; $("sendkey").type = show ? "text" : "password"; $("toggle-key").textContent = show ? "隐藏" : "显示"; $("toggle-key").setAttribute("aria-label", (show ? "隐藏" : "显示") + " SendKey"); });
  $("settings-form").addEventListener("submit", event => {
    event.preventDefault(); const value = $("sendkey").value.trim();
    if (!core.validKey(value)) { $("settings-error").textContent = "请粘贴完整的 SCT 开头的 SendKey，不需要粘贴网址。"; $("settings-error").hidden = false; return; }
    state.key = value; const saved = write(SEND_KEY, value); $("settings-dialog").close(); renderConnection(); renderOrder(); toast(saved ? "通知设置已保存" : "浏览器禁止保存，密钥仅在本次打开时有效");
  });
  $("forget-key").addEventListener("click", () => {
    try { localStorage.removeItem(SEND_KEY); } catch (_) {}
    state.key = ""; $("sendkey").value = ""; $("settings-dialog").close(); renderConnection(); renderOrder(); toast("已清除本浏览器的推送密钥");
  });
  $("send-order").addEventListener("click", async () => {
    if (state.sending || !selected().length || state.result?.state === "accepted") return;
    if (!state.key) { openSettings(); return; }
    const order = currentOrder(); const message = core.buildMessage(order);
    state.sending = true; state.result = null; state.attempt.state = "sending"; persist(); render();
    const result = await core.send(state.key, message);
    state.sending = false; state.result = result; state.attempt.state = result.state; persist(); render();
  });
  $("copy-order").addEventListener("click", async () => {
    if (!selected().length) return;
    const text = core.buildMessage(currentOrder()).text; persist();
    try { await navigator.clipboard.writeText(text); toast("菜单已复制，去微信发给主厨吧"); }
    catch (_) { $("copy-content").value = text; $("copy-dialog").showModal(); $("copy-content").focus(); $("copy-content").select(); }
  });
  $("close-copy").addEventListener("click", () => $("copy-dialog").close());
  $("start-over").addEventListener("click", () => { state.cart = {}; state.remark = ""; $("remark").value = ""; changed(); render(); closeCart(); });
  $("open-cart").addEventListener("click", () => { state.cartOpen = true; $("order-panel").classList.add("is-open"); $("cart-backdrop").hidden = false; document.body.classList.add("modal-open"); $("order-panel").setAttribute("role", "dialog"); $("order-panel").setAttribute("aria-modal", "true"); $("close-cart").focus(); });
  $("close-cart").addEventListener("click", closeCart); $("cart-backdrop").addEventListener("click", closeCart);
  document.addEventListener("keydown", event => {
    if (!state.cartOpen || document.querySelector("dialog[open]")) return;
    if (event.key === "Escape") closeCart();
    if (event.key === "Tab") {
      const focusable = [...$("order-panel").querySelectorAll("button:not(:disabled), textarea:not(:disabled)")].filter(el => !el.hidden && el.offsetParent !== null);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  narrow.addEventListener("change", () => { if (!narrow.matches) closeCart(); });
  $("menu-date").textContent = new Date().toLocaleDateString("zh-CN", { month:"long", day:"numeric", weekday:"long" });
  renderCategories(); render();
})();
