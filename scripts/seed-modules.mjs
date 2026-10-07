// Loads the club's real module list and the Level 6 Financial Reporting content
// (teaching weeks 0–6) from the lecturer's materials. Safe to run again.
//
//   node scripts/seed-modules.mjs [path to the "Modules" folder]
//
// What it does:
//   1. Renames the placeholder modules in Levels 4–6 to the real module names and
//      hides (drafts) the placeholders that have no name yet.
//   2. Renames the sample "Corporate Finance" subject to "Financial Management",
//      keeping its NPV / IRR / WACC topics.
//   3. Creates the Financial Reporting topics with summaries, rules, worked
//      examples, the lecture/seminar/workshop files as materials, and quizzes.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const MODULES_DIR = process.argv[2] ?? join(homedir(), "Desktop", "Modules");
const FR_DIR = join(MODULES_DIR, "Level 6 Financial Reporting");

function fail(step, error) {
  console.error(`${step}: ${error?.message ?? error}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Module names per level (from the club's folder, 7 Oct 2026)
// ---------------------------------------------------------------------------
const LEVEL_MODULES = {
  4: [
    { name: "Financial Accounting", slug: "financial-accounting", description: "Recording transactions and preparing the primary financial statements: double entry, year-end adjustments, and the statements of profit or loss and financial position." },
    { name: "Fundamentals of Statistics", slug: "fundamentals-of-statistics", description: "Descriptive statistics, probability, distributions and basic inference — the quantitative toolkit every finance student needs." },
    { name: "Essentials of Economics", slug: "essentials-of-economics", description: "Micro- and macroeconomic principles: markets, firms, money, inflation, growth and policy." },
  ],
  5: [
    { name: "Financial Management", slug: "financial-management", legacySlugs: ["corporate-finance"], description: "How companies choose investments and finance them: investment appraisal, cost of capital, capital structure and dividend policy." },
    { name: "Management Accounting", slug: "management-accounting", description: "Costing, budgeting, variance analysis and the information managers use to make decisions." },
    { name: "Financial Modelling and Statistics", slug: "financial-modelling-and-statistics", description: "Building financial models in spreadsheets and applying statistical methods — regression, forecasting, simulation — to finance problems." },
  ],
  6: [
    { name: "Financial Reporting", slug: "financial-reporting", description: "Builds on Financial Accounting to prepare and analyse financial statements under IFRS Accounting Standards. Closely aligned with the ACCA Financial Reporting (FR) syllabus. Module code 6FNCE004C." },
    { name: "Applied Corporate Finance", slug: "applied-corporate-finance", description: "Advanced investment, financing and valuation decisions: capital structure, dividend policy, mergers and acquisitions, and risk management." },
    { name: "Sustainable Finance", slug: "sustainable-finance", description: "ESG, green finance, climate risk and sustainability reporting — how finance supports sustainable business." },
  ],
};

const { data: levels, error: levelsError } = await db.from("levels").select("id, number").order("number");
if (levelsError) fail("levels", levelsError);
const levelId = (n) => levels.find((l) => l.number === n)?.id;

for (const [numberText, modules] of Object.entries(LEVEL_MODULES)) {
  const number = Number(numberText);
  const lid = levelId(number);
  if (!lid) fail("levels", new Error(`Level ${number} not found — run npm run db:push first`));

  const { data: subjects, error } = await db.from("subjects").select("id, slug, name").eq("level_id", lid).order("sort_order");
  if (error) fail(`subjects L${number}`, error);
  const used = new Set();

  for (const [i, m] of modules.entries()) {
    const candidates = [m.slug, ...(m.legacySlugs ?? [])];
    let row = subjects.find((s) => candidates.includes(s.slug) && !used.has(s.id));
    if (!row) row = subjects.find((s) => /^module-\d+$/.test(s.slug) && !used.has(s.id));
    const patch = { name: m.name, slug: m.slug, description: m.description, sort_order: i + 1, status: "published" };
    if (row) {
      used.add(row.id);
      const { error: upErr } = await db.from("subjects").update(patch).eq("id", row.id);
      if (upErr) fail(`rename ${m.name}`, upErr);
    } else {
      const { error: insErr } = await db.from("subjects").insert({ ...patch, level_id: lid });
      if (insErr) fail(`insert ${m.name}`, insErr);
    }
    console.log(`✓ L${number}  ${m.name}`);
  }

  // Placeholders without a real name yet stay as drafts (visible only in the admin panel).
  const leftovers = subjects.filter((s) => !used.has(s.id) && /^module-\d+$/.test(s.slug));
  for (const [j, s] of leftovers.entries()) {
    await db.from("subjects").update({ status: "draft", sort_order: modules.length + j + 1 }).eq("id", s.id);
  }
  if (leftovers.length) console.log(`  L${number}  ${leftovers.length} unnamed modules hidden as drafts`);
}

// Level 3 has no module list yet: hide its placeholders too.
{
  const lid = levelId(3);
  if (lid) {
    const { data } = await db.from("subjects").select("id").eq("level_id", lid).like("slug", "module-%");
    for (const s of data ?? []) await db.from("subjects").update({ status: "draft" }).eq("id", s.id);
    if (data?.length) console.log(`  L3  ${data.length} unnamed modules hidden as drafts`);
  }
}

// ---------------------------------------------------------------------------
// 2. Author for the Financial Reporting topics
// ---------------------------------------------------------------------------
const { data: adminProfile } = await db.from("profiles").select("id").eq("role", "admin").not("email", "ilike", "%@example.com").order("created_at").limit(1).maybeSingle();
const { data: editorProfile } = await db.from("profiles").select("id").ilike("email", "dev.editor@example.com").maybeSingle();
const authorId = adminProfile?.id ?? editorProfile?.id ?? null;

// ---------------------------------------------------------------------------
// 3. Financial Reporting content (from Lectures, Seminars and Workshops 0–6)
// ---------------------------------------------------------------------------
const FR_TOPICS = [
  // ---------------------------------------------------------------- TW 0
  {
    slug: "introduction-to-financial-reporting",
    title: "Introduction: financial reporting, accounting models and IFRS",
    sort_order: 1,
    summary: `Financial reporting is the preparation of general purpose financial statements — statements intended for users who cannot demand reports tailored to their needs: existing and potential investors, lenders and other creditors. The Financial Reporting module (6FNCE004C) builds on Financial Accounting and follows the ACCA Financial Reporting syllabus: 23 standards plus the Conceptual Framework, from presentation and non-current assets through financial instruments, revenue, tax, leases, provisions, cash flows and group accounts.

Accounting models differ by country. In the Anglo-American model (UK, US, Canada, Australia) companies are financed mainly by shareholders, so statements are prepared for them and standards come from independent bodies. In the Continental European model (Germany, France, Japan) banks are the main financiers, so accounting serves creditors and tax authorities and is set in law. The Latin American model deals with high inflation, and the Islamic model follows Sharia (no interest). The international model is IFRS Accounting Standards, required or permitted in over 140 jurisdictions covering about 97% of world GDP.

Uzbekistan is converging with IFRS. Accounting is governed by the Law on Accounting and National Accounting Standards (BHMS) set by the Ministry of Finance. IFRS has been mandatory for joint-stock companies, commercial banks, insurers, large taxpayers and state-owned enterprises since 1 January 2021 (Resolution PP-4611). Resolution PP-282 links mandatory IFRS to Public Interest Entity status, with an electronic PIE register from 1 January 2026.

The IFRS Foundation supervises and funds the International Accounting Standards Board (IASB), which alone issues IFRS Accounting Standards. Neither can enforce compliance — countries adopt the standards into their own law. IFRS 18 describes the role of the primary financial statements: structured summaries of recognised assets, liabilities, equity, income, expenses and cash flows that give an overview, allow comparison between entities and periods, and point users to the notes.`,
    key_formulas: `Primary users of financial statements: existing and potential investors, lenders and other creditors.

Who does what: IFRS Foundation = supervisory body (develops, promotes and converges standards); IASB (the Board) = issues IFRS Accounting Standards; IFRS Interpretations Committee = interpretations.

Five accounting models: Anglo-American · Continental European · Latin American · Islamic · International (IFRS).

Uzbekistan: Law on Accounting + National Accounting Standards (BHMS); IFRS mandatory for JSCs, banks, insurers, large taxpayers and SOEs from 1 January 2021 (PP-4611); PIE register from 1 January 2026 (PP-282).

Exam format (ACCA FR style): Section A — 15 objective-test questions × 2 marks; Section B — 3 case scenarios × 5 questions × 2 marks; Section C — 2 constructed-response questions × 20 marks. In-class test covers Lectures 1–5; final exam covers Lectures 1–11.`,
    worked_example: `Workshop 0: ABC Ltd, year ended 31 March 20X1 (all figures $000). Trial balance extract: revenue 5,300; cost of sales 1,350; dividends received 210; administration expenses 490; distribution costs 370; interest paid 190; dividends paid 390; retained earnings at 31 March 20X0 1,163. Tax for the year is estimated at 470. A final dividend of 270 was declared on 3 April 20X1.

Statement of profit or loss:
Revenue 5,300 − cost of sales 1,350 = gross profit 3,950
+ dividends received 210 − distribution costs 370 − administration expenses 490 = operating profit 3,300
− finance costs 190 = profit before tax 3,110
− income tax 470 = profit for the year 2,640

Retained earnings: 1,163 + 2,640 − dividends paid 390 = 3,413 at 31 March 20X1.

The final dividend of 270 was declared after the year end, so it is not a liability at 31 March 20X1 — it is disclosed in the notes and recorded next year (IAS 10).`,
    materials: [
      { type: "slides", title: "Lecture 0 – Introduction (slides)", file: "TW 0/Lecture 0. Introduction-2.pdf", upload: "L6_FinancialReporting_TW0_Lecture.pdf" },
      { type: "pdf", title: "Seminar 0 – IFRS Foundation, going concern, manipulation cases", file: "TW 0/Seminar 0.pdf", upload: "L6_FinancialReporting_TW0_Seminar.pdf" },
      { type: "pdf", title: "Workshop 0 – ABC Ltd financial statements", file: "TW 0/Workshop 0.pdf", upload: "L6_FinancialReporting_TW0_Workshop.pdf" },
      { type: "link", title: "IFRS Foundation – Who we are", external_url: "https://www.ifrs.org/about-us/who-we-are/" },
    ],
    quiz: {
      title: "Introduction quiz",
      questions: [
        {
          type: "single",
          prompt: "Which body is solely responsible for issuing IFRS Accounting Standards?",
          explanation: "The International Accounting Standards Board (IASB, 'the Board') issues the standards. The IFRS Foundation is the supervisory body that oversees and funds the Board; the Interpretations Committee issues interpretations; the Advisory Council gives advice.",
          options: [
            { text: "The International Accounting Standards Board (IASB)", correct: true },
            { text: "The IFRS Foundation", correct: false },
            { text: "The IFRS Interpretations Committee", correct: false },
            { text: "The IFRS Advisory Council", correct: false },
          ],
        },
        {
          type: "true_false",
          prompt: "The IFRS Foundation and the IASB have the legal power to enforce compliance with IFRS Accounting Standards.",
          explanation: "False. Neither the Foundation, the Board nor the accountancy profession can enforce compliance. Countries adopt the standards into their own law or align national standards with them; the standards carry persuasive force, not legal force.",
          options: [{ text: "True", correct: false }, { text: "False", correct: true }],
        },
        {
          type: "single",
          prompt: "In the Anglo-American (British-American) accounting model, financial statements are primarily prepared for which group?",
          explanation: "Companies in English-speaking countries are mainly funded by shareholders, so the statements are prepared for them. In the Continental European model, bank financing means statements serve creditors and the tax authorities.",
          options: [
            { text: "Shareholders", correct: true },
            { text: "Tax authorities", correct: false },
            { text: "Banks", correct: false },
            { text: "The government", correct: false },
          ],
        },
        {
          type: "multiple",
          prompt: "Under Presidential Resolution PP-4611, for which entities in Uzbekistan has IFRS been mandatory since 1 January 2021? Choose all that apply.",
          explanation: "IFRS became mandatory for joint-stock companies, commercial banks, insurance organisations, large taxpayers and state-owned enterprises. Other companies may adopt IFRS voluntarily.",
          options: [
            { text: "Joint-stock companies", correct: true },
            { text: "Commercial banks", correct: true },
            { text: "Insurance organisations", correct: true },
            { text: "All small businesses", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "IFRS Accounting Standards are required or permitted in jurisdictions representing roughly what share of world GDP?",
          explanation: "Over 140 jurisdictions require or permit IFRS; together they represent over 97% of the world's GDP.",
          options: [
            { text: "About 97%", correct: true },
            { text: "About 75%", correct: false },
            { text: "About 50%", correct: false },
            { text: "About 25%", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Workshop 0 — ABC Ltd ($000): revenue 5,300; cost of sales 1,350; dividends received 210; administration 490; distribution 370; interest paid 190; tax 470. What is the profit for the year, in $000?",
          explanation: "5,300 − 1,350 = 3,950 gross profit; + 210 − 490 − 370 = 3,300 operating profit; − 190 = 3,110 before tax; − 470 = 2,640 profit for the year. The dividend paid (390) goes through retained earnings, not profit.",
          numeric_answer: 2640,
          tolerance: 1,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "According to the Conceptual Framework, who are the primary users that general purpose financial statements are designed for?",
          explanation: "The objective of financial reporting is to provide information useful to existing and potential investors, lenders and other creditors in deciding whether to provide resources to the entity.",
          options: [
            { text: "Existing and potential investors, lenders and other creditors", correct: true },
            { text: "Management and employees", correct: false },
            { text: "Tax authorities and regulators", correct: false },
            { text: "Customers and suppliers", correct: false },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------- TW 1
  {
    slug: "conceptual-framework-ifrs-18-ias-8",
    title: "Conceptual Framework, presentation (IAS 1 / IFRS 18) and IAS 8",
    sort_order: 2,
    summary: `Two frameworks govern financial statements. The regulatory framework is the system of company law, exchange rules and standards that makes reporting compulsory. The conceptual framework is the coherent set of objectives and principles that the standards are built on. IFRS takes a principles-based approach (judgement within agreed principles) rather than the rules-based 'cookbook' approach of US GAAP.

The IASB's Conceptual Framework has eight chapters: objective, qualitative characteristics, financial statements and the reporting entity, elements, recognition and derecognition, measurement, presentation and disclosure, and capital maintenance. The objective is to provide financial information useful to investors, lenders and other creditors. Useful information has two fundamental qualitative characteristics — relevance (including materiality) and faithful representation (complete, neutral, free from error) — and four enhancing ones: comparability, verifiability, timeliness and understandability. Statements rest on the accrual basis and the going concern assumption.

The elements are assets (a present economic resource controlled as a result of past events), liabilities (a present obligation to transfer an economic resource), equity (the residual), income and expenses. An element is recognised when it meets the definition and recognition gives relevant, faithfully represented information. Four measurement bases exist: historical cost, current cost, fair value and value in use.

IFRS 18 replaces IAS 1 for periods beginning on or after 1 January 2027. It keeps the current/non-current split in the statement of financial position, introduces profit or loss categories (operating, investing, financing, income taxes, discontinued operations) and two mandatory subtotals (operating profit; profit before financing and income taxes), and keeps other comprehensive income for items such as revaluation gains and FVOCI changes.

IAS 8 separates three things. A change in accounting policy (recognition, presentation or measurement basis) is applied retrospectively: comparatives are restated and opening retained earnings adjusted. A change in accounting estimate (useful lives, depreciation method, provisions) is applied prospectively. A prior period error — a mistake that could have been avoided with information available at the time — is corrected retrospectively as if it had never happened.`,
    key_formulas: `Fundamental qualitative characteristics: relevance (predictive and confirmatory value; materiality) and faithful representation (complete, neutral, free from error). Enhancing: comparability, verifiability, timeliness, understandability.

Measurement bases: historical cost (what was paid); current cost (replacement cost today); fair value (market exit price); value in use (present value of future cash flows):
$$VIU = \\sum_{t=1}^{n} \\frac{CF_t}{(1+r)^t}$$

IAS 8 treatment:
• change in accounting policy → retrospective (restate comparatives, adjust opening retained earnings)
• change in accounting estimate → prospective (current and future periods)
• prior period error → retrospective (restate as if the error never occurred)

IFRS 18 profit or loss categories: operating · investing · financing · income taxes · discontinued operations. Mandatory subtotals: operating profit; profit before financing and income taxes.`,
    worked_example: `Measurement bases (Lecture 1). An asset cost $100,000 and has accumulated depreciation of $60,000. Replacing it today would cost $130,000; it could be sold for $50,000; it is expected to generate $15,000 a year for 4 years and the discount rate is 10%.

Carrying amount (historical cost): 100,000 − 60,000 = 40,000
Current cost: 130,000
Fair value: 50,000
Value in use: 15,000 × 3.1699 (4-year annuity factor at 10%) = 47,548

Prior period error (Seminar 1, Task 4). Inventory at 31 December 20X0 included $2.5m of goods that had already been sold. Reported 20X0: sales 48,300, cost of sales 30,200, tax 4,300, profit 13,800 ($000). Reported 20X1: sales 52,100, cost of sales 33,500 (includes the error in opening inventory), tax 4,600, profit 14,000. Retained earnings at 1 January 20X0 were 11,200.

Restated 20X0: cost of sales 32,700, profit 11,300 (13,800 − 2,500).
Corrected 20X1: cost of sales 31,000, profit 16,500 (14,000 + 2,500).
Retained earnings: 1 January 20X0 11,200 → 31 December 20X0 restated 22,500 → 31 December 20X1 39,000. The comparative column and the opening balance are restated; nothing is dumped into the current year's profit.`,
    materials: [
      { type: "slides", title: "Lecture 1 – Conceptual Framework, IAS 1, IAS 8, IFRS 18 (slides)", file: "TW 1/Lecture 1. Conceptual Framework. IAS 1. IAS 8. IFRS 18.pdf", upload: "L6_FinancialReporting_TW1_Lecture.pdf" },
      { type: "pdf", title: "Seminar 1 – Framework, measurement and IAS 8 questions", file: "TW 1/Seminar 1.pdf", upload: "L6_FinancialReporting_TW1_Seminar.pdf" },
      { type: "pdf", title: "Workshop 1 – Arran financial statements", file: "TW 1/Workshop 1.pdf", upload: "L6_FinancialReporting_TW1_Workshop.pdf" },
      { type: "notes", title: "Reading", body: "Kaplan Study Text: chapters 1, 6, 7 and 8 (IAS 8)." },
    ],
    quiz: {
      title: "Framework and IAS 8 quiz",
      questions: [
        {
          type: "multiple",
          prompt: "Which of the following are FUNDAMENTAL qualitative characteristics in the Conceptual Framework? Choose all that apply.",
          explanation: "Relevance and faithful representation are the two fundamental characteristics. Comparability, verifiability, timeliness and understandability are enhancing characteristics.",
          options: [
            { text: "Relevance", correct: true },
            { text: "Faithful representation", correct: true },
            { text: "Comparability", correct: false },
            { text: "Timeliness", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "An entity changes the depreciation method for its vehicles from reducing balance to straight line. Under IAS 8 this is:",
          explanation: "A change in depreciation method is a change in accounting estimate (it reflects a changed expectation of how benefits are consumed) and is applied prospectively. A change in the measurement basis or cost formula would be a change in policy.",
          options: [
            { text: "A change in accounting estimate, applied prospectively", correct: true },
            { text: "A change in accounting policy, applied retrospectively", correct: false },
            { text: "A prior period error, corrected retrospectively", correct: false },
            { text: "Not permitted by IAS 8", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "An entity switches its inventory cost formula from weighted average to FIFO. How is this treated?",
          explanation: "A change in cost formula is a change in the measurement basis, so it is a change in accounting policy: apply retrospectively, restate the comparative figures and adjust the opening balance of retained earnings.",
          options: [
            { text: "Change in accounting policy — restate comparatives and opening retained earnings", correct: true },
            { text: "Change in estimate — adjust the current year only", correct: false },
            { text: "Prior period error — restate and disclose as an error", correct: false },
            { text: "Disclose in the notes with no adjustment", correct: false },
          ],
        },
        {
          type: "true_false",
          prompt: "A material prior period error is corrected by including the whole adjustment in the current period's statement of profit or loss.",
          explanation: "False. Prior period errors are corrected retrospectively: the comparative amounts and the opening balance of retained earnings are restated as though the error had never occurred.",
          options: [{ text: "True", correct: false }, { text: "False", correct: true }],
        },
        {
          type: "numeric",
          prompt: "An asset is expected to generate $15,000 a year for 4 years. The discount rate is 10% (4-year annuity factor 3.1699). What is its value in use, to the nearest dollar?",
          explanation: "Value in use is the present value of the future cash flows: 15,000 × 3.1699 = 47,548.",
          numeric_answer: 47548,
          tolerance: 60,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "Under the current structure of regulatory bodies, which acts as the overall supervisory body?",
          explanation: "The IFRS Foundation supervises the IASB and the Interpretations Committee, and is responsible for funding and governance. (Seminar 1, Test your understanding 1.)",
          options: [
            { text: "The IFRS Foundation", correct: true },
            { text: "The International Accounting Standards Board", correct: false },
            { text: "The IFRS Interpretations Committee", correct: false },
            { text: "The IFRS Advisory Council", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "IFRS 18 Presentation and Disclosure in Financial Statements replaces IAS 1 for annual periods beginning on or after:",
          explanation: "IFRS 18 is effective for annual reporting periods beginning on or after 1 January 2027, with earlier application permitted.",
          options: [
            { text: "1 January 2027", correct: true },
            { text: "1 January 2025", correct: false },
            { text: "1 January 2026", correct: false },
            { text: "1 January 2028", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Seminar 1, Task 4: 20X0 profit was reported as $13,800k, but closing inventory at 31 December 20X0 was overstated by $2,500k. What is the restated 20X0 profit, in $000?",
          explanation: "Overstated closing inventory understates cost of sales, so 20X0 cost of sales rises by 2,500 and profit falls to 13,800 − 2,500 = 11,300. The 20X1 figures move the other way (+2,500).",
          numeric_answer: 11300,
          tolerance: 1,
          tolerance_type: "absolute",
        },
      ],
    },
  },

  // ---------------------------------------------------------------- TW 2
  {
    slug: "tangible-non-current-assets-and-government-grants",
    title: "Tangible non-current assets (IAS 16, IAS 23, IAS 40) and government grants (IAS 20)",
    sort_order: 3,
    summary: `IAS 16 covers property, plant and equipment — tangible items held for use in the business for more than one period. An item is recognised when future economic benefits are probable and cost can be measured reliably. Initial cost is the purchase price plus directly attributable costs (site preparation, delivery, installation, professional fees, borrowing costs on qualifying assets) plus the present value of any dismantling obligation. Training, administration, marketing and abnormal waste are expensed. Later spending is capitalised only if it enhances the asset, is a required overhaul or inspection, or replaces a component of a complex asset.

Depreciation allocates the depreciable amount (cost less residual value) over the useful life, starting when the asset is available for use and continuing while it is idle. Methods include straight line, reducing balance and units of production; revenue-based depreciation is not allowed. Useful life, residual value and method are reviewed every year and any change is a change in estimate (prospective). Land is normally not depreciated.

After recognition an entity chooses the cost model or the revaluation model for a whole class of assets. Revaluation gains go to other comprehensive income (revaluation surplus) unless they reverse a loss previously charged to profit or loss; revaluation losses go to profit or loss unless a surplus exists for that asset. On disposal, the gain or loss is proceeds less carrying amount, and any related revaluation surplus is transferred to retained earnings.

IAS 23 requires borrowing costs directly attributable to a qualifying asset (one that takes a substantial time to get ready) to be capitalised during construction: the actual interest on specific loans less income from temporarily investing them, or the weighted average rate of general borrowings. Capitalisation starts when expenditure, interest and construction activity are all under way, pauses during long suspensions and stops when the asset is substantially complete.

IAS 40 investment property is land or buildings held to earn rentals or for capital appreciation. Under the fair value model it is revalued each year with gains and losses in profit or loss and no depreciation. IAS 20 government grants related to assets are either deferred income released over the asset's life or deducted from the asset's cost; grants related to income are credited to profit or loss or netted against the expense. Grants that become repayable are treated as a change in estimate.`,
    key_formulas: `Initial cost = purchase price + directly attributable costs + present value of dismantling costs

Depreciable amount = cost − residual value

Straight line: $\\text{depreciation} = \\dfrac{\\text{cost} - \\text{residual value}}{\\text{useful life}}$ · Reducing balance: depreciation = rate × opening carrying amount

Revaluation: gain → OCI (revaluation surplus), unless it reverses a previous loss in profit or loss; loss → profit or loss, unless a surplus exists for that asset.

Gain or loss on disposal = net proceeds − carrying amount (and transfer any revaluation surplus to retained earnings).

Borrowing costs capitalised (specific loan) = interest during construction − income from temporary investment of the loan
General borrowings: weighted average rate $= \\dfrac{\\sum(\\text{loan} \\times \\text{rate})}{\\sum \\text{loans}}$, applied to the expenditure financed.

IAS 40 fair value model: revalue each year, changes in profit or loss, no depreciation.
IAS 20 capital grants: deferred income released over the asset's life, or deducted from the asset's cost.`,
    worked_example: `Borrowing costs (Seminar 2, Test your understanding 6). Wilson received an $18m 5% loan on 1 January 20X8 to build a factory. $6m not needed immediately was invested in 2% bonds until 31 May 20X8. Construction ran from 1 March to 31 December 20X8.

Interest on the loan during construction: 18,000,000 × 5% × 10/12 = 750,000
Less investment income earned during construction (1 March – 31 May): 6,000,000 × 2% × 3/12 = 30,000
Borrowing costs capitalised = 720,000

Interest for January–February (before construction started) is expensed, and the investment income for those months is finance income — neither touches the asset.

Change in useful life (Lecture 2). An asset cost $20,000 on 1 January 20X3 and was depreciated straight line over 4 years ($5,000 a year). On 1 January 20X5 the remaining life was reassessed at 4 years. Carrying amount at that date: 20,000 − 2 × 5,000 = 10,000. New charge: 10,000 ÷ 4 = $2,500 a year from 20X5 — applied prospectively, no restatement of earlier years.`,
    materials: [
      { type: "slides", title: "Lecture 2 – IAS 16, IAS 23, IAS 40, IAS 20 (slides)", file: "TW 2/Lecture 2. Tangible non-current assets IAS16, 23, 40. Goverment grants IAS 20.pdf", upload: "L6_FinancialReporting_TW2_Lecture.pdf" },
      { type: "pdf", title: "Seminar 2 – PPE, borrowing costs, investment property and grants questions", file: "TW 2/Seminar 2.pdf", upload: "L6_FinancialReporting_TW2_Seminar.pdf" },
      { type: "pdf", title: "Workshop 2 – Keystone case and Mercedes-Benz annual report tasks", file: "TW 2/Workshop 2.pdf", upload: "L6_FinancialReporting_TW2_Workshop.pdf" },
      { type: "notes", title: "Reading", body: "Kaplan Study Text: chapter 2." },
    ],
    quiz: {
      title: "Non-current assets quiz",
      questions: [
        {
          type: "multiple",
          prompt: "Which of the following are included in the initial cost of an item of property, plant and equipment? Choose all that apply.",
          explanation: "Directly attributable costs of bringing the asset to working condition — site preparation, installation, professional fees — and the present value of dismantling costs are capitalised. Staff training and general administration overheads are expensed as incurred.",
          options: [
            { text: "Site preparation and installation costs", correct: true },
            { text: "The present value of the obligation to dismantle the asset at the end of its life", correct: true },
            { text: "Training staff to operate the asset", correct: false },
            { text: "A share of general administration overheads", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "An asset cost $20,000 on 1 January 20X3 and was depreciated straight line over 4 years. On 1 January 20X5 the remaining useful life was revised to 4 years. What is the depreciation charge for the year ended 31 December 20X5, in dollars?",
          explanation: "Carrying amount at 1 January 20X5 = 20,000 − 2 × 5,000 = 10,000. Spread over the new remaining life: 10,000 ÷ 4 = 2,500. The change in estimate is applied prospectively.",
          numeric_answer: 2500,
          tolerance: 1,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "Under the revaluation model, a revaluation gain that does not reverse a previous loss is recognised in:",
          explanation: "Revaluation gains are recognised in other comprehensive income and accumulated in the revaluation surplus within equity. Only a gain that reverses a loss previously charged to profit or loss goes through profit or loss.",
          options: [
            { text: "Other comprehensive income (revaluation surplus)", correct: true },
            { text: "Profit or loss as other income", correct: false },
            { text: "Retained earnings directly", correct: false },
            { text: "It is not recognised until the asset is sold", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Wilson received an $18m 5% loan on 1 January 20X8 and invested $6m of it in 2% bonds until 31 May 20X8. Construction of the factory ran from 1 March to 31 December 20X8. How much interest is capitalised, in dollars?",
          explanation: "Loan interest during construction: 18m × 5% × 10/12 = 750,000. Less investment income during construction (March–May): 6m × 2% × 3/12 = 30,000. Capitalised: 720,000.",
          numeric_answer: 720000,
          tolerance: 1000,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "An investment property is carried under the IAS 40 fair value model. Where is a change in its fair value recognised, and is it depreciated?",
          explanation: "Under the fair value model the property is revalued each year, gains and losses go directly to profit or loss (not OCI), and no depreciation is charged.",
          options: [
            { text: "In profit or loss; no depreciation is charged", correct: true },
            { text: "In other comprehensive income; depreciation continues", correct: false },
            { text: "In profit or loss; depreciation continues", correct: false },
            { text: "In equity directly; no depreciation is charged", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "A property was bought 15 years ago for $100,000 and depreciated at 2% a year straight line. It has now been revalued to $500,000. What revaluation surplus is recorded?",
          explanation: "Carrying amount = 100,000 − 15 × 2,000 = 70,000. Surplus = 500,000 − 70,000 = 430,000. (Seminar 2, Test your understanding 11, question 1.)",
          options: [
            { text: "$430,000", correct: true },
            { text: "$400,000", correct: false },
            { text: "$500,000", correct: false },
            { text: "$530,000", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "An entity funds construction from general borrowings: a $10m 6% loan and a $6m 8% loan. $12m was spent on the facility, which was under construction all year. How much interest is capitalised, in dollars?",
          explanation: "Weighted average rate = (10m × 6% + 6m × 8%) ÷ 16m = (600,000 + 480,000) ÷ 16,000,000 = 6.75%. Capitalised: 12,000,000 × 6.75% = 810,000.",
          numeric_answer: 810000,
          tolerance: 1000,
          tolerance_type: "absolute",
        },
        {
          type: "true_false",
          prompt: "Depreciation of an item of plant stops while the plant is temporarily idle.",
          explanation: "False. Depreciation starts when the asset is available for use and continues even when it is idle, unless it is fully depreciated or classified as held for sale.",
          options: [{ text: "True", correct: false }, { text: "False", correct: true }],
        },
        {
          type: "single",
          prompt: "A grant of $15,000 is received towards equipment costing $100,000, depreciated at 20% straight line. Under the deferred income method, how much of the grant is released to profit or loss in year 1?",
          explanation: "The grant is released over the asset's life in line with depreciation: 15,000 × 20% = 3,000 a year, offsetting the 20,000 depreciation charge. The alternative netting-off method would depreciate a reduced cost of 85,000 instead.",
          options: [
            { text: "$3,000", correct: true },
            { text: "$15,000", correct: false },
            { text: "$20,000", correct: false },
            { text: "Nil until the conditions are met", correct: false },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------- TW 3
  {
    slug: "intangible-assets-and-impairment",
    title: "Intangible assets (IAS 38) and impairment of assets (IAS 36)",
    sort_order: 4,
    summary: `An intangible asset is an identifiable non-monetary asset without physical substance — licences, quotas, patents, copyrights, purchased brands and trademarks. 'Identifiable' means it is either separable (can be sold on its own) or arises from legal or contractual rights. It is recognised when future economic benefits are probable and cost can be measured reliably, initially at cost (purchase price plus directly attributable costs).

Internally generated goodwill, brands, mastheads, publishing titles and customer lists are never recognised, because their cost cannot be separated from the cost of running the business. Research expenditure is always expensed. Development expenditure is capitalised only when all the criteria are met: probable economic benefits, intention to complete, adequate resources, ability to use or sell, technical feasibility, and reliable measurement of cost — and the project is expected to be profitable. Expenditure already expensed is never reinstated.

An intangible with a finite life is amortised over that life, normally straight line to a zero residual value; one with an indefinite life is not amortised but is tested for impairment every year. The revaluation model is allowed only where an active market exists.

IAS 36 ensures assets are carried at no more than their recoverable amount — the higher of fair value less costs of disposal and value in use (the present value of the asset's future cash flows). An impairment loss (carrying amount less recoverable amount) is charged to profit or loss, except that it first reduces any revaluation surplus for the same asset through other comprehensive income. Indicators include falling market value, adverse technological or legal change, higher interest rates, damage, obsolescence and worse-than-expected performance. Goodwill, indefinite-life intangibles and intangibles not yet available for use are tested annually regardless of indicators.

Where an individual asset does not produce independent cash flows, the test is done on its cash-generating unit (CGU). A CGU impairment is allocated first to assets that are obviously damaged, then to goodwill, then pro rata to the remaining assets — without taking any asset below its own recoverable amount. Impairment reversals are recognised in profit or loss but cannot raise an asset above its depreciated historical cost, and impairment of goodwill is never reversed.`,
    key_formulas: `Recoverable amount = higher of (fair value less costs of disposal, value in use)

Impairment loss = carrying amount − recoverable amount (recognise when carrying amount > recoverable amount)

Amortisation (finite life): $\\text{amortisation} = \\dfrac{\\text{cost}}{\\text{useful life}}$ (zero residual value unless an active market exists)

Development cost criteria — capitalise only if ALL hold: probable future benefits · intention to complete · resources available · ability to use or sell · technical feasibility · expenditure measured reliably.

Never capitalise: research; internally generated goodwill, brands, mastheads, publishing titles, customer lists; training; advertising.

CGU impairment allocation order: (1) assets obviously damaged → (2) goodwill → (3) all other assets pro rata by carrying amount, never below an asset's own recoverable amount.

Annual impairment test regardless of indicators: goodwill, indefinite-life intangibles, intangibles not yet available for use. Goodwill impairment is never reversed.`,
    worked_example: `Impairment of a cash-generating unit (Seminar 3, Part 2, Test your understanding 3). On 1 January 20X8 Sebb Co's unit has carrying amounts ($m): goodwill 20, technology 5, brands 10, land 50, buildings 30, other net assets 40 — total 155. Its recoverable amount is 85, so the impairment loss is 70. The technology has completely failed (worthless) and the other net assets (inventory and receivables) are already at their recoverable amount.

Step 1 — damaged assets: technology written down 5 → 0. Loss remaining: 65.
Step 2 — goodwill: 20 → 0. Loss remaining: 45.
Step 3 — pro rata over brands 10, land 50 and buildings 30 (total 90), leaving out the other net assets:
brands 45 × 10/90 = 5 → carrying amount 5
land 45 × 50/90 = 25 → carrying amount 25
buildings 45 × 30/90 = 15 → carrying amount 15

Check: 0 + 0 + 5 + 25 + 15 + 40 = 85 = recoverable amount. The $70m loss goes to profit or loss.

Research and development (Seminar 3, Test your understanding 3, question 1). Cowper spent $20,000 on research and $40,000 developing a product that meets the IAS 38 criteria but will not be in commercial production until next year. The $20,000 is expensed; the $40,000 is capitalised and is not yet amortised, because amortisation starts only when the asset is available for use.`,
    materials: [
      { type: "slides", title: "Lecture 3 – IAS 38 and IAS 36 (slides)", file: "TW 3/Lecture 3. IAS 38 Intangible assets. IAS 36 Impairment of assets.pdf", upload: "L6_FinancialReporting_TW3_Lecture.pdf" },
      { type: "pdf", title: "Seminar 3 – Intangibles and impairment questions", file: "TW 3/Seminar 3.pdf", upload: "L6_FinancialReporting_TW3_Seminar.pdf" },
      { type: "pdf", title: "Workshop 3 – Darby case and L'Oréal annual report tasks", file: "TW 3/Workshop 3.pdf", upload: "L6_FinancialReporting_TW3_Workshop.pdf" },
      { type: "notes", title: "Reading", body: "Kaplan Study Text: chapters 3 and 4." },
    ],
    quiz: {
      title: "Intangibles and impairment quiz",
      questions: [
        {
          type: "single",
          prompt: "Cowper plc spent $20,000 on research and $40,000 on development that meets the IAS 38 criteria. Commercial production starts next year. How should the costs be treated for the year ended 31 December 20X0?",
          explanation: "Research is always expensed. Development meeting all the criteria is capitalised, but amortisation only begins when the asset is available for use — next year — so nothing is amortised yet.",
          options: [
            { text: "$40,000 capitalised and not yet amortised; $20,000 expensed", correct: true },
            { text: "$40,000 capitalised and amortised; $20,000 expensed", correct: false },
            { text: "$60,000 capitalised as an intangible asset", correct: false },
            { text: "$60,000 expensed to profit or loss", correct: false },
          ],
        },
        {
          type: "multiple",
          prompt: "Which TWO of the following could be recognised as intangible assets?",
          explanation: "Purchased brand names and licences/quotas are identifiable and have a measurable cost. Staff training is expensed, and internally generated brands can never be recognised.",
          options: [
            { text: "A purchased brand name", correct: true },
            { text: "Licences and quotas", correct: true },
            { text: "Training of staff", correct: false },
            { text: "An internally generated brand", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "Sam Co: Project A — $50,000 research this year. Project B — $80,000 capitalised last year plus $20,000 this year, now abandoned. Project C — $100,000 this year, meets the criteria. What are the adjustments at 31 December 20X6?",
          explanation: "A: expense 50,000. B: the project is abandoned, so the 80,000 previously capitalised is written off and this year's 20,000 is expensed — 100,000 to profit or loss. C: capitalise 100,000. Profit falls by 150,000; non-current assets rise by 100,000 net (−80,000 + 100,000... the new asset of 100,000 replaces the written-off 80,000, so relative to the trial balance the adjustment is +100,000 for C and −80,000 for B).",
          options: [
            { text: "Reduce profit by $150,000 and increase non-current assets by $100,000 (before writing off Project B's $80,000)", correct: true },
            { text: "Reduce profit by $70,000 and increase non-current assets by $100,000", correct: false },
            { text: "Reduce profit by $130,000 and increase non-current assets by $180,000", correct: false },
            { text: "Reduce profit by $150,000 and increase non-current assets by $20,000", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "Darby bought a 10-year patent for $500,000 on 1 January 20X5. At 31 December 20X5 it could be sold for $400,000 less $20,000 disposal costs, and its value in use is $480,000. What is the impairment loss?",
          explanation: "Carrying amount = 500,000 − 50,000 amortisation = 450,000. Recoverable amount = higher of 380,000 and 480,000 = 480,000, which exceeds the carrying amount — so no impairment. (Workshop 3, question 5.)",
          options: [
            { text: "Nil", correct: true },
            { text: "$20,000", correct: false },
            { text: "$30,000", correct: false },
            { text: "$70,000", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Three assets: A — carrying amount 100, value in use 80, fair value less costs to sell 90. B — 50, 60, 65. C — 40, 35, 30. What is the total impairment loss?",
          explanation: "Recoverable amount is the higher figure for each asset. A: 90 < 100 → loss 10. B: 65 > 50 → none. C: 35 < 40 → loss 5. Total 15. (Seminar 3, Part 2, Test your understanding 5.)",
          numeric_answer: 15,
          tolerance: 0,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "Finsbury's CGU has goodwill 25, intangibles 60, PPE 30, inventory 15 and receivables 10 ($m, total 140); its recoverable amount is 100. Inventory and receivables are already at recoverable amount. What is the carrying amount of the intangibles after the impairment?",
          explanation: "Loss = 140 − 100 = 40. Goodwill absorbs 25 first, leaving 15 to allocate pro rata between intangibles (60) and PPE (30): intangibles 15 × 60/90 = 10, so 60 − 10 = 50.",
          options: [
            { text: "$50m", correct: true },
            { text: "$45m", correct: false },
            { text: "$55m", correct: false },
            { text: "$60m", correct: false },
          ],
        },
        {
          type: "true_false",
          prompt: "An impairment loss recognised on goodwill may be reversed in a later period if the recoverable amount recovers.",
          explanation: "False. IAS 36 prohibits reversing an impairment loss on goodwill. Other assets' impairments can be reversed, but not above the depreciated historical cost.",
          options: [{ text: "True", correct: false }, { text: "False", correct: true }],
        },
        {
          type: "multiple",
          prompt: "Which TWO of the following could indicate that an asset may be impaired under IAS 36?",
          explanation: "Physical damage and a management plan to reorganise (which changes how the asset is used) are internal indicators. Falling interest rates and rising market values point the other way.",
          options: [
            { text: "Damage caused to the asset", correct: true },
            { text: "Management intention to reorganise the business", correct: true },
            { text: "A decrease in market interest rates", correct: false },
            { text: "An increase in the market value of the asset", correct: false },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------- TW 4
  {
    slug: "inventories-agriculture-held-for-sale",
    title: "Inventories (IAS 2), agriculture (IAS 41) and assets held for sale (IFRS 5)",
    sort_order: 5,
    summary: `IAS 2 measures inventories — goods for sale, work in progress and materials — at the lower of cost and net realisable value. Cost includes the purchase price (with import duties and transport, less trade discounts) and conversion costs: direct labour plus production overheads absorbed at the normal level of activity. Abnormal waste, storage, administrative overheads and selling costs are excluded ('WASS') and expensed. Net realisable value is the estimated selling price less costs to complete and costs to sell. Cost is assigned by FIFO or weighted average; LIFO is not allowed.

IAS 41 applies to agricultural activity: biological assets (living animals and plants) are measured at fair value less costs to sell, with changes recognised in profit or loss; agricultural produce is measured at fair value less costs to sell at the point of harvest and then becomes inventory under IAS 2. Bearer plants such as grape vines and tea bushes are accounted for as PPE under IAS 16, but the produce growing on them falls under IAS 41.

IFRS 5 deals with non-current assets held for sale and discontinued operations. An asset is classified as held for sale when its carrying amount will be recovered mainly through sale: it must be available for immediate sale in its present condition, the sale must be highly probable, expected within one year, and the plan unlikely to be withdrawn. Such assets are measured at the lower of carrying amount and fair value less costs to sell, are no longer depreciated, and are presented separately under current assets. Assets previously revalued are revalued once more under IAS 16 or IAS 40 before reclassification.

A discontinued operation is a component that has been disposed of or is held for sale and represents a separate major line of business or geographical area, is part of a single plan to dispose of such a line, or is a subsidiary acquired only to resell. Its post-tax result (including any gain or loss on remeasurement or disposal) is shown as a single line on the face of the statement of profit or loss, with an analysis of revenue, expenses, pre-tax result and tax in the notes, so users can see the performance of the continuing business.`,
    key_formulas: `Inventory = lower of cost and net realisable value (NRV)
NRV = estimated selling price − costs to complete − costs to sell

Cost = purchase cost + conversion cost (direct labour + production overheads at normal activity level)
Excluded ('WASS'): abnormal Waste · Abnormal labour · Storage · Selling costs (and administrative overheads)

Overhead per unit $= \\dfrac{\\text{fixed production overheads}}{\\text{normal output}}$ — under-absorption from abnormally low output is expensed

IAS 41: biological asset = fair value − costs to sell; change in the year → profit or loss. Produce at harvest = fair value − costs to sell, then IAS 2.

IFRS 5: held-for-sale asset = lower of carrying amount and fair value less costs to sell; no further depreciation; shown separately in current assets.
Criteria: available for immediate sale · sale highly probable · expected within 12 months · plan unlikely to be withdrawn.
Discontinued operation: a single post-tax amount on the face of profit or loss, analysed in the notes.`,
    worked_example: `Asset held for sale (Seminar 4, Test your understanding 1). Michelle Co bought a machine for $20,000 on 1 January 20X1, useful life 10 years, no residual value. On 30 September 20X3 it decided to sell the machine, which is in short supply and expected to sell quickly. Market value $13,500; dismantling to hand it over will cost $500.

Carrying amount at 30 September 20X3: 20,000 − 2.75 years × 2,000 = 14,500
Fair value less costs to sell: 13,500 − 500 = 13,000
The asset is classified as held for sale at the lower amount, 13,000, giving an impairment of 1,500 in profit or loss. No depreciation is charged after classification, so it is still 13,000 at 31 December 20X3, shown separately under current assets.

Inventory valuation (Seminar 4, Part 2, Test your understanding 3, question 5). Raw material $1 and direct labour $0.50 per unit. Production overheads of $60,000 were incurred; only 8,000 units were produced against a normal level of 10,000 because 2,000 units were scrapped after a machine fault. Closing inventory is 700 units.

Overhead is absorbed at the normal level: 60,000 ÷ 10,000 = $6 per unit. Cost per unit = 1 + 0.50 + 6 = $7.50. Closing inventory = 700 × 7.50 = $5,250. The under-absorbed overhead and the abnormal waste are expensed in the period.`,
    materials: [
      { type: "slides", title: "Lecture 4 – IAS 2, IAS 41, IFRS 5 (slides)", file: "TW 4/Lecture 4  IFRS 5 Non-current assets held for sale. IAS IAS 2, IAS 41.pdf", upload: "L6_FinancialReporting_TW4_Lecture.pdf" },
      { type: "pdf", title: "Seminar 4 – Held for sale, discontinued operations, inventories and agriculture questions", file: "TW 4/Seminar 4.pdf", upload: "L6_FinancialReporting_TW4_Seminar.pdf" },
      { type: "pdf", title: "Workshop 4 – Radar case and Volkswagen inventory tasks", file: "TW 4/Workshop 4.pdf", upload: "L6_FinancialReporting_TW4_Workshop.pdf" },
      { type: "notes", title: "Reading", body: "Kaplan Study Text: chapters 5 and 8." },
    ],
    quiz: {
      title: "Inventories, agriculture and IFRS 5 quiz",
      questions: [
        {
          type: "multiple",
          prompt: "Which of the following are EXCLUDED from the cost of inventory under IAS 2? Choose all that apply.",
          explanation: "Abnormal waste, storage costs (unless necessary in production), administrative overheads and selling costs are expensed as incurred. Import duties are part of the purchase cost.",
          options: [
            { text: "Abnormal waste of materials", correct: true },
            { text: "Storage costs of finished goods", correct: true },
            { text: "Selling costs and sales commissions", correct: true },
            { text: "Import duties on purchased materials", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Raw material $1 and labour $0.50 per unit. Production overheads were $60,000; 8,000 units were produced against a normal level of 10,000. Closing inventory is 700 units. What is its value, in dollars?",
          explanation: "Overhead per unit at normal activity = 60,000 ÷ 10,000 = 6. Cost per unit = 1 + 0.50 + 6 = 7.50. Closing inventory = 700 × 7.50 = 5,250.",
          numeric_answer: 5250,
          tolerance: 1,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "Which cost formula is NOT permitted by IAS 2?",
          explanation: "IAS 2 allows FIFO and weighted average cost (and specific identification for non-interchangeable items). LIFO is prohibited.",
          options: [
            { text: "Last in, first out (LIFO)", correct: true },
            { text: "First in, first out (FIFO)", correct: false },
            { text: "Weighted average cost", correct: false },
            { text: "Specific identification", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Michelle Co's machine (cost $20,000, 10-year life, bought 1 January 20X1) was classified as held for sale on 30 September 20X3 with a market value of $13,500 and $500 of costs to sell. At what amount is it shown at 31 December 20X3, in dollars?",
          explanation: "Carrying amount at classification = 20,000 − 2.75 × 2,000 = 14,500. Fair value less costs to sell = 13,000, which is lower, so the asset is written down to 13,000 and not depreciated afterwards.",
          numeric_answer: 13000,
          tolerance: 1,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "How should a non-current asset held for sale be measured under IFRS 5?",
          explanation: "At the lower of its carrying amount and fair value less costs to sell. It is not depreciated and is presented separately within current assets.",
          options: [
            { text: "Lower of carrying amount and fair value less costs to sell", correct: true },
            { text: "Lower of carrying amount and fair value", correct: false },
            { text: "Higher of carrying amount and fair value less costs to sell", correct: false },
            { text: "Fair value, with changes in other comprehensive income", correct: false },
          ],
        },
        {
          type: "multiple",
          prompt: "Which of the following are criteria for classifying an asset as held for sale? Choose all that apply.",
          explanation: "The asset must be available for immediate sale in its present condition, the sale must be highly probable and expected within one year, and the plan must be unlikely to change. Being a major line of business is a criterion for a discontinued operation, not for held-for-sale classification.",
          options: [
            { text: "The asset is available for immediate sale in its present condition", correct: true },
            { text: "The sale is highly probable", correct: true },
            { text: "The sale is expected to complete within one year", correct: true },
            { text: "The asset represents a separate major line of business", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "Jacs' one-year-old herd was recognised at $140,000 on 1 January 20X6. At 31 December 20X6 a two-year-old herd has a fair value of $170,000 and costs to sell of $5,000. What is the IAS 41 treatment?",
          explanation: "Biological assets are measured at fair value less costs to sell: 170,000 − 5,000 = 165,000. The gain of 25,000 is recognised in profit or loss, not OCI.",
          options: [
            { text: "Revalue to $165,000, gain of $25,000 in profit or loss", correct: true },
            { text: "Revalue to $165,000, gain of $25,000 in other comprehensive income", correct: false },
            { text: "Revalue to $170,000, gain of $30,000 in profit or loss", correct: false },
            { text: "Revalue to $170,000, gain of $30,000 in other comprehensive income", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "For a discontinued operation, which amount must appear on the face of the statement of profit or loss?",
          explanation: "A single amount: the post-tax profit or loss of the discontinued operation plus the post-tax gain or loss on remeasurement or disposal. Revenue, expenses and tax are analysed in the notes (or on the face if the entity chooses).",
          options: [
            { text: "A single post-tax figure for the discontinued operation", correct: true },
            { text: "Its revenue and gross profit", correct: false },
            { text: "Its operating profit only", correct: false },
            { text: "Nothing — it is disclosed only in the notes", correct: false },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------- TW 5
  {
    slug: "financial-instruments",
    title: "Financial instruments (IAS 32, IFRS 7, IFRS 9)",
    sort_order: 6,
    summary: `A financial instrument is any contract that creates a financial asset of one entity and a financial liability or equity instrument of another. Three standards apply: IAS 32 (presentation — liability versus equity, compound instruments), IFRS 7 (disclosure) and IFRS 9 (recognition, measurement, impairment and hedging).

Classification as liability or equity follows the substance of the contract. The critical feature of a liability is an obligation to transfer economic benefit, so redeemable preference shares with fixed dividends are liabilities, while ordinary shares and irredeemable preference shares are equity. Interest and dividends on liabilities are expenses; dividends on equity are debited to equity. A compound instrument such as a convertible bond is split at issue: the liability component is the present value of the cash flows discounted at the market rate for similar debt without conversion rights, and the equity component is the balance. The split is not revised later.

A financial asset or liability is recognised when the entity becomes party to the contract. IFRS 9 classifies financial assets by the business model and the contractual cash flow characteristics (the SPPI test). Debt held to collect contractual cash flows is measured at amortised cost; debt held to collect and sell at fair value through other comprehensive income; everything else, including all derivatives, at fair value through profit or loss. Equity investments are at FVTPL unless the entity makes an irrevocable election at initial recognition to use FVOCI for investments not held for trading — then only dividends reach profit or loss. Transaction costs are added to the initial amount except for FVTPL assets.

Amortised cost is applied with the effective interest method: opening balance plus effective interest less cash received or paid. Financial liabilities are also at amortised cost (or FVTPL). IFRS 9's impairment model provides for expected credit losses in advance: a 12-month allowance on recognition, replaced by lifetime expected losses if credit risk increases significantly. Factoring receivables with recourse is a secured loan; without recourse it is a sale and the receivables are derecognised.`,
    key_formulas: `Amortised cost roll-forward:
$$\\text{Closing} = \\text{Opening} + \\text{Opening} \\times r_{\\text{eff}} - \\text{cash paid or received}$$

Compound instrument at issue: liability = PV of interest and principal at the market rate for similar debt without the conversion option; equity = proceeds − liability.

Financial assets (IFRS 9): amortised cost (hold to collect, SPPI) · FVOCI (hold to collect and sell, or elected for equity not held for trading) · FVTPL (everything else; all derivatives).
Transaction costs: added to the initial amount, except FVTPL (expensed).

Expected credit losses: 12-month ECL on recognition; lifetime ECL if credit risk rises significantly. $\\text{ECL} = \\text{probability of default} \\times \\text{loss given default}$

Derecognition gain or loss = carrying amount − proceeds received or paid.
Factoring: with recourse = loan secured on receivables; without recourse = sale (derecognise).`,
    worked_example: `Convertible bonds (Lecture 5, Rathbone Co). 2,000 bonds of $1,000 issued at par at the start of 20X2, three-year term, 6% interest paid annually in arrears, each bond convertible into 250 shares. The market rate for similar debt without conversion rights is 9%.

Present value of the principal: 2,000,000 × 0.772183 = 1,544,367
Present value of the interest: 120,000 × 2.5313 = 303,755
Liability component = 1,848,122
Equity component = 2,000,000 − 1,848,122 = 151,878

Amortised cost (Lecture 5, Bland). On 1 January 20X5 Bland bought a $10,000 6% bond for $9,000 plus $144 of acquisition costs, to be held until redemption at a premium of $500 on 31 December 20X7. Effective rate 11%.

Initial amount: 9,000 + 144 = 9,144
20X5: 9,144 + 11% × 9,144 (1,006) − 600 cash = 9,550
20X6: 9,550 + 1,050 − 600 = 10,000
20X7: 10,000 + 1,100 − 600 = 10,500, which is exactly the $10,500 redeemed (10,000 + 500 premium).

Interest income each year is the effective interest, not the 6% coupon.`,
    materials: [
      { type: "slides", title: "Lecture 5 – IAS 32, IFRS 7, IFRS 9 (slides)", file: "TW 5/Lecture 5. Financial assets and liabilities. IAS 32. IFRS 7. IFRS 9.pdf", upload: "L6_FinancialReporting_TW5_Lecture.pdf" },
      { type: "notes", title: "Workshop 5 – Epsilon and Delta emails (tasks)", body: `Task 1 — Epsilon Corporation, year ended 31 March 20X8.
1. Loan issued on 1 April 20X7: Epsilon lent $30 million. Annual interest $1.5 million in arrears; final repayment $35.3 million on 31 March 20X0 (sic — three years later); direct costs of $250,000 in arranging the loan; effective interest rate about 10%. Epsilon will hold the loan to maturity. Account for it at amortised cost using the effective interest rate.
2. Investment in Entity X: on 1 April 20X7 Epsilon bought 500,000 shares in a key supplier at $2 per share for strategic reasons (not trading). Direct acquisition costs $100,000; dividend of $0.30 per share received on 1 January 20X8; fair value $2.25 per share at 31 March 20X8. Classify as FVOCI (irrevocable election) unless indicators suggest otherwise.

Task 2 — Delta, year ended 30 September 20X3.
Delta bought 40 million $1 loan notes issued by Epsilon on 1 April 20X3 at $0.90 per note ($36 million). Redemption at $1.20 per note on 31 March 20X8; annual interest 4% of par ($1.6 million) in arrears on 31 March; effective rate 9.9%; held to maturity → amortised cost. For the six months to 30 September 20X3, interest income ≈ $36m × 9.9% × 6/12 = $1.782 million, added to the carrying amount (no cash received yet).

Required for each: explain and show the amounts in the draft financial statements.` },
      { type: "notes", title: "Seminar 5 and reading", body: "Seminar 5 is run as an in-class group quiz (links in the seminar sheet). Reading: Kaplan Study Text, chapter 12." },
    ],
    quiz: {
      title: "Financial instruments quiz",
      questions: [
        {
          type: "single",
          prompt: "Jess Co issues $100,000 6% preference shares redeemable on 1 January 20X6. How are they classified?",
          explanation: "They carry an obligation to pay a fixed dividend and to repay a fixed amount on a fixed date — an obligation to transfer economic benefit — so they are a financial liability, shown in non-current liabilities until within a year of redemption.",
          options: [
            { text: "A financial liability", correct: true },
            { text: "Equity, like ordinary shares", correct: false },
            { text: "A compound instrument split between liability and equity", correct: false },
            { text: "A financial asset", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Rathbone issues $2,000,000 of 6% three-year convertible bonds at par. The market rate for similar non-convertible debt is 9% (3-year discount factor 0.772183; annuity factor 2.5313). What is the equity component, in dollars?",
          explanation: "Liability = 2,000,000 × 0.772183 + 120,000 × 2.5313 = 1,544,367 + 303,755 = 1,848,122. Equity = 2,000,000 − 1,848,122 = 151,878.",
          numeric_answer: 151878,
          tolerance: 500,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "An equity investment that is not held for trading may be measured at fair value through other comprehensive income if:",
          explanation: "IFRS 9 allows an irrevocable election at initial recognition to present fair value changes of such equity investments in OCI. Only dividends then go to profit or loss, and the gains are never recycled.",
          options: [
            { text: "The entity makes an irrevocable election at initial recognition", correct: true },
            { text: "The investment is quoted on a stock exchange", correct: false },
            { text: "The entity owns more than 20% of the investee", correct: false },
            { text: "The shares pay a dividend every year", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Bland bought a $10,000 6% bond for $9,000 plus $144 of costs on 1 January 20X5; the effective rate is 11%. What is the carrying amount at 31 December 20X5, in dollars?",
          explanation: "Opening 9,144 + effective interest 11% × 9,144 = 1,006 − coupon received 600 = 9,550.",
          numeric_answer: 9550,
          tolerance: 5,
          tolerance_type: "absolute",
        },
        {
          type: "multiple",
          prompt: "Under IFRS 9, the classification of a financial asset depends on which TWO factors?",
          explanation: "Classification rests on the entity's business model for managing the assets and on the contractual cash flow characteristics (whether cash flows are solely payments of principal and interest).",
          options: [
            { text: "The entity's business model for managing the asset", correct: true },
            { text: "The contractual cash flow characteristics (the SPPI test)", correct: true },
            { text: "The entity's tax position", correct: false },
            { text: "The size of the investment", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "A company factors its receivables WITH recourse. How is the transaction treated?",
          explanation: "With recourse the business keeps the risk of irrecoverable debts, so the receivables stay on the statement of financial position and the cash advance is a loan secured on them. Without recourse it is a sale.",
          options: [
            { text: "As a loan secured on the receivables; the receivables are not derecognised", correct: true },
            { text: "As a sale; the receivables are derecognised", correct: false },
            { text: "As a disposal of a discontinued operation", correct: false },
            { text: "As revenue when the factor pays", correct: false },
          ],
        },
        {
          type: "true_false",
          prompt: "Derivatives such as forward contracts and options are always measured at fair value through profit or loss.",
          explanation: "True. Derivatives fail the SPPI test and are measured at FVTPL regardless of business model (unless designated in a hedge, which is outside FR).",
          options: [{ text: "True", correct: true }, { text: "False", correct: false }],
        },
        {
          type: "numeric",
          prompt: "Delta bought loan notes for $36 million on 1 April 20X3; the effective rate is 9.9% and they are held at amortised cost. What interest income is recognised for the six months to 30 September 20X3, in dollars?",
          explanation: "36,000,000 × 9.9% × 6/12 = 1,782,000. No cash has been received yet (interest is paid each 31 March), so the whole amount is added to the carrying amount.",
          numeric_answer: 1782000,
          tolerance: 1000,
          tolerance_type: "absolute",
        },
      ],
    },
  },

  // ---------------------------------------------------------------- TW 6
  {
    slug: "revenue-and-income-taxes",
    title: "Revenue (IFRS 15) and income taxes (IAS 12)",
    sort_order: 7,
    summary: `IFRS 15 recognises revenue when control of goods or services passes to the customer, using a five-step model. Step 1: identify the contract — approved, with identifiable rights and payment terms, commercial substance, and probable collection. Step 2: identify the separate performance obligations (a car plus a year's servicing is two). An agent recognises only its commission. Step 3: determine the transaction price — the consideration the entity expects, excluding amounts collected for third parties, estimating variable consideration (rebates, bonuses, rights of return), discounting for a significant financing component, and deducting consideration payable to the customer. Step 4: allocate the price to the obligations in proportion to stand-alone selling prices, spreading any bundle discount. Step 5: recognise revenue when (point in time: right to payment, legal title, possession, risks and rewards, acceptance) or as (over time: the customer consumes the benefit as performed, controls the asset being built, or the asset has no alternative use and the entity has a right to payment) each obligation is satisfied, measuring progress by output or input methods.

Special cases: consignment stock stays with the supplier until sold on; a sale with a repurchase right or obligation is a lease or a financing arrangement, not a sale; bill-and-hold revenue needs control to have passed. A contract liability arises when the customer pays first; a contract asset when revenue is earned before invoicing; a receivable once the right to payment is unconditional. A loss-making contract recognises the whole expected loss immediately.

IAS 12 covers current tax (the estimate for the year, with last year's under- or over-provision adjusted through this year's charge) and deferred tax, which matches the tax effect of transactions to the period they are reported in. Deferred tax is the temporary difference between an asset's or liability's carrying amount and its tax base, multiplied by the tax rate. Accelerated tax depreciation makes the tax base lower than the carrying amount and creates a deferred tax liability (less tax now, more later); expenses recognised now but deductible later, such as warranty provisions, create a deferred tax asset. Deferred tax on a revaluation gain is charged to other comprehensive income, following the gain.`,
    key_formulas: `Five steps: (1) contract → (2) performance obligations → (3) transaction price → (4) allocate by stand-alone selling prices → (5) recognise when/as satisfied.

Agent: revenue = commission only. Significant financing: revenue = PV of the consideration, then finance income unwinds: $PV = \\dfrac{\\text{amount due}}{(1+r)^n}$

Allocation of a bundle: each obligation gets price × (its stand-alone price ÷ total stand-alone prices).

Over time: revenue to date = % complete × total price − revenue previously recognised. Input method: % complete = costs to date ÷ total expected costs.
Contract asset (liability) = revenue recognised to date − amounts invoiced to date.
Expected loss on a contract → recognise the whole loss immediately.

Deferred tax = (carrying amount − tax base) × tax rate
Carrying amount > tax base (asset) → deferred tax liability · carrying amount < tax base (asset) → deferred tax asset
Tax charge for the year = current tax estimate ± prior-year under/over provision + movement in deferred tax.`,
    worked_example: `Significant financing component (Lecture 6, Keema Co). Furniture is delivered on 30 September 20X3 for $750,000 payable on 30 September 20X5. The customer's borrowing rate is 7%.

Revenue at 30 September 20X3 = 750,000 ÷ 1.07² = 655,079 (a receivable of the same amount)
Year to 30 September 20X4: finance income 7% × 655,079 = 45,856 → receivable 700,935
Year to 30 September 20X5: finance income 7% × 700,935 = 49,065 → receivable 750,000, settled in cash.

Allocating a bundle (Lecture 6, Shinji Co). A machine normally sold for $60,000 is sold with a year's support for $50,000. Support is not sold separately but similar services carry a 50% mark-up on an expected cost of $10,000, so its stand-alone price is $15,000. Total stand-alone prices: 75,000; the bundle discount is 25,000/75,000 = 33⅓%. Machine: 60,000 × 2/3 = 40,000, recognised on delivery. Support: 15,000 × 2/3 = 10,000, recognised over the year.

Deferred tax (Workshop 6, Epsilon). Development costs of $1.6m were capitalised and are amortised over five years from 1 January 20X4; the full $1.6m was tax-deductible in the year to 31 March 20X4. Tax rate 25%.
Carrying amount at 31 March 20X4: 1,600,000 − 3/60 × 1,600,000 = 1,520,000
Tax base: nil (already deducted)
Temporary difference: 1,520,000 → deferred tax liability 1,520,000 × 25% = 380,000.`,
    materials: [
      { type: "slides", title: "Lecture 6 – IFRS 15 and IAS 12 (slides)", file: "TW 6/Lecture 6. FRS 15. Revenue from the contracts with the customers. IAS 12. Income taxes.pdf", upload: "L6_FinancialReporting_TW6_Lecture.pdf" },
      { type: "notes", title: "Workshop 6 – Kappa and Epsilon emails (tasks)", body: `Task 1 — Kappa, year ended 30 September 20X5 (IFRS 15).
(i) On 1 September 20X5 Kappa sold a machine with two years' free servicing. The customer pays $800,000 by 31 December 20X5, $810,000 by 31 January 20X6 or $820,000 by 28 February 20X6; payment in January is highly probable. Stand-alone prices: machine $700,000, two years' servicing $140,000. Treat the alternative amounts as variable consideration.
(ii) On 20 September 20X5 Kappa sold 100 items at $2,000 each (cost $1,600) with a three-month right of return. Experience says 4% are returned.
Show how both are reported.

Task 2 — Epsilon, year ended 31 March 20X4 (IAS 12, tax rate 25%).
(i) Development costs of $1.6m capitalised, amortised over 5 years from 1 January 20X4, fully tax-deductible in the year: carrying amount 1,520,000, tax base nil → deferred tax liability 380,000.
(ii) $10m borrowed on 1 April 20X3 with $200,000 arrangement costs (tax-deductible immediately); repayable at $13,043,800 on 31 March 20X6 (effective rate 10%); the $3,043,800 is deductible on repayment. Carrying amount ≈ 11,000,000 (after one year's interest), tax base 9,800,000 → temporary difference 1,200,000 → deferred tax liability 300,000. Total 680,000.

Task 3 — Kappa, year ended 30 September 20X3. $200,000 received on 31 March 20X3 for services from 1 April 20X3 to 31 January 20X4; revenue of $120,000 recognised this year, $80,000 next year; the whole $200,000 was taxed this year. Show the contract liability and the deferred tax asset.

Task 4 — Epsilon, year ended 30 June 20X5 (tax rate 20%). (a) Machine bought 1 July 20X3 for $60m, 5-year life, tax deductions $30m, $15m, $15m: carrying amount 36m, tax base nil → deferred tax liability 7.2m. (b) $40m zero-coupon loan from 1 July 20X4 at an effective 10%, interest deductible only on repayment: carrying amount 44m, tax base 40m → deductible difference 4m → deferred tax asset 0.8m.` },
      { type: "notes", title: "Seminar 6 and reading", body: "Seminar 6 is run as in-class quizzes on IFRS 15 and IAS 12 (links in the seminar sheet). Reading: Kaplan Study Text, chapters 10 and 13." },
    ],
    quiz: {
      title: "Revenue and tax quiz",
      questions: [
        {
          type: "single",
          prompt: "Hadrian Co's revenue includes $45,000 of goods sold as agent for Offa; it earns 10% commission and remits $40,500 to Offa. What revenue should Hadrian report for these sales?",
          explanation: "An agent recognises only the commission it is entitled to: 10% × 45,000 = 4,500. The 40,500 is not cost of sales — it is simply passed on to the principal.",
          options: [
            { text: "$4,500", correct: true },
            { text: "$45,000", correct: false },
            { text: "$40,500", correct: false },
            { text: "Nil", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Keema delivers furniture on 30 September 20X3 for $750,000 payable two years later. The customer's borrowing rate is 7%. How much revenue is recognised on delivery, in dollars?",
          explanation: "The price contains a significant financing component, so revenue is the present value: 750,000 ÷ 1.07² = 655,079. The remaining 94,921 is finance income over the two years.",
          numeric_answer: 655079,
          tolerance: 200,
          tolerance_type: "absolute",
        },
        {
          type: "numeric",
          prompt: "Golden Gate agrees to pay a retail customer $1m to adapt its stores, against a commitment to buy at least $20m of products in 12 months. By the year end it has transferred $4m of products. How much revenue is recognised, in $ million?",
          explanation: "Consideration payable to a customer reduces the transaction price: 1/20 = 5% off every sale. Revenue = 4m × 95% = 3.8m.",
          numeric_answer: 3.8,
          tolerance: 0.01,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "Shinji sells a machine (stand-alone price $60,000) with a year's support (estimated stand-alone price $15,000) for $50,000 in total. How is the price allocated?",
          explanation: "Allocate in proportion to stand-alone prices: the bundle discount of 25,000/75,000 = one third applies to both. Machine 60,000 × 2/3 = 40,000; support 15,000 × 2/3 = 10,000.",
          options: [
            { text: "Machine $40,000; support $10,000", correct: true },
            { text: "Machine $50,000; support nil", correct: false },
            { text: "Machine $35,000; support $15,000", correct: false },
            { text: "Machine $45,000; support $5,000", correct: false },
          ],
        },
        {
          type: "multiple",
          prompt: "Under IFRS 15, revenue is recognised OVER TIME when which of the following apply? Choose all that apply.",
          explanation: "Any one of the three criteria is enough: the customer simultaneously receives and consumes the benefits; the entity's work creates or enhances an asset the customer controls; or the asset has no alternative use and the entity has an enforceable right to payment for work done. Contract length on its own is irrelevant.",
          options: [
            { text: "The customer simultaneously receives and consumes the benefits as the entity performs", correct: true },
            { text: "The entity's performance creates or enhances an asset that the customer controls", correct: true },
            { text: "The asset has no alternative use to the entity and the entity has an enforceable right to payment for work to date", correct: true },
            { text: "The contract lasts for more than one year", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "Ardglen sells maturing inventory (cost $1m) to a bank for $1.5m and has the option to repurchase it in eight years for $2.2m, keeping it in its own warehouse. How is this accounted for?",
          explanation: "A right to repurchase means the customer never obtains control. Because the repurchase price exceeds the selling price, it is a financing arrangement: the inventory stays on Ardglen's statement of financial position and the $1.5m is a loan.",
          options: [
            { text: "As a financing arrangement — no sale; the inventory remains an asset and the cash is a loan", correct: true },
            { text: "As a sale with a profit of $0.5m", correct: false },
            { text: "As a lease of the inventory to the bank", correct: false },
            { text: "As revenue of $1.5m with a provision for the repurchase", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "Epsilon capitalised $1.6m of development costs, amortised over five years from 1 January 20X4; the whole amount was tax-deductible in the year to 31 March 20X4. Tax rate 25%. What is the deferred tax liability at 31 March 20X4, in dollars?",
          explanation: "Carrying amount = 1,600,000 − 3 months' amortisation (80,000) = 1,520,000; tax base nil. Deferred tax liability = 1,520,000 × 25% = 380,000.",
          numeric_answer: 380000,
          tolerance: 100,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "Tax depreciation on a machine exceeds the accounting depreciation in the early years. This creates:",
          explanation: "The tax base falls faster than the carrying amount, so the carrying amount exceeds the tax base: a taxable temporary difference and a deferred tax liability — less tax now, more tax later.",
          options: [
            { text: "A deferred tax liability", correct: true },
            { text: "A deferred tax asset", correct: false },
            { text: "A permanent difference with no deferred tax", correct: false },
            { text: "An increase in current tax payable", correct: false },
          ],
        },
        {
          type: "single",
          prompt: "A customer pays $500 in advance for a training course that starts next month. At the year end this is presented as:",
          explanation: "Payment received before the service is transferred is a contract liability. It becomes revenue as the course is delivered.",
          options: [
            { text: "A contract liability", correct: true },
            { text: "A contract asset", correct: false },
            { text: "A receivable", correct: false },
            { text: "Revenue of $500", correct: false },
          ],
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// 4. Load Financial Reporting
// ---------------------------------------------------------------------------
const { data: frSubject } = await db.from("subjects").select("id").eq("level_id", levelId(6)).eq("slug", "financial-reporting").single();
if (!frSubject) fail("financial reporting", new Error("subject not found"));

const mime = (name) => (name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

for (const t of FR_TOPICS) {
  const { data: topic, error: topicError } = await db
    .from("topics")
    .upsert(
      {
        subject_id: frSubject.id,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        key_formulas: t.key_formulas,
        worked_example: t.worked_example,
        sort_order: t.sort_order,
        status: "published",
        author_id: authorId,
      },
      { onConflict: "subject_id,slug" },
    )
    .select("id")
    .single();
  if (topicError) fail(`topic ${t.slug}`, topicError);

  // Materials: rebuilt each run. Files are uploaded (or overwritten) in the private bucket.
  await db.from("materials").delete().eq("topic_id", topic.id);
  let uploaded = 0;
  for (const [i, m] of t.materials.entries()) {
    const row = { topic_id: topic.id, title: m.title, type: m.type, sort_order: i + 1, status: "published", author_id: authorId };
    if (m.file) {
      const source = join(FR_DIR, m.file);
      if (!existsSync(source)) {
        console.warn(`  ! missing file, skipped: ${m.file}`);
        continue;
      }
      const bytes = readFileSync(source);
      const path = `${topic.id}/${m.upload}`;
      const { error: upErr } = await db.storage.from("materials").upload(path, bytes, { contentType: mime(m.upload), upsert: true });
      if (upErr) fail(`upload ${m.upload}`, upErr);
      Object.assign(row, { storage_path: path, file_size: bytes.length, allow_download: true });
      uploaded += 1;
    } else if (m.external_url) {
      row.external_url = m.external_url;
    } else {
      row.body = m.body;
    }
    const { error: matErr } = await db.from("materials").insert(row);
    if (matErr) fail(`material ${m.title}`, matErr);
  }

  // Quiz: keep the quiz row (attempts point at it), rebuild the questions.
  let quiz = (await db.from("quizzes").select("id").eq("topic_id", topic.id).maybeSingle()).data;
  if (quiz) {
    await db.from("quizzes").update({ title: t.quiz.title, status: "published" }).eq("id", quiz.id);
    await db.from("questions").delete().eq("quiz_id", quiz.id);
  } else {
    const { data, error } = await db.from("quizzes").insert({ topic_id: topic.id, title: t.quiz.title, status: "published" }).select("id").single();
    if (error) fail(`quiz ${t.slug}`, error);
    quiz = data;
  }
  for (const [i, q] of t.quiz.questions.entries()) {
    const { data: question, error: qErr } = await db
      .from("questions")
      .insert({
        quiz_id: quiz.id,
        type: q.type,
        prompt: q.prompt,
        explanation: q.explanation,
        points: q.points ?? 1,
        numeric_answer: q.numeric_answer ?? null,
        tolerance: q.tolerance ?? null,
        tolerance_type: q.tolerance == null ? null : (q.tolerance_type ?? "absolute"),
        sort_order: i + 1,
      })
      .select("id")
      .single();
    if (qErr) fail(`question ${t.slug} #${i + 1}`, qErr);
    if (q.options) {
      const { error: oErr } = await db.from("question_options").insert(q.options.map((o, j) => ({ question_id: question.id, text: o.text, is_correct: o.correct, sort_order: j + 1 })));
      if (oErr) fail(`options ${t.slug} #${i + 1}`, oErr);
    }
  }
  console.log(`✓ FR ${t.sort_order - 1}  ${t.title} — ${t.quiz.questions.length} questions, ${uploaded} files`);
}

console.log("\nDone.");
