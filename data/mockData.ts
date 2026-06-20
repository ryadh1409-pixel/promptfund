import type {
  Expense,
  Funding,
  FundingRequest,
  FundPoints,
  Project,
  User,
} from '@/types';

export const users: User[] = [
  {
    id: 'user-dev-1',
    name: 'Maya Chen',
    handle: '@maya.builds',
    role: 'developer',
    avatar: 'MC',
    bio: 'Full-stack builder shipping AI workflow tools for indie teams.',
    location: 'Toronto, CA',
    stack: ['Expo', 'Firebase', 'OpenAI', 'Stripe'],
    trustScore: 94,
  },
  {
    id: 'user-investor-1',
    name: 'Omar Reyes',
    handle: '@omarbacks',
    role: 'investor',
    avatar: 'OR',
    bio: 'Micro-backer focused on developer tooling and applied AI.',
    location: 'Austin, TX',
    stack: ['AI tools', 'SaaS', 'DevRel'],
    trustScore: 89,
  },
];

export const projects: Project[] = [
  {
    id: 'pf-runner',
    developerId: 'user-dev-1',
    title: 'Prompt Runner',
    tagline: 'Test prompt variants across models in one workspace.',
    description:
      'A lightweight evaluation dashboard for founders who need to compare Claude, OpenAI, and local model outputs before shipping prompt changes.',
    status: 'funding',
    goalAmount: 450,
    fundedAmount: 315,
    progress: 0.7,
    tools: ['Cursor Pro', 'Claude Max', 'OpenAI API'],
    milestones: ['Prototype UI', 'Model comparison table', 'Shareable report links'],
    nextUpdate: 'Demo video due Friday',
  },
  {
    id: 'launch-domain-kit',
    developerId: 'user-dev-1',
    title: 'Launch Domain Kit',
    tagline: 'Reserve domains and deploy landing pages in minutes.',
    description:
      'A starter kit that combines domain search, DNS setup checklists, and one-click hosting recommendations for small AI product launches.',
    status: 'building',
    goalAmount: 220,
    fundedAmount: 80,
    progress: 0.36,
    tools: ['Vercel', 'Namecheap', 'Cursor Pro'],
    milestones: ['Domain scanner', 'DNS checklist', 'Template gallery'],
    nextUpdate: 'DNS scanner alpha',
  },
];

export const fundingRequests: FundingRequest[] = [
  {
    id: 'fr-1',
    projectId: 'pf-runner',
    requestedBy: 'user-dev-1',
    amount: 100,
    tool: 'Claude Max',
    reason: 'Need a one-month Claude Max upgrade to run larger prompt regression suites.',
    status: 'open',
    dueDate: 'Jun 28',
  },
  {
    id: 'fr-2',
    projectId: 'pf-runner',
    requestedBy: 'user-dev-1',
    amount: 35,
    tool: 'OpenAI API',
    reason: 'Top up API credits for synthetic test cases and cost estimates.',
    status: 'partiallyFunded',
    dueDate: 'Jul 02',
  },
  {
    id: 'fr-3',
    projectId: 'launch-domain-kit',
    requestedBy: 'user-dev-1',
    amount: 14,
    tool: 'Domain',
    reason: 'Register the launch demo domain for investor previews.',
    status: 'funded',
    dueDate: 'Funded',
  },
];

export const fundings: Funding[] = [
  {
    id: 'funding-1',
    investorId: 'user-investor-1',
    projectId: 'pf-runner',
    amount: 150,
    fundedAt: 'Today',
    note: 'Backed Cursor and API credits after the first demo.',
  },
  {
    id: 'funding-2',
    investorId: 'user-investor-1',
    projectId: 'launch-domain-kit',
    amount: 80,
    fundedAt: 'Yesterday',
    note: 'Small bet on the domain workflow.',
  },
];

export const expenses: Expense[] = [
  {
    id: 'expense-1',
    projectId: 'pf-runner',
    title: 'Cursor Pro seat',
    vendor: 'Cursor',
    amount: 20,
    category: 'AI IDE',
    date: 'Jun 16',
    status: 'approved',
  },
  {
    id: 'expense-2',
    projectId: 'pf-runner',
    title: 'Prompt regression credits',
    vendor: 'OpenAI',
    amount: 42,
    category: 'API',
    date: 'Jun 18',
    status: 'pending',
  },
  {
    id: 'expense-3',
    projectId: 'launch-domain-kit',
    title: 'Landing page hosting',
    vendor: 'Vercel',
    amount: 20,
    category: 'Hosting',
    date: 'Jun 19',
    status: 'approved',
  },
];

export const fundPoints: FundPoints[] = [
  {
    id: 'points-dev-1',
    userId: 'user-dev-1',
    balance: 1280,
    lifetimeEarned: 2400,
    streakWeeks: 6,
    history: [
      { id: 'points-1', label: 'Posted weekly progress update', points: 120, date: 'Today' },
      { id: 'points-2', label: 'Uploaded approved expense', points: 80, date: 'Jun 18' },
      { id: 'points-3', label: 'Shipped milestone demo', points: 250, date: 'Jun 14' },
    ],
  },
];

export const currentUser = users[0];
export const investorUser = users[1];
