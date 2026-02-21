import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead } from '../chunks/astro/server_DqZNW82L.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_BZifqPDm.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  console.log("Ingresando al index");
  console.log("Astro.request.method", Astro2.request.method);
  console.log("Astro.request", JSON.stringify(Astro2.request));
  const BACKEND_URL = "http://localhost:3000";
  const API_KEY = "default-secret-key";
  let error = "";
  let success = "";
  console.log("BACKEND_URL", BACKEND_URL);
  console.log("API_KEY", API_KEY);
  if (Astro2.request.method === "POST") {
    try {
      const data = await Astro2.request.formData();
      const action = data.get("action");
      const username = data.get("username")?.toString();
      const password = data.get("password")?.toString();
      if (!username || !password) {
        error = "Username and password are required.";
      } else {
        const endpoint = action === "register" ? "/api/auth/register" : "/api/auth/login";
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
          },
          body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (!response.ok) {
          console.error("[Auth Error] Authentication failed:", result);
          error = result.error || "Authentication failed.";
        } else {
          if (action === "register") {
            success = "Registration successful! Please log in.";
          } else {
            Astro2.cookies.set("token", result.token, {
              httpOnly: true,
              secure: true,
              path: "/",
              maxAge: 60 * 60 * 24 * 7
              // 7 days
            });
            Astro2.cookies.set("username", result.user.name, {
              httpOnly: true,
              secure: true,
              path: "/",
              maxAge: 60 * 60 * 24 * 7
            });
            return Astro2.redirect("/dashboard");
          }
        }
      }
    } catch (e) {
      console.error(
        "[Auth Exception] Unexpected error during form submission:",
        e
      );
      error = "An unexpected error occurred.";
    }
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Welcome - Login", "data-astro-cid-j7pv25f6": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="login-container" data-astro-cid-j7pv25f6> <header data-astro-cid-j7pv25f6> <div class="logo" data-astro-cid-j7pv25f6> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-j7pv25f6> <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-j7pv25f6></path> </svg> <h1 class="title-gradient" data-astro-cid-j7pv25f6>Antigravity Finance</h1> </div> <p data-astro-cid-j7pv25f6>Your premium personal finance assistant</p> </header> <section class="glass-panel login-box" data-astro-cid-j7pv25f6> <h2 data-astro-cid-j7pv25f6>Access the Dashboard</h2> <p data-astro-cid-j7pv25f6>Login or create an account to view your expenses.</p> ${error && renderTemplate`<div class="error-msg" data-astro-cid-j7pv25f6>${error}</div>`} ${success && renderTemplate`<div class="success-msg" data-astro-cid-j7pv25f6>${success}</div>`} <form method="POST" class="login-form" data-astro-cid-j7pv25f6> <div class="input-group" data-astro-cid-j7pv25f6> <input type="text" name="username" placeholder="Username (e.g. Pepe)" required autocomplete="username" data-astro-cid-j7pv25f6> </div> <div class="input-group" data-astro-cid-j7pv25f6> <input type="password" name="password" placeholder="Password" required autocomplete="current-password" data-astro-cid-j7pv25f6> </div> <div class="action-buttons" data-astro-cid-j7pv25f6> <button type="submit" name="action" value="login" class="glow-btn" data-astro-cid-j7pv25f6>Login</button> <button type="submit" name="action" value="register" class="glow-btn outline" data-astro-cid-j7pv25f6>Register</button> </div> </form> </section> <footer data-astro-cid-j7pv25f6> <p data-astro-cid-j7pv25f6>&copy; 2026 Antigravity Finance. Powered by AI.</p> </footer> </div> ` })} `;
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
