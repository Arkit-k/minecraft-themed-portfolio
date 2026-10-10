// Single source of truth — résumé content, plus product context taken from each project's own site. Do not invent.
// Stealth projects are under NDA: never put their real names, logos, links, or product details here.

export const profile = {
  name: "Arkit Karmokar",
  // What the hero says out loud. Kept separate from `role` on purpose: this is
  // voice, `role` is the machine-readable jobTitle in the Person schema.
  heroLabel: "I like building cool stuff",
  // Never shown as a label — feeds jobTitle / hasOccupation in the JSON-LD, which
  // is how search and generative engines classify what Arkit does.
  role: "AI Engineer",
  philosophy: "I build software that feels effortless.",
  // the landing screen: what I do, then a few lines about me
  headline: "AI engineer building production LLM systems — MCP servers, agents, RAG",
  brief:
    "I work across the stack — product, API, data and infrastructure — on AI platforms, retention systems and internal tools. Lately: AI search visibility, churn recovery, and a production-readiness agent for AI-written code. Some of it I can't name yet.",
  roles: ["Developer", "Builder", "Designer", "AI Engineer"],
  about:
    "I'm an AI engineer who builds the parts of AI products that have to work in production: MCP servers, tool-calling agents with real retries and cost caps, and RAG pipelines with vector indexing. I've shipped a conversational CLI agent exposing deterministic code detectors as model-callable tools, a churn-recovery platform on a Go backend, and a SaaS engine tracking brand visibility across ChatGPT, Perplexity and Gemini. Most of the work is the unglamorous half — idempotent webhooks, token budgets, and the failure modes nobody writes blog posts about.",
  location: "Ulhasnagar, Maharashtra — India",
  email: "arkit@arkit.live",
  phone: "+91 7020623232",
  github: "https://github.com/arkit-k",
  linkedin: "https://www.linkedin.com/in/arkit-karmokar-907493246/",
  twitter: "https://x.com/arkit_k",
  resume: "/arkit-karmokar-resume.pdf",
  introAudio: "/api/intro-audio", // streamed in chunks from private/audio/intro.m4a
};

export type Experience = {
  company: string;
  title: string;
  period: string;
  location: string;
  description: string;
};

export const experience: Experience[] = [];

export type Project = {
  name: string;
  role: string;
  year: string;
  context: string;
  description: string;
  tech: string[];
  github?: string;
  demo?: string;
  logo?: string; // path under /public, shown above the name
  wordmark?: string; // text logo shown in place of the name, e.g. "Windback."
  color?: string; // brand colour for the wordmark
  stealth?: boolean; // under NDA: name and logo are shown blurred, never revealed
  hideOnLanding?: boolean; // kept out of the landing screen's row of work
};

