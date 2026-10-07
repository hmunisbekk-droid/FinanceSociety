// Development seed: test accounts, one sample subject with three real topics
// (NPV, IRR, WACC), their quizzes, and two events. Safe to run more than once.
//
//   npm run seed:dev
//
// Test accounts (development only — change or delete them before launch):
//   dev.student@example.com / FinanceDev2026!   student, Level 5
//   dev.editor@example.com  / FinanceDev2026!   content editor for Level 5 subjects
//   dev.admin@example.com   / FinanceDev2026!   admin
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const PASSWORD = "FinanceDev2026!";

function fail(step, error) {
  console.error(`${step}: ${error.message ?? error}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------
const { data: levels, error: levelsError } = await db.from("levels").select("id, number").order("number");
if (levelsError) fail("levels", levelsError);
const level5 = levels.find((l) => l.number === 5);
if (!level5) fail("levels", new Error("Level 5 not found — run `npm run db:push` first"));

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
async function ensureUser(email, fullName, programme, role) {
  const { data: existing } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
  let id = existing?.id;
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, programme, level_id: level5.id },
    });
    if (error) fail(`create ${email}`, error);
    id = data.user.id;
  }
  const { error } = await db.from("profiles").update({ role, full_name: fullName, programme, level_id: level5.id }).eq("id", id);
  if (error) fail(`role ${email}`, error);
  console.log(`✓ ${role.padEnd(7)} ${email}`);
  return id;
}

const studentId = await ensureUser("dev.student@example.com", "Dilnoza Karimova", "BSc Finance", "student");
const editorId = await ensureUser("dev.editor@example.com", "Jasur Rakhimov", "BSc Finance", "editor");
await ensureUser("dev.admin@example.com", "Admin Account", "BSc Finance", "admin");

// ---------------------------------------------------------------------------
// Subject: Level 5 · Module 1 becomes "Corporate Finance"
// ---------------------------------------------------------------------------
const SUBJECT = {
  level_id: level5.id,
  name: "Corporate Finance",
  slug: "corporate-finance",
  description: "How companies choose investments and finance them: investment appraisal, cost of capital, capital structure and dividend policy.",
  sort_order: 1,
  status: "published",
};

// Reuse the row from a previous run, otherwise rename the blank "Module 1", otherwise insert.
let subject = (await db.from("subjects").select("id").eq("level_id", level5.id).eq("slug", SUBJECT.slug).maybeSingle()).data;
if (!subject) {
  subject = (await db.from("subjects").select("id").eq("level_id", level5.id).eq("slug", "module-1").maybeSingle()).data;
}
if (subject) {
  const { error } = await db.from("subjects").update(SUBJECT).eq("id", subject.id);
  if (error) fail("subject", error);
} else {
  const { data, error } = await db.from("subjects").insert(SUBJECT).select("id").single();
  if (error) fail("subject", error);
  subject = data;
}
console.log("✓ subject  Corporate Finance");

await db.from("editor_subjects").upsert({ user_id: editorId, subject_id: subject.id }, { onConflict: "user_id,subject_id" });

// ---------------------------------------------------------------------------
// Topics with quizzes
// ---------------------------------------------------------------------------
const TOPICS = [
  {
    slug: "net-present-value",
    title: "Net Present Value (NPV)",
    sort_order: 1,
    summary:
      "Net present value tells you how much richer a project makes the company today. You forecast the cash the project will bring in each year, discount every amount back to today's money using the company's required rate of return, and subtract what the project costs now.\n\nA positive NPV means the project earns more than the required return, so it creates value and should be accepted. A negative NPV destroys value. NPV is the preferred appraisal method because it measures value in money, uses all cash flows, and respects the time value of money.",
    key_formulas: String.raw`$$NPV = \sum_{t=1}^{n} \frac{CF_t}{(1+r)^t} - C_0$$

$CF_t$ = cash flow in year $t$ · $r$ = discount rate (required return) · $C_0$ = initial investment

Discount factor for year $t$: $DF_t = \dfrac{1}{(1+r)^t}$`,
    worked_example:
      "A machine costs 10,000 today and brings in 4,000 a year for three years. The required return is 10%.\n\nYear 1: 4,000 / 1.10 = 3,636.36\nYear 2: 4,000 / 1.10² = 3,305.79\nYear 3: 4,000 / 1.10³ = 3,005.26\n\nTotal present value of inflows = 9,947.41\nNPV = 9,947.41 − 10,000 = −52.59\n\nThe NPV is slightly negative, so the machine should be rejected at a 10% required return.",
    materials: [
      {
        type: "notes",
        title: "Quick revision notes",
        body: "1. Always discount cash flows, not profits — add back depreciation.\n2. Ignore sunk costs; include opportunity costs.\n3. Accept when NPV > 0; when projects are mutually exclusive, choose the highest NPV.",
      },
      { type: "video", title: "NPV explained in 7 minutes", external_url: "https://www.youtube.com/watch?v=yb0M1b8Q2pM" },
      { type: "link", title: "CFI: Net Present Value guide", external_url: "https://corporatefinanceinstitute.com/resources/valuation/net-present-value-npv/" },
    ],
    quiz: {
      title: "NPV quiz",
      questions: [
        {
          type: "single",
          prompt: "A project has a positive NPV at the company's required return. What does this mean?",
          explanation: "A positive NPV means the discounted inflows exceed the initial cost: the project earns more than the required return and adds value, so it should be accepted.",
          options: [
            { text: "The project earns more than the required return and should be accepted", correct: true },
            { text: "The project breaks even", correct: false },
            { text: "The project's payback is less than one year", correct: false },
            { text: "The project should be rejected", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "A project costs 5,000 today and returns 6,050 in two years. The discount rate is 10%. What is the NPV?",
          explanation: "PV of 6,050 in two years = 6,050 / 1.10² = 6,050 / 1.21 = 5,000. NPV = 5,000 − 5,000 = 0. The project exactly earns the required return.",
          numeric_answer: 0,
          tolerance: 1,
          tolerance_type: "absolute",
        },
        {
          type: "true_false",
          prompt: "Sunk costs should be included in an NPV calculation.",
          explanation: "False. Sunk costs have already been spent and cannot be recovered whatever you decide, so they are irrelevant to the decision. Only future incremental cash flows count.",
          options: [
            { text: "True", correct: false },
            { text: "False", correct: true },
          ],
        },
        {
          type: "multiple",
          prompt: "Which of the following belong in a project's cash flows for NPV? Choose all that apply.",
          explanation: "Opportunity costs and working-capital changes are real cash effects of the decision. Depreciation is an accounting charge, not a cash flow, and market research already paid for is a sunk cost.",
          options: [
            { text: "The opportunity cost of using a warehouse the company already owns", correct: true },
            { text: "Depreciation of the new machine", correct: false },
            { text: "An increase in inventory needed to run the project", correct: true },
            { text: "Market research paid for last year", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "What is the discount factor for year 3 at 8%? Give your answer to 3 decimal places.",
          explanation: "DF = 1 / (1.08)³ = 1 / 1.259712 = 0.794.",
          numeric_answer: 0.794,
          tolerance: 0.002,
          tolerance_type: "absolute",
        },
      ],
    },
  },
  {
    slug: "internal-rate-of-return",
    title: "Internal Rate of Return (IRR)",
    sort_order: 2,
    summary:
      "The internal rate of return is the discount rate at which a project's NPV is exactly zero. It is the project's own percentage return. Managers like it because a percentage is easy to compare with the cost of borrowing or the required return.\n\nThe decision rule: accept the project if the IRR is higher than the required return. IRR can mislead when cash flows change sign more than once (several IRRs) or when comparing projects of different sizes, so NPV should decide when the two methods disagree.",
    key_formulas: String.raw`$$\sum_{t=1}^{n} \frac{CF_t}{(1+IRR)^t} - C_0 = 0$$

Linear interpolation estimate:
$$IRR \approx L + \frac{NPV_L}{NPV_L - NPV_H} \times (H - L)$$

$L$ = lower rate · $H$ = higher rate · $NPV_L$, $NPV_H$ = NPV at those rates`,
    worked_example:
      "A project costs 1,000 and pays 600 at the end of year 1 and 600 at the end of year 2.\n\nAt 10%: NPV = 600/1.10 + 600/1.21 − 1,000 = 545.45 + 495.87 − 1,000 = +41.32\nAt 15%: NPV = 600/1.15 + 600/1.3225 − 1,000 = 521.74 + 453.69 − 1,000 = −24.57\n\nIRR ≈ 10% + [41.32 / (41.32 + 24.57)] × 5% = 10% + 0.627 × 5% ≈ 13.1%\n\nIf the required return is 10%, the project is accepted (13.1% > 10%).",
    materials: [
      {
        type: "notes",
        title: "IRR pitfalls",
        body: "• Multiple IRRs appear when cash flows change sign more than once.\n• IRR ignores scale: a 50% return on 100 is worth less than 20% on 10,000.\n• IRR assumes reinvestment at the IRR itself, which is usually optimistic.",
      },
      { type: "video", title: "IRR vs NPV", external_url: "https://www.youtube.com/watch?v=qV8n5jkJZdc" },
    ],
    quiz: {
      title: "IRR quiz",
      questions: [
        {
          type: "single",
          prompt: "The IRR of a project is the discount rate at which…",
          explanation: "By definition the IRR is the rate that makes the present value of inflows equal the initial cost, i.e. NPV = 0.",
          options: [
            { text: "NPV equals zero", correct: true },
            { text: "NPV is maximised", correct: false },
            { text: "Payback equals the project life", correct: false },
            { text: "The profitability index equals zero", correct: false },
          ],
        },
        {
          type: "true_false",
          prompt: "If a project's IRR is above the required return, its NPV at the required return is positive.",
          explanation: "True for a conventional project (one outflow followed by inflows): NPV falls as the discount rate rises, so at any rate below the IRR the NPV is positive.",
          options: [
            { text: "True", correct: true },
            { text: "False", correct: false },
          ],
        },
        {
          type: "numeric",
          prompt: "NPV is +30 at 8% and −20 at 12%. Estimate the IRR by linear interpolation, in percent, to one decimal place.",
          explanation: "IRR ≈ 8% + [30 / (30 + 20)] × (12% − 8%) = 8% + 0.6 × 4% = 10.4%.",
          numeric_answer: 10.4,
          tolerance: 0.15,
          tolerance_type: "absolute",
        },
        {
          type: "multiple",
          prompt: "When can IRR give a misleading answer? Choose all that apply.",
          explanation: "Non-conventional cash flows can produce several IRRs, and IRR ignores project size, so it can rank a small high-return project above a large one with a higher NPV. Discounting itself is not a problem — NPV also discounts.",
          options: [
            { text: "Cash flows change sign more than once", correct: true },
            { text: "Comparing projects of very different sizes", correct: true },
            { text: "Whenever cash flows are discounted", correct: false },
          ],
        },
      ],
    },
  },
  {
    slug: "weighted-average-cost-of-capital",
    title: "Weighted Average Cost of Capital (WACC)",
    sort_order: 3,
    summary:
      "WACC is the average return a company must earn on its investments to satisfy everyone who finances it: shareholders want the cost of equity, lenders want the cost of debt. Each cost is weighted by the market value of that source of finance.\n\nBecause interest is tax-deductible, the cost of debt is taken after tax. WACC is the discount rate used for NPV when a project has the same business risk and financing mix as the company as a whole.",
    key_formulas: String.raw`$$WACC = \frac{E}{E+D}\,k_e + \frac{D}{E+D}\,k_d\,(1 - T)$$

$E$ = market value of equity · $D$ = market value of debt · $k_e$ = cost of equity · $k_d$ = pre-tax cost of debt · $T$ = corporate tax rate

Cost of equity (CAPM): $k_e = R_f + \beta\,(R_m - R_f)$`,
    worked_example:
      "A company has equity worth 60m and debt worth 40m. Cost of equity is 12%, pre-tax cost of debt is 6%, tax rate is 20%.\n\nAfter-tax cost of debt = 6% × (1 − 0.20) = 4.8%\nWeight of equity = 60 / 100 = 0.6 · Weight of debt = 40 / 100 = 0.4\n\nWACC = 0.6 × 12% + 0.4 × 4.8% = 7.2% + 1.92% = 9.12%\n\nProjects with the company's usual risk should be discounted at about 9.1%.",
    materials: [
      { type: "link", title: "Investopedia: WACC", external_url: "https://www.investopedia.com/terms/w/wacc.asp" },
    ],
    quiz: {
      title: "WACC quiz",
      questions: [
        {
          type: "numeric",
          prompt: "Equity 70m, debt 30m, cost of equity 10%, pre-tax cost of debt 5%, tax 25%. What is the WACC in percent? Give two decimal places.",
          explanation: "After-tax k_d = 5% × 0.75 = 3.75%. WACC = 0.7 × 10% + 0.3 × 3.75% = 7% + 1.125% = 8.13%.",
          numeric_answer: 8.125,
          tolerance: 0.02,
          tolerance_type: "absolute",
        },
        {
          type: "single",
          prompt: "Why is the cost of debt adjusted by (1 − T) in the WACC formula?",
          explanation: "Interest payments reduce taxable profit, so the government effectively pays part of the interest. The true cost to the company is the after-tax amount.",
          options: [
            { text: "Because interest is tax-deductible, so debt is cheaper after tax", correct: true },
            { text: "Because lenders are paid before shareholders", correct: false },
            { text: "Because debt has no market value", correct: false },
          ],
        },
        {
          type: "true_false",
          prompt: "WACC should use book values of equity and debt rather than market values.",
          explanation: "False. Market values reflect what investors actually require today; book values are historical accounting figures.",
          options: [
            { text: "True", correct: false },
            { text: "False", correct: true },
          ],
        },
        {
          type: "numeric",
          prompt: "Using CAPM: risk-free rate 4%, market return 10%, beta 1.5. What is the cost of equity in percent?",
          explanation: "k_e = 4% + 1.5 × (10% − 4%) = 4% + 9% = 13%.",
          numeric_answer: 13,
          tolerance: 0.5,
          tolerance_type: "percent",
        },
      ],
    },
  },
];

for (const t of TOPICS) {
  const { data: topic, error: topicError } = await db
    .from("topics")
    .upsert(
      {
        subject_id: subject.id,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        key_formulas: t.key_formulas,
        worked_example: t.worked_example,
        sort_order: t.sort_order,
        status: "published",
        author_id: editorId,
      },
      { onConflict: "subject_id,slug" },
    )
    .select("id")
    .single();
  if (topicError) fail(`topic ${t.slug}`, topicError);

  // Materials and quiz are rebuilt from scratch each run.
  await db.from("materials").delete().eq("topic_id", topic.id);
  const { error: materialsError } = await db.from("materials").insert(
    t.materials.map((m, i) => ({
      topic_id: topic.id,
      title: m.title,
      type: m.type,
      body: m.body ?? null,
      external_url: m.external_url ?? null,
      sort_order: i + 1,
      status: "published",
      author_id: editorId,
    })),
  );
  if (materialsError) fail(`materials ${t.slug}`, materialsError);

  // Keep the quiz row (students' attempts point at it); rebuild its questions.
  let quiz = (await db.from("quizzes").select("id").eq("topic_id", topic.id).maybeSingle()).data;
  if (quiz) {
    await db.from("quizzes").update({ title: t.quiz.title, status: "published" }).eq("id", quiz.id);
    await db.from("questions").delete().eq("quiz_id", quiz.id);
  } else {
    const { data, error: quizError } = await db
      .from("quizzes")
      .insert({ topic_id: topic.id, title: t.quiz.title, status: "published" })
      .select("id")
      .single();
    if (quizError) fail(`quiz ${t.slug}`, quizError);
    quiz = data;
  }

  for (const [i, q] of t.quiz.questions.entries()) {
    const { data: question, error: questionError } = await db
      .from("questions")
      .insert({
        quiz_id: quiz.id,
        type: q.type,
        prompt: q.prompt,
        explanation: q.explanation,
        numeric_answer: q.numeric_answer ?? null,
        tolerance: q.tolerance ?? null,
        tolerance_type: q.tolerance_type ?? null,
        sort_order: i + 1,
      })
      .select("id")
      .single();
    if (questionError) fail(`question ${t.slug} #${i + 1}`, questionError);

    if (q.options) {
      const { error: optionsError } = await db.from("question_options").insert(
        q.options.map((o, j) => ({ question_id: question.id, text: o.text, is_correct: o.correct, sort_order: j + 1 })),
      );
      if (optionsError) fail(`options ${t.slug} #${i + 1}`, optionsError);
    }
  }
  console.log(`✓ topic    ${t.title} (${t.quiz.questions.length} questions)`);
}

