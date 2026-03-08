// Anti-circumvention: Contact masking and keyword monitoring utilities

// Patterns that suggest trying to move off-platform
const SUSPICIOUS_PATTERNS = [
  /\b\d{10,}\b/g,                          // Phone numbers (10+ digits)
  /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,}[-.\s]?\d{2,}/g, // International phone
  /[\w.-]+@[\w.-]+\.\w{2,}/g,              // Email addresses
  /\bwhatsapp\b/gi,
  /\bwhats\s*app\b/gi,
  /\btelegram\b/gi,
  /\bsignal\b/gi,
  /\bwechat\b/gi,
  /\bpay\s*(me\s*)?direct(ly)?\b/gi,
  /\bpay\s*outside\b/gi,
  /\boff[\s-]*platform\b/gi,
  /\bbank\s*transfer\s*direct\b/gi,
  /\bm[\s-]*pesa\s*direct\b/gi,
  /\bsend\s*money\s*to\b/gi,
  /\bmy\s*(phone|number|cell|mobile)\s*(is|:)\b/gi,
  /\bcall\s*me\s*(at|on)\b/gi,
  /\btext\s*me\b/gi,
  /\breach\s*me\s*(at|on)\b/gi,
];

export interface MessageScanResult {
  isFlagged: boolean;
  reasons: string[];
  sanitizedMessage: string;
}

export function scanMessage(message: string): MessageScanResult {
  const reasons: string[] = [];
  let sanitized = message;

  for (const pattern of SUSPICIOUS_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const matches = message.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (/\d{10,}/.test(match) || /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?/.test(match)) {
          reasons.push('Phone number detected');
          sanitized = sanitized.replace(match, '[contact hidden]');
        } else if (/@/.test(match)) {
          reasons.push('Email address detected');
          sanitized = sanitized.replace(match, '[contact hidden]');
        } else {
          reasons.push(`Suspicious keyword: "${match.trim()}"`);
        }
      }
    }
  }

  return {
    isFlagged: reasons.length > 0,
    reasons: [...new Set(reasons)],
    sanitizedMessage: sanitized,
  };
}

// Mask contact info in displayed text (for profiles, etc.)
export function maskContactInfo(text: string): string {
  if (!text) return text;
  // Mask phone numbers
  let masked = text.replace(/\b(\d{3})\d{4,}(\d{3})\b/g, '$1****$2');
  // Mask emails
  masked = masked.replace(/([\w])([\w.-]*)@([\w.-]+)/g, '$1***@$3');
  return masked;
}

// Check if user should see raw contact info (only after confirmed order)
export function canSeeContacts(orderStatus: string, paymentStatus: string): boolean {
  return paymentStatus === 'paid' && ['Confirmed', 'Shipped', 'Completed'].includes(orderStatus);
}
