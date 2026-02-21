import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, h as createAstro } from './astro/server_DqZNW82L.mjs';
import 'piccolore';
import 'clsx';
/* empty css                             */

const $$Astro$1 = createAstro();
const $$PageHeader = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$PageHeader;
  const {
    username,
    title,
    showBack = false,
    backUrl = "/dashboard"
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<header class="luxury-head" data-astro-cid-wu5dj4rx> <div class="left-section" data-astro-cid-wu5dj4rx> ${showBack ? renderTemplate`<a${addAttribute(backUrl, "href")} class="back-btn-luxury" data-astro-cid-wu5dj4rx> <span data-astro-cid-wu5dj4rx>←</span> </a>` : renderTemplate`<div class="user-pill" data-astro-cid-wu5dj4rx> <div class="avatar-sm" data-astro-cid-wu5dj4rx>${username[0].toUpperCase()}</div> <div class="user-meta" data-astro-cid-wu5dj4rx> <span class="greet" data-astro-cid-wu5dj4rx>Good Morning,</span> <span class="name-bold" data-astro-cid-wu5dj4rx>${username}</span> </div> </div>`} </div> ${title && renderTemplate`<div class="title-container" data-astro-cid-wu5dj4rx> <span class="sec-label" data-astro-cid-wu5dj4rx>GROUP ACCOUNT</span> <h1 class="gold-text" data-astro-cid-wu5dj4rx>${title}</h1> </div>`} <div class="right-section" data-astro-cid-wu5dj4rx> <a href="/logout" class="notif-bell logout-btn" title="Logout" data-astro-cid-wu5dj4rx> <span class="bell-icon" data-astro-cid-wu5dj4rx>🚪</span> </a> </div> </header> `;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/components/PageHeader.astro", void 0);

const $$Astro = createAstro();
const $$ExpenseItem = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$ExpenseItem;
  const {
    description,
    amount,
    category,
    source,
    timestamp,
    payerName,
    isNegative = false
  } = Astro2.props;
  const dateStr = new Date(timestamp).toLocaleDateString();
  return renderTemplate`${maybeRenderHead()}<div class="insight-item" data-astro-cid-muutatgo> <div class="insight-icon" data-astro-cid-muutatgo> ${description[0].toUpperCase()} </div> <div class="insight-meta" data-astro-cid-muutatgo> <span class="insight-name" data-astro-cid-muutatgo>${description}</span> <span class="insight-sub" data-astro-cid-muutatgo> ${source} • ${category} ${payerName && `\u2022 Paid by ${payerName}`} </span> </div> <div class="insight-val" data-astro-cid-muutatgo> <span class="val-num gold-text" data-astro-cid-muutatgo> ${isNegative ? "-" : ""}$${amount.toFixed(2)} </span> <span class="val-date" data-astro-cid-muutatgo>${dateStr}</span> </div> </div> `;
}, "/Users/usuario/Documents/Desarrollo/finance-agent-ai/frontend/src/components/ExpenseItem.astro", void 0);

const BACKEND_URL = "http://localhost:3000";
const API_KEY = "default-secret-key";
async function apiFetch(path, options = {}, token) {
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...options.headers
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
async function getUserByUsername(username, token) {
  if (!username) return null;
  return apiFetch(`/api/users/by-username/${encodeURIComponent(username)}`, {}, token);
}
async function getPersonalExpenses(userId, token) {
  const expenses = await apiFetch(`/api/personal/expenses/${userId}`, {}, token);
  return (expenses || []).map((e) => ({
    ...e,
    source: "Personal"
  }));
}
async function getUserGroups(userId, token) {
  return apiFetch(`/api/users/${userId}/groups`, {}, token) || [];
}
async function getGroupDetails(groupId, token) {
  return apiFetch(`/api/groups/${groupId}`, {}, token);
}
async function generateLinkingCode(userId, token) {
  const response = await apiFetch(`/api/users/${userId}/link-code`, { method: "POST" }, token);
  return response?.code || null;
}

export { $$PageHeader as $, getPersonalExpenses as a, getUserGroups as b, generateLinkingCode as c, $$ExpenseItem as d, getGroupDetails as e, getUserByUsername as g };