export const projects: Project[] = [
  {
    name: "Shepherd",
    role: "Creator & Maintainer",
    year: "2026",
    context: "Open Source",
    description:
      "A production-readiness auditing tool that catches the failure modes AI code generators leave behind — missing auth, client-only access control, cost-bombs, outdated patterns, and architectural drift. Runs deterministic security and architecture scans with live localhost probing, evaluates readiness at 1M-DAU scale, and instead of merging directly it hands detailed fix work-orders to Claude Code via MCP for human-reviewed implementation.",
    tech: ["TypeScript", "Node.js", "CLI", "MCP", "Claude Code", "Security"],
    github: "https://github.com/Arkit-k/shepherd",
    logo: "/logos/shepherd.png",
  },
  {
    name: "WindbackAI",
    role: "Lead Architect",
    year: "2026",
    context: "Personal SaaS Venture",
    description:
      "A specialized B2B retention platform that minimizes subscription churn and automatically recovers failed-transaction revenue. Built an intelligent dunning engine using autonomous AI models to generate personalized win-back sequences, and hardened the core cluster with PII encryption at rest, strict RBAC, and API token rate-limiting. Fully containerized with Docker, scaling asynchronous workers via Redis job queues on Render.",
    tech: ["Next.js", "AI Models", "Redis", "Docker", "RBAC", "Render"],
    demo: "https://windbackai.com",
    github: "https://github.com/Arkit-k/windback-fe",
    wordmark: "Windback.",
    color: "#0004E0",
  },
  {
    name: "SignalorAI",
    role: "Full Stack Developer",
    year: "2026",
    context: "AI Platform",
    description:
      "An AI visibility and GEO platform that scores, monitors, and improves how ChatGPT, Claude, Gemini, and Perplexity cite a brand. Runs tracked prompts daily across every major AI engine, grades sites on six GEO pillars from 0 to 100, benchmarks competitors' share of voice, and ships schema fixes straight to production through Shopify and WordPress integrations.",
    tech: ["Next.js", "Python", "Django", "PostgreSQL", "AI Models"],
    demo: "https://signalor.ai",
    logo: "/logos/signalor.svg",
  },
  {
    name: "Stealth Project",
    role: "Full Stack Developer",
    year: "2026",
    context: "Under NDA",
    description:
      "An internal enterprise product built end-to-end, currently in stealth. Product details are covered by an NDA until launch.",
    tech: ["Under NDA"],
    logo: "/logos/stealth-1.png",
    stealth: true,
  },
  {
    name: "Stealth Project",
    role: "Full Stack Developer",
    year: "2026",
    context: "Under NDA",
    description:
      "An enterprise platform currently in stealth, built across the full stack. Specifics are covered by an NDA.",
    tech: ["Under NDA"],
    logo: "/logos/stealth-2.png",
    stealth: true,
  },
  {
    name: "Stealth Project",
    role: "Founding Engineer",
    year: "2025",
    context: "Under NDA",
    description:
      "A stealth-stage startup product. Built the Next.js and PostgreSQL backbone and the LangChain RAG pipelines behind its AI features; product details are under NDA.",
    tech: ["Next.js", "PostgreSQL", "RAG", "AI Models"],
    logo: "/logos/stealth-3.png",
    stealth: true,
  },
  {
    name: "100xdevs Ecosystem",
    role: "Full Stack Cohort",
    year: "Ongoing",
    context: "Harkirat Singh Ecosystem",
    description:
      "Advanced production execution framework targeting Next.js (TypeScript), PostgreSQL, and Docker workflows, scalable AWS server clusters, and highly performant Web3 applications built across Blockchain and Solana environments.",
    tech: ["Next.js", "PostgreSQL", "Docker", "AWS", "Solana", "Web3"],
    github: "https://github.com/arkit-k",
    hideOnLanding: true,
  },
];

export type Service = {
  name: string;
  outcome: string; // the one line that says what they actually get
  includes: string[];
  price: string;
  turnaround: string;
  proof?: string; // the work that backs the claim — never a claim without one
};

export type ServiceGroup = {
  index: string;
  title: string;
  blurb: string;
  services: Service[];
};