// Give the test student some history on the first topic.
const { data: firstTopic } = await db.from("topics").select("id").eq("subject_id", subject.id).eq("slug", "net-present-value").single();
if (firstTopic) {
  await db.from("topic_progress").upsert(
    { user_id: studentId, topic_id: firstTopic.id, completed_at: new Date().toISOString() },
    { onConflict: "user_id,topic_id" },
  );
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const inDays = (d, hour = 17) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + d);
  date.setUTCHours(hour - 5, 0, 0, 0); // Tashkent is UTC+5
  return date.toISOString();
};

const EVENTS = [
  {
    slug: "intro-to-investment-banking",
    title: "Introduction to investment banking",
    description: "An analyst from a Tashkent investment firm explains what the job really involves, how to prepare, and how to get an internship.\n\nBring your questions — the last 20 minutes are open Q&A.",
    starts_at: inDays(9, 17),
    ends_at: inDays(9, 18.5),
    location: "WIUT, Room 3A-12",
    speaker: "Guest speaker from Avesta Investment Group",
    capacity: 40,
    status: "published",
  },
  {
    slug: "excel-for-finance-workshop",
    title: "Excel for finance: NPV, IRR and sensitivity tables",
    description: "Hands-on online workshop. Build an investment appraisal model from scratch and learn the shortcuts that save hours in coursework.",
    starts_at: inDays(16, 19),
    ends_at: inDays(16, 20.5),
    online_link: "https://meet.google.com/xxx-xxxx-xxx",
    speaker: "Finance Society board",
    capacity: null,
    status: "published",
  },
  {
    slug: "welcome-meeting-2026",
    title: "Welcome meeting 2026/27",
    description: "The club's first meeting of the year: what we do, how to get involved, and the plan for the semester.",
    starts_at: inDays(-20, 16),
    ends_at: inDays(-20, 17),
    location: "WIUT, Atrium",
    speaker: null,
    capacity: null,
    status: "published",
  },
];

for (const e of EVENTS) {
  const { error } = await db.from("events").upsert(e, { onConflict: "slug" });
  if (error) fail(`event ${e.slug}`, error);
}
console.log(`✓ events   ${EVENTS.length}`);

console.log("\nDone. Log in with dev.student@example.com (password in this script) to try the student experience.");
