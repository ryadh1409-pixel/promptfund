import type { ModerationResult } from '@/types/ChatSafety';

export type ModerationCategory =
  | 'profanity'
  | 'hate_speech'
  | 'threats'
  | 'harassment'
  | 'sexual_content'
  | 'spam'
  | 'scams'
  | 'malicious_links';

type ModerationPattern = {
  category: ModerationCategory;
  reason: string;
  pattern: RegExp;
};

const moderationPatterns: ModerationPattern[] = [
  {
    category: 'profanity',
    reason: 'Profanity is not allowed in investment conversations.',
    pattern: /\b(fuck|shit|bitch|asshole|cunt|damn\s+you)\b/i,
  },
  {
    category: 'hate_speech',
    reason: 'Hate speech is not allowed on PromptFund.',
    pattern: /\b(kill all|racial slur|nazi|white supremac)\b/i,
  },
  {
    category: 'threats',
    reason: 'Threatening language is not allowed.',
    pattern: /\b(i will kill|hurt you|track you down|i'?ll find you|threaten)\b/i,
  },
  {
    category: 'harassment',
    reason: 'Harassing language is not allowed.',
    pattern: /\b(stupid idiot|worthless|go die|loser|pathetic)\b/i,
  },
  {
    category: 'sexual_content',
    reason: 'Sexual content is not allowed in investment chats.',
    pattern: /\b(child sexual|csam|minor nude|explicit nude|porn)\b/i,
  },
  {
    category: 'scams',
    reason: 'Potential scam language was detected.',
    pattern: /\b(guaranteed return|send crypto|seed phrase|wire me first|double your money)\b/i,
  },
  {
    category: 'spam',
    reason: 'Spam patterns were detected.',
    pattern: /(.)\1{12,}|(?:https?:\/\/\S+\s*){3,}/i,
  },
  {
    category: 'malicious_links',
    reason: 'Suspicious links are not allowed.',
    pattern: /\b(bit\.ly|tinyurl\.com|t\.me\/|free-airdrop|wallet-connect)\b/i,
  },
];

function normalizeInput(body: string) {
  return body.trim();
}

export function containsProfanity(body: string) {
  return moderationPatterns.some((item) => item.category === 'profanity' && item.pattern.test(normalizeInput(body)));
}

export function containsThreats(body: string) {
  return moderationPatterns.some((item) => item.category === 'threats' && item.pattern.test(normalizeInput(body)));
}

export function containsHarassment(body: string) {
  return moderationPatterns.some((item) => item.category === 'harassment' && item.pattern.test(normalizeInput(body)));
}

export function containsHateSpeech(body: string) {
  return moderationPatterns.some((item) => item.category === 'hate_speech' && item.pattern.test(normalizeInput(body)));
}

export function containsSexualContent(body: string) {
  return moderationPatterns.some((item) => item.category === 'sexual_content' && item.pattern.test(normalizeInput(body)));
}

export function containsSpam(body: string) {
  return moderationPatterns.some((item) => item.category === 'spam' && item.pattern.test(normalizeInput(body)));
}

export function moderateMessage(body: string): ModerationResult {
  const normalized = normalizeInput(body);
  if (!normalized) {
    return { allowed: true };
  }

  const match = moderationPatterns.find((item) => item.pattern.test(normalized));
  if (!match) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: match.reason,
  };
}

/** Backward-compatible moderation helper used by existing chat and traction services. */
export function moderateChatMessage(body: string) {
  const result = moderateMessage(body);
  return {
    allowed: result.allowed,
    flags: result.allowed
      ? []
      : moderationPatterns
        .filter((item) => item.pattern.test(normalizeInput(body)))
        .map((item) => item.category),
  };
}
