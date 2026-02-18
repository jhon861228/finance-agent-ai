import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../../chunks/astro/server_Dav0bj0G.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_O4qkFK6w.mjs';
import { d as getGroupDetails, g as getUserByUsername, $ as $$PageHeader, c as $$ExpenseItem } from '../../chunks/db_Dl1R78Ar.mjs';
/* empty css                                        */
/* empty css                                   */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  const username = Astro2.url.searchParams.get("username") || "";
  if (!id) return Astro2.redirect("/dashboard?username=" + username);
  const group = await getGroupDetails(id);
  const currentUser = await getUserByUsername(username);
  if (!group || !currentUser)
    return Astro2.redirect("/dashboard?username=" + username);
  const totalSpent = group.totalSpent || 0;
  const perPersonShare = totalSpent / (group.members.length || 1);
  const memberBalances = {};
  group.balances.forEach((b) => {
    memberBalances[b.userId] = b.netBalance || 0;
  });
  const transactions = group.settlements || [];
  const idToName = {};
  group.members.forEach((m) => {
    idToName[m.userId] = m.name;
  });
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `Group: ${group.name}`, "data-astro-cid-qzvpgxnd": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="premium-group-detail" data-astro-cid-qzvpgxnd> ${renderComponent($$result2, "PageHeader", $$PageHeader, { "username": username, "title": group.name, "showBack": true, "backUrl": "/dashboard", "data-astro-cid-qzvpgxnd": true })} <!-- Stats Grid --> <section class="group-stats-luxury" data-astro-cid-qzvpgxnd> <div class="stat-luxury-card" data-astro-cid-qzvpgxnd> <span class="stat-l-label" data-astro-cid-qzvpgxnd>TOTAL SPENT</span> <span class="stat-l-val gold-text" data-astro-cid-qzvpgxnd>$${totalSpent.toFixed(2)}</span> </div> <div class="stat-luxury-card" data-astro-cid-qzvpgxnd> <span class="stat-l-label" data-astro-cid-qzvpgxnd>YOUR SHARE</span> <span class="stat-l-val" data-astro-cid-qzvpgxnd>$${perPersonShare.toFixed(2)}</span> </div> <div class="stat-luxury-card" data-astro-cid-qzvpgxnd> <span class="stat-l-label" data-astro-cid-qzvpgxnd>MEMBERS</span> <span class="stat-l-val" data-astro-cid-qzvpgxnd>${group.members.length}</span> </div> </section> <!-- Settlements (Liquidations) --> <section class="settlements-luxury" data-astro-cid-qzvpgxnd> <div class="sec-header" data-astro-cid-qzvpgxnd> <h2 data-astro-cid-qzvpgxnd>LIQUIDATIONS</h2> <span class="status-pill settled" data-astro-cid-qzvpgxnd>${transactions.length === 0 ? "SETTLED" : "PENDING"}</span> </div> <div class="settlement-cards" data-astro-cid-qzvpgxnd> ${transactions.length === 0 ? renderTemplate`<div class="premium-card empty-settlement" data-astro-cid-qzvpgxnd> <span class="empty-icon" data-astro-cid-qzvpgxnd>🥂</span> <p data-astro-cid-qzvpgxnd>All accounts are perfectly settled.</p> </div>` : transactions.map((t) => renderTemplate`<div class="premium-card settlement-card-alt" data-astro-cid-qzvpgxnd> <div class="settle-flow" data-astro-cid-qzvpgxnd> <span class="s-name" data-astro-cid-qzvpgxnd> ${idToName[t.from] || t.from} </span> <span class="s-arrow gold-text" data-astro-cid-qzvpgxnd>→</span> <span class="s-name" data-astro-cid-qzvpgxnd> ${idToName[t.to] || t.to} </span> </div> <div class="settle-amount gold-text" data-astro-cid-qzvpgxnd>
$${t.amount.toFixed(2)} </div> </div>`)} </div> </section> <!-- Expense History --> <section class="group-expenses-luxury" data-astro-cid-qzvpgxnd> <div class="sec-header" data-astro-cid-qzvpgxnd> <h2 data-astro-cid-qzvpgxnd>TRANSACTION HISTORY</h2> </div> <div class="luxury-expense-list" data-astro-cid-qzvpgxnd> ${group.expenses.length === 0 ? renderTemplate`<p class="muted" data-astro-cid-qzvpgxnd>No transactions recorded yet.</p>` : group.expenses.slice().reverse().map((exp) => renderTemplate`${renderComponent($$result2, "ExpenseItem", $$ExpenseItem, { "description": exp.description, "amount": exp.amount, "category": exp.category, "source": "Group", "timestamp": exp.timestamp, "payerName": idToName[exp.payerId || ""] || "Unknown", "isNegative": true, "data-astro-cid-qzvpgxnd": true })}`)} </div> </section> <!-- Member Balances --> <section class="member-balances-luxury" data-astro-cid-qzvpgxnd> <div class="sec-header" data-astro-cid-qzvpgxnd> <h2 data-astro-cid-qzvpgxnd>MEMBER STATUS</h2> </div> <div class="balances-grid" data-astro-cid-qzvpgxnd> ${group.members.map((m) => {
    const bal = memberBalances[m.userId];
    return renderTemplate`<div class="bal-item" data-astro-cid-qzvpgxnd> <div class="bal-user" data-astro-cid-qzvpgxnd> <div class="avatar-xs" data-astro-cid-qzvpgxnd> ${m.name[0].toUpperCase()} </div> <span data-astro-cid-qzvpgxnd>${m.name}</span> </div> <span${addAttribute(`bal-val ${bal >= 0 ? "positive" : "negative"}`, "class")} data-astro-cid-qzvpgxnd> ${bal >= 0 ? `+ $${bal.toFixed(2)}` : `- $${Math.abs(bal).toFixed(2)}`} </span> </div>`;
  })} </div> </section> </div> ` })} `;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/group/[id].astro", void 0);

const $$file = "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/group/[id].astro";
const $$url = "/group/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$id,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
