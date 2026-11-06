export const site = {
  name: "Sarthak Kamble",
  email: "sarthakkamble101@gmail.com",
  github: "https://github.com/Sarthak102",
  linkedin: "https://www.linkedin.com/in/sarthak-kamble-101",
  x: "https://x.com/sarthakkamblex",
  resume: "/Sarthak-Kamble-Resume.pdf",
};

// Cycled in the hero: "I build ___ that don't fall over."
export const builds = ["backends", "APIs", "interfaces", "products"];

export const manifesto = {
  before: "I build software that's",
  highlight: "boring in the best way:",
  after: "it loads, it handles failure, and it never loses your data.",
};

// Add a project here and it appears in the Work index. Set `video` to an mp4 in /public
// once a real screen recording exists; until then the animated concept preview is shown.
export type Project = {
  name: string;
  kind: string;
  status: "In progress" | "Live";
  summary: string;
  stack: string[];
  preview: "interview" | "receipt";
  video?: string;
  href?: string;
};

export const projects: Project[] = [
  {
    name: "Defend Your Code",
    kind: "AI interview SaaS",
    status: "In progress",
    summary:
      "An AI mock interviewer that reads your own GitHub repo, asks line-level why and what-if questions, and tracks your weak spots across sessions.",
    stack: ["Next.js", "Node.js", "PostgreSQL", "GitHub OAuth", "LLM API"],
    preview: "interview",
  },
  {
    name: "SplitSnap",
    kind: "Bill splitting web app",
    status: "Live",
    summary:
      "Scan a restaurant bill and friends claim what they ate live, by count, by shared plate or with an equal split. Everyone pays their exact share by UPI or cash, and it installs on your phone like an app.",
    stack: ["Next.js", "TypeScript", "Supabase", "Cloudflare Workers AI"],
    preview: "receipt",
    video: "/videos/splitsnap-demo.mp4",
    href: "https://splitsnap-wine.vercel.app",
  },
];

export const experience = [
  {
    company: "Excelerate",
    title: "Full Stack Developer Intern",
    period: "May 2026 - Present",
    year: "2026",
    points: [
      "Build features end to end on two production evaluation platforms, from Node.js/Express REST endpoints to React screens with Redux Toolkit and TanStack Query, behind AWS Cognito auth and role-based access.",
      "Migrated backend modules to class-based models on a layered Route, Controller, Service and Repository architecture, with explicit mapping between database and API shapes.",
      "Review teammates' pull requests for correctness and data-integrity bugs.",
    ],
    stack: ["TypeScript", "Node.js", "React", "AWS DynamoDB", "Cognito"],
  },
  {
    company: "Tech Mahindra",
    title: "Support Trainee",
    period: "Mar 2025 - May 2025",
    year: "2025",
    points: [
      "Built React and TypeScript dashboards for banking and financial-services clients, and fixed bugs in Flask and Supabase backend services.",
      "Defined REST API contracts with backend engineers before integration.",
      "Led a UI revamp that added dark mode and improved accessibility.",
    ],
    stack: ["React", "TypeScript", "Flask", "Supabase"],
  },
  {
    company: "ONGC",
    title: "Summer Intern",
    period: "Jun 2024 - Jul 2024",
    year: "2024",
    points: [
      "Built a consumable management system to track and manage the department's inventory.",
      "Designed the MySQL database, the PHP backend and the HTML/CSS interface staff use to look up and manage stock.",
    ],
    stack: ["PHP", "MySQL", "HTML", "CSS"],
  },
];

export const stack = [
  "TypeScript",
  "React",
  "Node.js",
  "PostgreSQL",
  "AWS DynamoDB",
  "Next.js",
  "Express",
  "Redux Toolkit",
  "TanStack Query",
  "React Native",
  "Docker",
  "Supabase",
];
