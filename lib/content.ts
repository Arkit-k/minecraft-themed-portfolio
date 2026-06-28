// Single source of truth — extracted verbatim from the résumé. Do not invent.

export const profile = {
  name: "Arkit Karmokar",
  role: "Full Stack Developer",
  philosophy: "I build software that feels effortless.",
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
      "Built an enterprise internal HR Management Platform streamlining recruitment lifecycle workflows, candidate tracking, and automated onboarding pipelines. Engineered a full-stack SaaS engine monitoring website visibility across multi-model AI search landscapes — ChatGPT, Perplexity, and Gemini — with custom integration engines and webhook frameworks via Shopify Remix Apps and WordPress Plugins for native visibility auto-fixes on production. Architected the analytics pipeline in Python/Django and Next.js, leveraging Celery task brokers and PostgreSQL.",
  },
  {
    company: "Cinemate AI",
    title: "Founding Engineer / Consultant",
    period: "Sept 2025 — Jan 2026",
    location: "Andheri, Mumbai",
    description:
      "Co-designed a high-growth filmmaking discovery platform for creator networks and modern media production pipelines. Built high-performance Next.js backend infrastructure with server-side rendering integrated with optimized PostgreSQL schemas, index models, and connection-pool topologies. Developed operational RAG pipelines using LangChain to generate document embeddings, manage real-time vector indexing, and supply semantic capabilities to the platform.",
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
  },
  {
    name: "BrowzyAI",
    role: "Open Source Maintainer",
    year: "2025",
    context: "Global Community",
    description:
      "A downloadable browser extension that enhances day-to-day navigation with custom-tailored companion tools. Tied lightweight JavaScript extension layers into scalable Python background systems using direct Gemini API orchestration, implementing native Natural Language Understanding that accelerated task performance by 30%.",
    tech: ["JavaScript", "Python", "Gemini API", "NLU"],
    github: "https://github.com/arkit-k",
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
    "HRMS Infrastructure",
    "Agile Sprints",
  ],
};
