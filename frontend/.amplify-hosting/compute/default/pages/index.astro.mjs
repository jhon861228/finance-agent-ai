import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_Dav0bj0G.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_O4qkFK6w.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Welcome", "data-astro-cid-j7pv25f6": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="login-container" data-astro-cid-j7pv25f6> <header data-astro-cid-j7pv25f6> <div class="logo" data-astro-cid-j7pv25f6> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-j7pv25f6> <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-j7pv25f6></path> </svg> <h1 class="title-gradient" data-astro-cid-j7pv25f6>Antigravity Finance</h1> </div> <p data-astro-cid-j7pv25f6>Your premium personal finance assistant</p> </header> <section class="glass-panel login-box" data-astro-cid-j7pv25f6> <h2 data-astro-cid-j7pv25f6>Access the Dashboard</h2> <p data-astro-cid-j7pv25f6>Enter your Telegram username to view your expenses.</p> <form action="/dashboard" method="GET" class="login-form" data-astro-cid-j7pv25f6> <div class="input-group" data-astro-cid-j7pv25f6> <input type="text" name="username" placeholder="e.g. Pepe" required autocomplete="off" data-astro-cid-j7pv25f6> </div> <button type="submit" class="glow-btn" data-astro-cid-j7pv25f6>View My Finances</button> </form> </section> <footer data-astro-cid-j7pv25f6> <p data-astro-cid-j7pv25f6>&copy; 2026 Antigravity Finance. Powered by AI.</p> </footer> </div> ` })} `;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/index.astro", void 0);

const $$file = "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Index,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
