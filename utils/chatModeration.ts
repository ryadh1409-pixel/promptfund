export type ModerationCategory =
  | 'profanity'
  | 'hate_speech'
  | 'threats'
  | 'harassment'
  | 'sexual_abuse'
  | 'illegal_content'
  | 'scams'
  | 'spam'
  | 'malicious_links';

const moderationPatterns: Array<{ category: ModerationCategory; pattern: RegExp }> = [
  { category: 'profanity', pattern: /\b(fuck|shit|bitch|asshole)\b/i },
  { category: 'hate_speech', pattern: /\b(kill all|racial slur|nazi)\b/i },
  { category: 'threats', pattern: /\b(i will kill|hurt you|track you down|threat)\b/i },
  { category: 'harassment', pattern: /\b(stupid idiot|worthless|go die)\b/i },
  { category: 'sexual_abuse', pattern: /\b(child sexual|csam|minor nude)\b/i },
  { category: 'illegal_content', pattern: /\b(cocaine|weapon shipment|fake passport|money laundering)\b/i },
  { category: 'scams', pattern: /\b(guaranteed return|send crypto|seed phrase|wire me first)\b/i },
  { category: 'spam', pattern: /(.)\1{12,}|(?:https?:\/\/\S+\s*){3,}/i },
  { category: 'malicious_links', pattern: /\b(bit\.ly|tinyurl\.com|t\.me\/|free-airdrop|wallet-connect)\b/i },
];

export function moderateChatMessage(body: string) {
  const flags = moderationPatterns
    .filter(({ pattern }) => pattern.test(body))
    .map(({ category }) => category);

  return {
    allowed: flags.length === 0,
    flags,
  };
}
