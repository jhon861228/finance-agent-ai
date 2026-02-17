import { e as createComponent, m as maybeRenderHead, r as renderTemplate, h as createAstro, g as addAttribute, k as renderComponent } from '../chunks/astro/server_zQVrf1Pb.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_DJCbQrYS.mjs';
import { g as getUserByUsername, a as getPersonalExpenses, b as getUserGroups, $ as $$PageHeader, c as $$ExpenseItem } from '../chunks/db_YsKY7NWL.mjs';
import 'clsx';
/* empty css                                     */
/* empty css                                     */
export { renderers } from '../renderers.mjs';

const $$Astro$2 = createAstro();
const $$PortfolioSummary = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$PortfolioSummary;
  const {
    amount,
    label = "TOTAL WEALTH PORTFOLIO",
    trend = "+12.4% this month"
  } = Astro2.props;
  const wholePart = Math.floor(amount);
  const centsPart = (amount % 1 * 100).toFixed(0).padStart(2, "0");
  return renderTemplate`${maybeRenderHead()}<section class="portfolio-card" data-astro-cid-xg7ihxhf> <span class="portfolio-title" data-astro-cid-xg7ihxhf>${label}</span> <div class="portfolio-amount" data-astro-cid-xg7ihxhf> <span class="currency" data-astro-cid-xg7ihxhf>$</span> <span class="big-gold" data-astro-cid-xg7ihxhf>${wholePart.toLocaleString()}</span> <span class="cents" data-astro-cid-xg7ihxhf>.${centsPart}</span> </div> ${trend && renderTemplate`<div class="trend-pill" data-astro-cid-xg7ihxhf> <span class="trend-icon" data-astro-cid-xg7ihxhf>📈</span> <span class="trend-val" data-astro-cid-xg7ihxhf>${trend}</span> </div>`} </section> `;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/components/PortfolioSummary.astro", void 0);

const $$Astro$1 = createAstro();
const $$GroupCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$GroupCard;
  const { group, username, index } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(`/group/${group.groupId}?username=${username}`, "href")} class="card-link" data-astro-cid-qvmmmtec> <div${addAttribute(`premium-card group-card-alt ${index % 2 === 0 ? "gold-border" : "silver-border"}`, "class")} data-astro-cid-qvmmmtec> <div class="card-top" data-astro-cid-qvmmmtec> <span class="card-title" data-astro-cid-qvmmmtec>GROUP ACCESS</span> <span class="visa-style" data-astro-cid-qvmmmtec>FINANCE</span> </div> <div class="card-main" data-astro-cid-qvmmmtec> <h3 class="group-name-card" data-astro-cid-qvmmmtec> ${group.name} </h3> <div class="card-number-dots" data-astro-cid-qvmmmtec> ${group.members.slice(0, 4).map(() => renderTemplate`<span class="dot" data-astro-cid-qvmmmtec>●</span>`)} <span class="num-end" data-astro-cid-qvmmmtec> ${group.groupId.slice(-4)} </span> </div> </div> <div class="card-bottom" data-astro-cid-qvmmmtec> <div class="card-holder" data-astro-cid-qvmmmtec> <span class="ch-label" data-astro-cid-qvmmmtec>MEMBERS</span> <span class="ch-name" data-astro-cid-qvmmmtec> ${group.members.length} USERS
