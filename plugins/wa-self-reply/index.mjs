// Replies in WhatsApp Web's chat with yourself ("给自己发消息"). Only that chat: every check below is about it.
// Checked against the live page on 2026-11-08:
//   - the signed-in number is in localStorage "last-wid-md" ("<number>:<device>@c.us")
//   - https://web.whatsapp.com/send?phone=<number> opens the chat with that number
//   - in the open chat, the input box's aria-label names who it sends to ("输入要向“<号码>”发送的消息"),
//     and the header shows "(你)" / "(You)" for your own chat
//   - messages: #main [role=row] [data-testid^="conv-msg-"], data-id is the message id (no chat id in it),
//     text in [data-testid=selectable-text]; emoji there are <img alt="🤖">, so textContent alone drops them
//   - system notices have no selectable-text
const PROFILE = "wa";
const URL = "https://web.whatsapp.com";
const BOX = '#main footer [contenteditable="true"][role="textbox"]';

// In-page code is text: the page cannot see this file's variables.
const ME = `(() => { const w = JSON.parse(localStorage.getItem('last-wid-md') || 'null'); return w ? String(w).split(/[:@]/)[0] : null; })()`;
const IS_SELF = `(() => {
  const w = JSON.parse(localStorage.getItem('last-wid-md') || 'null');
  const me = w ? String(w).split(/[:@]/)[0] : '';
  const box = document.querySelector(${JSON.stringify(BOX)});
  if (!me || !box) return false;
  if ((box.getAttribute('aria-label') || '').replace(/\\D/g, '') === me) return true;
  return [...document.querySelectorAll('#main header span')].some((s) => /^\\((你|您|You)\\)$/.test((s.textContent || '').trim()));
})()`;
const READ = `[...document.querySelectorAll('#main [role="row"] [data-testid^="conv-msg-"]')].map((m) => {
  // Each emoji <img> carries the same testid as the text around it, so take the outer ones only.
  const all = [...m.querySelectorAll('span[data-testid="selectable-text"]')].filter((e) => !e.parentElement.closest('[data-testid="selectable-text"]'));
  const t = all[all.length - 1]; // a quoted message comes first; the message's own text is last
  if (!t) return null;
  const c = t.cloneNode(true);
  c.querySelectorAll('img[alt]').forEach((i) => i.replaceWith(i.getAttribute('alt')));
  return { id: m.getAttribute('data-id'), text: (c.textContent || '').trim(), mine: true };
}).filter((x) => x && x.id && x.text)`;

// ponytail: opening reloads the page (about 5 s), so if the user was using another chat the window jumps back to
// this one; the watch waits 30 s after the user moves it. Upgrade: find the chat in the list and click it.
async function openSelf(page) {
  const me = await page.evaluate(ME);
  if (!me) throw new Error("WhatsApp is not signed in: scan the QR code in the WhatsApp window first");
  await page.goto(`${URL}/send?phone=${me}`);
  await page.waitFor(IS_SELF, { timeout: 25_000 });
}

export function apply(ctx) {
  ctx.watch.source({
    name: "whatsapp-self",
    profile: PROFILE,
    url: URL,
    async current(page) {
      return (await page.evaluate(IS_SELF)) ? { id: "self", label: "给自己发消息" } : null;
    },
    async open(page, id) {
      if (id !== "self") throw new Error("This plugin only knows the chat with yourself");
      await openSelf(page);
    },
    async read(page) {
      if (!(await page.evaluate(IS_SELF))) return [];
      return page.evaluate(READ);
    },
    async reply(page, id, text) {
      if (id !== "self" || !(await page.evaluate(IS_SELF))) throw new Error("Not sent: the chat with yourself is not the one open");
      await page.click(BOX);
      // A typed new line sends what is above it at once; Shift+Enter starts a new line instead.
      for (const [i, line] of text.split("\n").entries()) {
        if (i) await page.press("Shift+Enter");
        if (line) await page.type(line);
      }
      await page.press("Enter");
      await page.waitFor(`!(document.querySelector(${JSON.stringify(BOX)})?.textContent || '').trim()`, { timeout: 5_000 });
    },
  });
  // Have the chat open when the plugin starts, so the user has nothing to click before approving it.
  ctx.browser.open({ profile: PROFILE, url: URL }).then(async (page) => {
    if (!(await page.evaluate(IS_SELF))) await page.waitFor(ME, { timeout: 60_000 }).then(() => openSelf(page));
  }).catch(() => {});
}

export const inject = ["watch", "browser"];