// Prices in USD: this page is written for remote and foreign buyers, where the
// rate is several times the Indian agency rate. Indian agencies get quoted in
// rupees directly, not from here.
//
// This is a menu of what's for sale, not a résumé. `proof` appears only where
// there is real shipped work behind it — the rest are capabilities, which is
// normal. Never fabricate a proof line.
export const serviceGroups: ServiceGroup[] = [
  {
    index: "01",
    title: "GenAI Engineering",
    blurb: "Models wired into products that have to survive real users.",
    services: [
      {
        name: "MCP server for your internal tools",
        outcome:
          "Your API, database or internal service exposed to Claude, Cursor or any MCP client as typed, scoped tools your team can actually use.",
        includes: [
          "Typed tool definitions with zod schemas and real input validation",
          "Auth and scoping, so the model can't reach what it shouldn't",
          "Error handling that returns usable messages, not stack traces",
          "Deployed, documented, and working in your editor before handover",
        ],
        price: "$400",
        turnaround: "1 week",
        proof: "Shepherd — an MCP server exposing deterministic code detectors as model-callable tools",
      },
      {
        name: "AI agent — tool-calling pipeline",
        outcome: "An agent that does a real job end to end, not a chat demo.",
        includes: [
          "Tool-calling loop with retries and graceful degradation",
          "Structured output via zod — parseable results, not prose you regex",
          "Token budgets and model routing, so one bad input can't bill you $400",
          "Tracing, so when it misbehaves you can see which step did it",
        ],
        price: "from $500",
        turnaround: "1–2 weeks",
        proof: "Shepherd's agent CLI, and a 9-strategy LLM recovery engine on OpenRouter",
      },
      {
        name: "RAG and document Q&A",
        outcome:
          "Answers grounded in your own documents, citing the passage they came from.",
        includes: [
          "Ingestion, chunking and embedding for PDFs, docs, tickets or a database",
          "Vector indexing kept current in real time, not rebuilt nightly",
          "Retrieval tuning so answers cite the passage that actually matters",
          "Evaluation, so you can tell whether a change helped or hurt",
        ],
        price: "from $550",
        turnaround: "1–2 weeks",
        proof: "LangChain RAG pipelines — embeddings, real-time vector indexing, semantic retrieval",
      },
      {
        name: "Chatbot or assistant",
        outcome:
          "A support, sales or internal assistant that knows your product and hands off cleanly when it shouldn't answer.",
        includes: [
          "Web widget, Slack, WhatsApp or in-app — wherever your users are",
          "Grounded in your content, with refusal behaviour you control",
          "Escalation to a human with full conversation context",
          "Analytics on what people actually ask",
        ],
        price: "from $350",
        turnaround: "1 week",
      },
    ],
  },
  {
    index: "02",
    title: "AI Platform Engineering",
    blurb:
      "The infrastructure around the model — what it costs, whether it works, and how it scales.",
    services: [
      {
        name: "LLM cost reduction",
        outcome:
          "The change shipped and a before/after number — not a report telling you what to do.",
        includes: [
          "Prompt and context trimming where it doesn't cost quality",
          "Caching for the calls you're repeating without realising",
          "Model routing — cheap model for the easy 80%, strong model for the rest",
          "Hard spend caps and per-feature attribution",
        ],
        price: "$350",
        turnaround: "1 week",
        proof: "Built a cost-bomb detector because I kept finding these in production code",
      },
      {
        name: "Fine-tuning and model adaptation",
        outcome:
          "A pilot fine-tune on one model for one task, measured against the base model, so you know whether it is worth going further.",
        includes: [
          "Dataset preparation and cleaning from your existing data",
          "One fine-tune or adapter on a hosted provider — not training from scratch",
          "Held-out evaluation against the base model, so the gain is measured",
          "Deployment and serving behind your existing API",
        ],
        price: "$950",
        turnaround: "2 weeks",
      },
      {
        name: "Workflow automation",
        outcome:
          "The manual process between your tools, running itself — with AI in the loop where it earns its place.",
        includes: [
          "n8n, Zapier, Make or custom workers, whichever fits",
          "Async queues with real retry semantics, not fire-and-forget",
          "Scheduled jobs that survive restarts and don't double-fire",
          "Containerised and deployed",
        ],
        price: "from $500",
        turnaround: "1 week",
        proof: "Signalor's Django/Celery/PostgreSQL pipeline and Windback's Redis job queues",
      },
    ],
  },
  {
    index: "03",
    title: "Systems Engineering",
    blurb:
      "Frontend, backend and the unglamorous half — where most AI products actually break.",
    services: [
      {
        name: "Fix a vibe-coded app",
        outcome:
          "Something built with Lovable, Bolt, v0 or Cursor that works in the demo and breaks with real users.",
        includes: [
          "Auth and access control that's enforced on the server, not just hidden in the UI",
          "The API calls and loops quietly running up your bill",
          "Builds that won't deploy, and hydration errors that only show in production",
          "A written list of what was wrong, so you don't ship it again",
        ],
        price: "$100–250",
        turnaround: "2–5 days",
        proof: "Shepherd — a CLI that audits exactly these failure modes in AI-generated codebases",
      },
      {
        name: "Build full-stack",
        outcome: "An app or internal tool from nothing to deployed. Price scales with scope.",
        includes: [
          "Next.js front end with an API or service layer behind it",
          "PostgreSQL schema, indexing and connection-pool topology",
          "Auth, payments and third-party integrations",
          "Docker, deploys, and the bits nobody wants to own",
        ],
        price: "from $250",
        turnaround: "Scope-dependent",
        proof: "Windback's hexagonal Go backend and Signalor's Django pipeline",
      },
      {
        name: "Custom integrations",
        outcome: "Two systems that don't talk to each other, made to talk.",
        includes: [
          "Stripe, Razorpay, Shopify, WordPress, Slack, WhatsApp — whatever the pair is",
          "Idempotent webhook handling, so a retry doesn't double-charge or double-send",
          "Auth, token refresh and the failure cases nobody tests",
          "Logging, so you can see what happened when it misbehaves",
        ],
        price: "$100–150",
        turnaround: "1–3 days",
        proof: "Shopify Remix app and WordPress plugin integrations shipping fixes to customer production",
      },
    ],
  },
];

// flat view — feeds the Offer schema
export const services: Service[] = serviceGroups.flatMap((g) => g.services);

export const skills = {
  technical: [
    "JavaScript",
    "TypeScript",
    "Python",
    "HTML / CSS",
    "React.js & Next.js",
    "Node.js & Express.js",
    "Bun.js & Hono.js",
    "Django",
    "PostgreSQL & MongoDB",
    "Docker",
    "AWS",
    "Redis & Celery",
  ],
  systems: [
    "System Design",
    "RAG Architecture",
    "LLM Integration",
    "Churn Mitigation",
    "Enterprise Platforms",
    "Agile Sprints",
  ],
};