</span> </div> <div class="card-chip" data-astro-cid-qvmmmtec> <div class="chip-inner" data-astro-cid-qvmmmtec></div> </div> </div> </div> </a> `;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/components/GroupCard.astro", void 0);

const $$Astro = createAstro();
const $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Dashboard;
  const username = (Astro2.url.searchParams.get("username") || "").trim();
  if (!username) {
    return Astro2.redirect("/");
  }
  const user = await getUserByUsername(username);
  if (!user) {
    return Astro2.redirect("/?error=UserNotFound");
  }
  const personalExpenses = await getPersonalExpenses(user.userId);
  const totalPersonalSpend = user.totalSpent || 0;
  const groups = await getUserGroups(user.userId);
  const allExpenses = [
    ...personalExpenses.map((e) => ({
      ...e,
      source: "Personal",
      sourceType: "personal"
    })),
    ...groups.flatMap(
      (g) => g.expenses.filter((e) => e.payerId === user.userId).map((e) => ({
        ...e,
        source: g.name,
        sourceType: "group"
      }))
    )
  ].sort((a, b) => b.timestamp - a.timestamp);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Dashboard", "data-astro-cid-3nssi2tu": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="premium-dashboard" data-astro-cid-3nssi2tu> ${renderComponent($$result2, "PageHeader", $$PageHeader, { "username": user.name, "data-astro-cid-3nssi2tu": true })} ${renderComponent($$result2, "PortfolioSummary", $$PortfolioSummary, { "amount": totalPersonalSpend, "data-astro-cid-3nssi2tu": true })} <!-- Action Grid --> <div class="action-grid" data-astro-cid-3nssi2tu> <div class="action-item" data-astro-cid-3nssi2tu> <div class="action-btn-p" data-astro-cid-3nssi2tu> <span data-astro-cid-3nssi2tu>➤</span> </div> <span class="action-label" data-astro-cid-3nssi2tu>SEND</span> </div> <div class="action-item" data-astro-cid-3nssi2tu> <div class="action-btn-p" data-astro-cid-3nssi2tu> <span data-astro-cid-3nssi2tu>💵</span> </div> <span class="action-label" data-astro-cid-3nssi2tu>PAY</span> </div> <div class="action-item" data-astro-cid-3nssi2tu> <div class="action-btn-p" data-astro-cid-3nssi2tu> <span data-astro-cid-3nssi2tu>📈</span> </div> <span class="action-label" data-astro-cid-3nssi2tu>INVEST</span> </div> <div class="action-item" data-astro-cid-3nssi2tu> <div class="action-btn-p" data-astro-cid-3nssi2tu> <span data-astro-cid-3nssi2tu>⊕</span> </div> <span class="action-label" data-astro-cid-3nssi2tu>TOP UP</span> </div> </div> <!-- Group Cards --> <section class="cards-section" data-astro-cid-3nssi2tu> <div class="sec-header" data-astro-cid-3nssi2tu> <h2 data-astro-cid-3nssi2tu>YOUR GROUPS</h2> <a href="#" class="manage-btn" data-astro-cid-3nssi2tu>MANAGE</a> </div> <div class="cards-scroll" data-astro-cid-3nssi2tu> ${groups.map((group, index) => renderTemplate`${renderComponent($$result2, "GroupCard", $$GroupCard, { "group": group, "username": username, "index": index, "data-astro-cid-3nssi2tu": true })}`)} ${groups.length === 0 && renderTemplate`<p class="muted" data-astro-cid-3nssi2tu>No groups yet.</p>`} </div> </section> <!-- Activity / Insights --> <section class="insights-section" data-astro-cid-3nssi2tu> <div class="sec-header" data-astro-cid-3nssi2tu> <h2 data-astro-cid-3nssi2tu>MARKET INSIGHTS</h2> <a href="#" class="view-all-btn" data-astro-cid-3nssi2tu>VIEW ALL</a> </div> <div class="activity-chart" data-astro-cid-3nssi2tu> <div class="chart-bars" data-astro-cid-3nssi2tu> ${[40, 60, 50, 70, 90, 80, 75, 85].map((h, i) => renderTemplate`<div${addAttribute(`bar ${i === 4 ? "highlight" : ""}`, "class")}${addAttribute(`height: ${h}%`, "style")} data-astro-cid-3nssi2tu></div>`)} </div> </div> <div class="insights-list" data-astro-cid-3nssi2tu> ${allExpenses.slice(0, 5).map((exp) => renderTemplate`${renderComponent($$result2, "ExpenseItem", $$ExpenseItem, { "description": exp.description, "amount": exp.amount, "category": exp.category, "source": exp.source, "timestamp": exp.timestamp, "data-astro-cid-3nssi2tu": true })}`)} </div> </section> </div> ` })} `;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/dashboard.astro", void 0);

const $$file = "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Dashboard,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
