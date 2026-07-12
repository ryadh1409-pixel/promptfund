import type { LegalDocumentVersions } from '@/types/User';

export const defaultLegalVersions: LegalDocumentVersions = {
  appVersion: '1.0.0',
  termsVersion: '1.0',
  privacyVersion: '1.0',
  communityVersion: '1.0',
};

export type LegalDocumentKey =
  | 'terms'
  | 'privacy'
  | 'community'
  | 'investmentDisclaimer'
  | 'aiDisclosure'
  | 'responsibilities';

export type LegalDocument = {
  key: LegalDocumentKey;
  title: string;
  subtitle: string;
  preview: string;
  lastUpdated: string;
  readingTimeMinutes: number;
  sections: Array<{
    title: string;
    body: string;
  }>;
};

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    key: 'terms',
    title: 'Terms of Service',
    subtitle: 'Professional terms for using Ai PromptFund.',
    preview: 'Rules governing the use of Ai PromptFund.',
    lastUpdated: 'Jun 2026',
    readingTimeMinutes: 5,
    sections: [
      { title: 'Acceptance', body: 'By creating an account or using Ai PromptFund, you agree to these Terms of Service and all policies referenced in the app.' },
      { title: 'Eligibility', body: 'Ai PromptFund is intended for users who can legally enter binding agreements and participate in founder or angel investor discussions under applicable law.' },
      { title: 'Accounts', body: 'You are responsible for keeping your account information accurate, securing your credentials, and using Ai PromptFund only for lawful professional purposes.' },
      { title: 'Founder Responsibilities', body: 'Founders must provide accurate startup, traction, fundraising, equity, ownership, and company information. Founders are responsible for ensuring that any materials shared are truthful and authorized.' },
      { title: 'Angel Investor Responsibilities', body: 'Angel Investors are responsible for their own investment review, suitability analysis, legal compliance, and due diligence before making any funding decision.' },
      { title: 'Investment Discussions', body: 'Ai PromptFund facilitates introductions and private discussions. Discussions are not offers, solicitations, guarantees, or investment advice from Ai PromptFund.' },
      { title: 'Messaging', body: 'Messaging must remain professional, accurate, and lawful. Ai PromptFund may moderate abusive, fraudulent, or unsafe activity.' },
      { title: 'Uploaded Files', body: 'You may upload images and documents only when you have the right to share them. Do not upload malware, unlawful content, or confidential third-party material without permission.' },
      { title: 'Community Rules', body: 'You must follow Ai PromptFund Community Guidelines and avoid harassment, spam, scams, false claims, and unlawful fundraising activity.' },
      { title: 'Blocking', body: 'Users may block other users to prevent further interaction. Blocking is a safety control and does not resolve legal or financial disputes.' },
      { title: 'Reporting', body: 'Users may report unsafe behavior. Reports are reviewed by Ai PromptFund Trust & Safety and may result in moderation action.' },
      { title: 'Intellectual Property', body: 'Ai PromptFund owns its platform, branding, design, and software. Users retain rights in their submitted content but grant Ai PromptFund permission to host and process it to provide the service.' },
      { title: 'Confidentiality', body: 'Users should treat private investment discussions and uploaded materials as confidential unless the sharing party clearly states otherwise.' },
      { title: 'Platform Availability', body: 'Ai PromptFund may change, suspend, or discontinue features and cannot guarantee uninterrupted platform availability.' },
      { title: 'Disclaimer', body: 'Ai PromptFund is provided as-is and does not guarantee fundraising outcomes, investment performance, legal compliance, or counterparty reliability.' },
      { title: 'Limitation of Liability', body: 'To the fullest extent allowed by law, Ai PromptFund is not liable for indirect, incidental, special, consequential, or investment-related losses arising from platform use.' },
      { title: 'Governing Law', body: 'These terms are governed by the laws applicable to Ai PromptFund operations, without regard to conflict-of-law rules.' },
      { title: 'Contact', body: 'Contact Ai PromptFund support for questions about these Terms of Service or platform use.' },
    ],
  },
  privacy: {
    key: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How Ai PromptFund handles account, investment, and safety data.',
    preview: 'Learn how we collect and protect your information.',
    lastUpdated: 'Jun 2026',
    readingTimeMinutes: 4,
    sections: [
      { title: 'Information Collected', body: 'Ai PromptFund collects account information, profile details, role selections, startup information, investment discussion records, safety reports, and app activity needed to provide the platform.' },
      { title: 'Profile', body: 'Profile data may include your name, username, email, role, photo, biography, location, trust signals, and account preferences.' },
      { title: 'Images', body: 'Images such as profile photos, startup visuals, and chat attachments are stored and served through Ai PromptFund infrastructure.' },
      { title: 'Documents', body: 'Documents shared in investment discussions are stored to support private collaboration and may be reviewed when required for safety, support, or legal compliance.' },
      { title: 'Messages', body: 'Messages are stored so founders and investors can maintain a permanent investment discussion record.' },
      { title: 'Firebase', body: 'Ai PromptFund uses Firebase services for authentication, Firestore records, file storage, notifications, and related infrastructure.' },
      { title: 'Storage', body: 'Uploaded files may be stored in Firebase Storage and linked to private discussion or profile records.' },
      { title: 'Analytics', body: 'Ai PromptFund may use operational analytics to understand reliability, usage, safety, and product performance.' },
      { title: 'Security', body: 'Ai PromptFund uses access controls and security rules to limit data access to authorized users, but no system can be guaranteed perfectly secure.' },
      { title: 'Retention', body: 'Ai PromptFund retains account, discussion, agreement, safety, and transaction-related records as needed for platform operation, compliance, dispute resolution, and legitimate business purposes.' },
      { title: 'Deletion', body: 'You may request account deletion from Profile settings. Some records may be retained when required for security, legal, audit, or dispute purposes.' },
      { title: 'Your Rights', body: 'Depending on your location, you may have rights to access, correct, delete, or export certain personal information.' },
      { title: 'Contact', body: 'Contact Ai PromptFund support for privacy questions or requests.' },
    ],
  },
  community: {
    key: 'community',
    title: 'Community Guidelines',
    subtitle: 'Rules for professional founder and angel investor interaction.',
    preview: 'Expected professional behaviour.',
    lastUpdated: 'Jun 2026',
    readingTimeMinutes: 3,
    sections: [
      { title: 'Professional Communication', body: 'Communicate clearly, respectfully, and in good faith.' },
      { title: 'No Harassment', body: 'Do not threaten, intimidate, shame, stalk, or harass other users.' },
      { title: 'No Scams', body: 'Do not misrepresent identity, credentials, funds, traction, business status, or investment intent.' },
      { title: 'No Spam', body: 'Do not send repetitive, irrelevant, unsolicited, or automated promotional content.' },
      { title: 'No Hate Speech', body: 'Do not attack people based on protected characteristics or identity.' },
      { title: 'No Fake Investors', body: 'Investors must not claim capital, authority, or affiliations they do not have.' },
      { title: 'No Fake Founders', body: 'Founders must not list companies, ownership, traction, revenue, or fundraising terms that are false or unauthorized.' },
      { title: 'Respect Confidentiality', body: 'Treat private discussions and uploaded materials as confidential unless permission is given.' },
      { title: 'Respect Copyright', body: 'Share only content and materials you own or have permission to use.' },
      { title: 'No Illegal Fundraising', body: 'Do not use Ai PromptFund to conduct unlawful securities activity, evade legal requirements, or mislead counterparties.' },
      { title: 'Consequences', body: 'Violations may result in warnings, removed content, blocked features, account suspension, termination, or reporting to appropriate authorities.' },
    ],
  },
  investmentDisclaimer: {
    key: 'investmentDisclaimer',
    title: 'Investment Disclaimer',
    subtitle: 'Important limits on Ai PromptFund’s role.',
    preview: 'Important information before investing.',
    lastUpdated: 'Jun 2026',
    readingTimeMinutes: 3,
    sections: [
      { title: 'Ai PromptFund Is Not a Broker', body: 'Ai PromptFund is not a broker, securities exchange, financial advisor, or investment advisor.' },
      { title: 'No Guarantees', body: 'Ai PromptFund never guarantees investments, fundraising outcomes, company performance, liquidity, or returns.' },
      { title: 'Due Diligence', body: 'Users are solely responsible for their own diligence, legal review, financial review, tax review, securities compliance, and investment decisions.' },
      { title: 'User Decisions', body: 'All investment decisions are made by users. Ai PromptFund does not recommend, endorse, or approve any startup or investor.' },
    ],
  },
  aiDisclosure: {
    key: 'aiDisclosure',
    title: 'AI Disclosure',
    subtitle: 'How AI-supported features should be understood.',
    preview: 'Understand how AI is used inside Ai PromptFund.',
    lastUpdated: 'Jun 2026',
    readingTimeMinutes: 2,
    sections: [
      { title: 'AI Assistance', body: 'AI features may assist communication, summaries, organization, drafting, or workflow support.' },
      { title: 'Not Legal Advice', body: 'AI features are not legal advice and should not replace qualified legal counsel.' },
      { title: 'Not Financial Advice', body: 'AI features are not financial advice and should not be used as a substitute for professional financial review.' },
      { title: 'Not Investment Advice', body: 'AI features are not investment advice and do not recommend whether to invest, raise capital, or accept terms.' },
      { title: 'User Responsibility', body: 'Users must review AI-assisted content carefully and remain responsible for decisions, statements, uploads, and agreements.' },
    ],
  },
  responsibilities: {
    key: 'responsibilities',
    title: 'Founder & Angel Investor Responsibilities',
    subtitle: 'Expectations for both sides of an investment discussion.',
    preview: 'Responsibilities for founders and angel investors.',
    lastUpdated: 'Jun 2026',
    readingTimeMinutes: 3,
    sections: [
      { title: 'Founder Responsibilities', body: 'Founders must share accurate business information, disclose material risks, respect investor confidentiality, avoid exaggerated claims, and seek qualified legal or financial guidance before accepting investment.' },
      { title: 'Angel Investor Responsibilities', body: 'Angel Investors must communicate professionally, avoid misleading funding claims, perform independent diligence, respect founder confidentiality, and comply with laws that apply to their investment activity.' },
      { title: 'Shared Responsibilities', body: 'Both sides must use Ai PromptFund in good faith, protect confidential information, avoid abusive behavior, and understand that investment decisions remain their own responsibility.' },
    ],
  },
};

export function legalVersionsMatch(accepted: Partial<LegalDocumentVersions> | null | undefined, required: LegalDocumentVersions) {
  return Boolean(
    accepted
    && accepted.appVersion === required.appVersion
    && accepted.termsVersion === required.termsVersion
    && accepted.privacyVersion === required.privacyVersion
    && accepted.communityVersion === required.communityVersion,
  );
}
