(function (root) {
  "use strict";
  const MAX_QUANTITY = 9;
  function normalizeCart(value, dishes) {
    const result = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return result;
    for (const dish of dishes) {
      const count = Number(value[dish.id]);
      if (Number.isInteger(count) && count > 0) result[dish.id] = Math.min(count, MAX_QUANTITY);
    }
    return result;
  }
  function items(cart, dishes) {
    return dishes.filter(dish => cart[dish.id] > 0).map(dish => ({ ...dish, count: cart[dish.id] }));
  }
  function validKey(value) { return /^SCT[A-Za-z0-9]{12,150}$/.test(value); }
  function buildMessage(order) {
    const names = order.items.map(item => item.name + (item.count > 1 ? "×" + item.count : ""));
    const title = (order.meal + "想吃：" + names.join("、")).slice(0,80);
    const lines = ["橘橘大王的御膳房 · " + order.meal + "点单", order.time, "", ...order.items.map(item => "• " + item.name + " × " + item.count), "", "共 " + order.items.reduce((sum,item) => sum + item.count,0) + " 份", "备注：" + (order.remark.trim() || "没有特别要求，主厨自由发挥。"), "", "订单号：" + order.id, "你来点，我来做。"];
    return { title, desp: lines.join("\n"), text: lines.join("\n") };
  }
  async function send(key, message, fetcher = fetch, timeout = 15000) {
    if (!validKey(key)) return { state: "rejected", message: "SendKey 格式不对，请检查通知设置。" };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetcher("https://sctapi.ftqq.com/" + key + ".send", {
        method: "POST", mode: "cors", credentials: "omit", referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ title: message.title, desp: message.desp }), signal: controller.signal
      });
      let body;
      try { body = await response.json(); } catch (_) { return { state: "unknown", message: "暂时无法确认发送结果。请先查看微信，再决定是否重试。" }; }
      if (response.ok && body && body.code === 0 && (!body.data || body.data.errno === undefined || Number(body.data.errno) === 0)) {
        return { state: "accepted", message: "推送请求已受理，请主厨查看微信。是否送达以微信实际收到为准。" };
      }
      if (body && (body.code === 40001 || body.scode === 461)) return { state: "rejected", message: "SendKey 无效，请在通知设置里重新填写。" };
      if (response.status === 429) return { state: "rejected", message: "发送太频繁或额度已用完，稍后再试，也可以复制菜单发送。" };
      return { state: "rejected", message: "推送服务未接受请求（" + (Number(body?.code) || response.status) + "）。请检查 Server酱的密钥、额度和消息通道，或复制菜单发送。" };
    } catch (_) {
      return { state: "unknown", message: "网络中断或等待超时，发送结果尚未确认。请先查看微信，避免重复发送；也可以复制菜单。" };
    } finally { clearTimeout(timer); }
  }
  const api = { MAX_QUANTITY, normalizeCart, items, validKey, buildMessage, send };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MenuCore = api;
})(typeof window !== "undefined" ? window : globalThis);
