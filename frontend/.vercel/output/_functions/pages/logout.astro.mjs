import { e as createComponent, h as createAstro } from '../chunks/astro/server_DqZNW82L.mjs';
import 'piccolore';
import 'clsx';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Logout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Logout;
  Astro2.cookies.delete("token", { path: "/" });
  Astro2.cookies.delete("username", { path: "/" });
  return Astro2.redirect("/");
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/logout.astro", void 0);

const $$file = "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/logout.astro";
const $$url = "/logout";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Logout,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
