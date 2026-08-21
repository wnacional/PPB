type PublicPage = 'help' | 'privacy' | 'terms'

const support = 'support@pinoypocketbudget.app'

const legal = {
  terms: {
    eyebrow: 'PLEASE READ BEFORE USING', title: 'Terms of Service',
    intro: 'These Terms govern your use of Pinoy Pocket Budget. By creating an account or using the service, you agree to these Terms and acknowledge the Privacy Policy.',
    sections: [
      ['1. Eligibility and accounts', 'You must be at least 18 years old, provide accurate information, protect your password, and report suspected unauthorized access.'],
      ['2. What the service provides', 'Pinoy Pocket Budget helps you manually organize income, expenses, loans, and credit-card balances. It does not hold money, initiate transactions, extend credit, or provide financial, tax, accounting, or legal advice.'],
      ['3. Beta service', 'Features may be incomplete, change, or become temporarily unavailable. Keep your own backup of important records and verify calculations before making financial decisions.'],
      ['4. Acceptable use', 'Do not access another person’s records, interfere with security, upload malicious material, automate abusive requests, or use the service for unlawful or harmful activity.'],
      ['5. Your content', 'You retain ownership of information you enter and allow us to process it only as needed to operate, secure, and support the service.'],
      ['6. Ending your use', `You may stop using the service at any time. Signed-in users can permanently delete their account in Account Settings or contact ${support}.`],
      ['7. Governing law and contact', `These Terms are governed by the laws of the Republic of the Philippines. Questions may be sent to ${support}.`],
    ],
  },
  privacy: {
    eyebrow: 'YOUR DATA, EXPLAINED', title: 'Privacy Policy',
    intro: 'Pinoy Pocket Budget is a personal budgeting and debt-tracking service operated in the Philippines. This policy explains the information we process and the choices available to you.',
    sections: [
      ['1. Information we collect', 'We process your email and account identifiers, the budget and debt information you enter, essential technical and security logs, and messages you send to support.'],
      ['2. Information you should not enter', 'Do not enter full card numbers, security codes, bank passwords, government identification numbers, or information the app does not request.'],
      ['3. How we use information', 'We use information to authenticate users, provide budgeting features, synchronize entries, send account and due-date emails, prevent abuse, diagnose errors, and comply with law.'],
      ['4. Providers and transfers', 'Supabase provides authentication and database services, while hosting and email providers help operate the app. Their systems may process information outside the Philippines. We do not sell personal information or share budget entries with advertisers.'],
      ['5. Security and retention', 'Access controls are designed to keep each user’s records separate. We retain information while an account is active and as reasonably needed for security, support, disputes, or legal obligations.'],
      ['6. Your rights', `Subject to applicable law, you may request access, correction, objection, portability, blocking, or deletion. Use Account Settings or contact ${support}.`],
      ['7. Children and changes', 'The service is intended for adults at least 18 years old. Updated policies will be posted here with a revised effective date.'],
    ],
  },
} as const

const topics = [
  ['Getting started', 'Confirm your email, sign in, add current debts, then record income and expenses using their actual dates.'],
  ['Recording income and expenses', 'Use Add, choose the transaction type, enter the amount, category, note, and date, then save.'],
  ['Loans and credit cards', 'Use Pay or Adjust in the dashboard to keep debt balances reconciled.'],
  ['Due-date alerts', 'Open Account Settings to enable or pause automated due-report emails.'],
  ['Account and security', 'Use Account Settings to manage notifications, sign out on shared devices, or permanently delete your account.'],
  ['Troubleshooting', 'Review recent transactions and adjustments before repeating an entry. Never send your password to support.'],
] as const

export function PublicPages({ page }: { page: PublicPage }) {
  if (page === 'help') return <main className="public-page"><nav><a href="/" className="wordmark"><span>₱</span> Pinoy Pocket Budget</a><a href="/">← Back to app</a></nav><article><span className="eyebrow">KNOWLEDGE BASE</span><h1>How can we help?</h1><p className="lead">Step-by-step guidance for using Pinoy Pocket Budget accurately.</p><div className="help-grid">{topics.map(([title, copy], index) => <section key={title}><b>{String(index + 1).padStart(2, '0')}</b><h2>{title}</h2><p>{copy}</p></section>)}</div><aside><span className="eyebrow">NEED MORE HELP?</span><h2>Contact Pinoy Pocket Budget support</h2><p>Include the date, amount, and account name when reporting a balance issue. Never send your password.</p><a href={`mailto:${support}`}>{support}</a></aside></article></main>
  const copy = legal[page]
  return <main className="public-page"><nav><a href="/" className="wordmark"><span>₱</span> Pinoy Pocket Budget</a><a href="/">← Back to app</a></nav><article><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p className="updated">Effective and last updated: August 22, 2026</p><p className="lead">{copy.intro}</p>{copy.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}<footer><a href={page === 'terms' ? '/privacy' : '/terms'}>{page === 'terms' ? 'Privacy Policy' : 'Terms of Service'}</a><a href={`mailto:${support}`}>Contact support</a><a href="/">Return to app</a></footer></article></main>
}