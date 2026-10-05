// Single source of truth — résumé content, plus product context taken from each project's own site. Do not invent.
// Stealth projects are under NDA: never put their real names, logos, links, or product details here.

export const profile = {
  name: "Arkit Karmokar",
  role: "Full Stack Developer",
  philosophy: "I build software that feels effortless.",
  // the landing screen: what I do, then a few lines about me
  headline: "Full-stack developer building SaaS platforms & distributed systems",
  brief:
    "I work across the stack — product, API, data and infrastructure — on AI platforms, retention systems and internal tools. Lately: AI search visibility, churn recovery, and a production-readiness agent for AI-written code. Some of it I can't name yet.",
  roles: ["Developer", "Builder", "Designer", "AI Engineer"],
  about:
    "I'm a Full Stack Developer specializing in SaaS platforms and distributed systems. From advanced automation platforms that resolve direct business friction to high-throughput internal infrastructure, I focus on shipping high-impact tools that perform smoothly under load and adapt gracefully within modern enterprise ecosystems.",
  location: "Ulhasnagar, Maharashtra — India",
  email: "arkitkarmokar007@gmail.com",
  phone: "+91 7020623232",
  github: "https://github.com/arkit-k",
  linkedin: "https://linkedin.com/in/arkit",
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

export const experience: Experience[] = [
  {
    company: "Optiminastic",
    title: "Full Stack Developer",
    period: "Feb 2026 — Present",
    location: "Remote",
    description:
      "Built internal enterprise platforms that are currently under NDA. Engineered a full-stack SaaS engine monitoring website visibility across multi-model AI search landscapes — ChatGPT, Perplexity, and Gemini — with custom integration engines and webhook frameworks via Shopify Remix Apps and WordPress Plugins for native visibility auto-fixes on production. Architected the analytics pipeline in Python/Django and Next.js, leveraging Celery task brokers and PostgreSQL.",
  },
  {
    company: "Stealth Startup",
    title: "Founding Engineer / Consultant",
    period: "Sept 2025 — Jan 2026",
    location: "Mumbai",
    description:
      "Co-designed a high-growth platform for a stealth-stage startup (under NDA). Built high-performance Next.js backend infrastructure with server-side rendering integrated with optimized PostgreSQL schemas, index models, and connection-pool topologies. Developed operational RAG pipelines using LangChain to generate document embeddings, manage real-time vector indexing, and supply semantic capabilities to the platform.",
  },
];

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
    github: "https://github.com/arkit-k",
    wordmark: "Windback.",
    color: "#0004E0",
  },
  {
    name: "SignalorAI",
    role: "Full Stack Developer",
    year: "2026",
    context: "Optiminastic",
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
    context: "Optiminastic",
    description:
      "An internal product built end-to-end at Optiminastic, currently in stealth. Product details are covered by an NDA until launch.",
    tech: ["Under NDA"],
    logo: "/logos/stealth-1.png",
    stealth: true,
  },
  {
    name: "Stealth Project",
    role: "Full Stack Developer",
    year: "2026",
    context: "Optiminastic",
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
    context: "Stealth Startup",
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

export const education = {
  school: "University of Mumbai",
  degree: "Bachelor of Science in Information Technology",
  period: "Apr 2021 — May 2024",
  location: "Mumbai, India",
  coursework:
    "Data Structures, Algorithms, Computer Systems, Software Engineering, Database Systems.",
};

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
