import { e as createComponent, m as maybeRenderHead, l as renderScript, r as renderTemplate, n as renderSlot, k as renderComponent, o as renderHead, h as createAstro } from './astro/server_Dav0bj0G.mjs';
import 'piccolore';
/* empty css                             */
import 'clsx';

const $$ThemeToggle = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme" data-astro-cid-x3pjskd3> <span class="sun-icon" data-astro-cid-x3pjskd3>☀️</span> <span class="moon-icon" data-astro-cid-x3pjskd3>🌙</span> </button>  ${renderScript($$result, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/components/ThemeToggle.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/components/ThemeToggle.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="UTF-8"><meta name="description" content="Antigravity Finance Dashboard"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet"><title>', ' | Antigravity Finance</title><script>\n			const theme = (() => {\n				if (\n					typeof localStorage !== "undefined" &&\n					localStorage.getItem("theme")\n				) {\n					return localStorage.getItem("theme");\n				}\n				if (window.matchMedia("(prefers-color-scheme: dark)").matches) {\n					return "dark";\n				}\n				return "light";\n			})();\n\n			if (theme === "light") {\n				document.documentElement.setAttribute("data-theme", "light");\n			} else {\n				document.documentElement.setAttribute("data-theme", "dark");\n			}\n		<\/script>', '</head> <body> <header class="top-header"> ', ' </header> <main id="app-container"> ', ' </main> <nav class="bottom-nav"> <a href="/dashboard" class="nav-item active"> <span class="nav-icon">\u{1F3E0}</span> <span class="nav-label">HOME</span> </a> <a href="#" class="nav-item"> <span class="nav-icon">\u{1F45B}</span> <span class="nav-label">WALLET</span> </a> <div class="nav-scan"> <div class="scan-btn"> <span class="scan-icon">\u{1F50D}</span> </div> </div> <a href="#" class="nav-item"> <span class="nav-icon">\u{1F4CA}</span> <span class="nav-label">REPORTS</span> </a> <a href="#" class="nav-item"> <span class="nav-icon">\u{1F464}</span> <span class="nav-label">PROFILE</span> </a> </nav> </body></html>'])), title, renderHead(), renderComponent($$result, "ThemeToggle", $$ThemeToggle, {}), renderSlot($$result, $$slots["default"]));
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
