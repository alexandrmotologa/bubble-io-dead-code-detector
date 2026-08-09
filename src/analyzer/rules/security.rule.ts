/**
 * Rule: Security Audit
 * Detects potential security issues in Bubble app exports.
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';

// Common patterns for hardcoded secrets/keys
const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{24,}/,           // Stripe live secret
  /sk_test_[a-zA-Z0-9]{24,}/,            // Stripe test secret
  /AKIA[0-9A-Z]{16}/,                     // AWS Access Key
  /AIza[0-9A-Za-z\-_]{35}/,              // Google API Key
  /[a-f0-9]{32}:[a-f0-9]{32}/,          // Generic token pattern
  /Bearer [a-zA-Z0-9\-._~+/]+=*/,        // Bearer token
  /api[_-]?key['":\s]+[a-zA-Z0-9\-_]{20,}/i,
];

export const securityRule: BubbleRule = {
  id: 'security',
  name: 'Security Issue',
  description:
    'Detects potential security issues: missing privacy rules on sensitive data types, hardcoded API keys, exposed data types without restrictions.',
  category: 'security',
  defaultSeverity: 'error',
  defaultEnabled: true,

  check({ app, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];

    // Check 1: Data types without privacy rules
    const checkPrivacyRules = config['checkPrivacyRules'] !== false;
    if (checkPrivacyRules) {
      const sensitiveKeywords = ['user', 'payment', 'card', 'secret', 'token', 'password', 'private'];

      for (const dt of app.dataTypes) {
        const isSensitive = sensitiveKeywords.some((kw) =>
          dt.name.toLowerCase().includes(kw),
        );
        if (isSensitive && !dt.hasPrivacyRules) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: 'error',
            confidence: 'MEDIUM',
            category: this.category,
            message: `Data type "${dt.name}" appears to contain sensitive data but has no privacy rules configured`,
            location: {
              type: 'data_type',
              id: `dt_${dt.id}`,
              name: dt.name,
            },
            safeToDelete: false,
            impactedBy: [],
            suggestion: `Add privacy rules to "${dt.name}" in the Bubble editor under Data → Privacy to restrict access to sensitive fields.`,
            metadata: { dataTypeSlug: dt.id, hasPrivacyRules: false },
          });
        }
      }
    }

    // Check 2: Data types exposed via API without privacy rules
    const checkExposedEndpoints = config['checkExposedEndpoints'] !== false;
    if (checkExposedEndpoints) {
      for (const dt of app.dataTypes) {
        if (dt.isExposedViaApi && !dt.hasPrivacyRules) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: 'error',
            confidence: 'HIGH',
            category: this.category,
            message: `Data type "${dt.name}" is exposed via the Data API without privacy rules — potential data leak`,
            location: {
              type: 'data_type',
              id: `dt_${dt.id}`,
              name: dt.name,
            },
            safeToDelete: false,
            impactedBy: [],
            suggestion: `Either disable the Data API for "${dt.name}" in Settings → API, or add privacy rules to restrict access.`,
            metadata: { dataTypeSlug: dt.id, isExposedViaApi: true },
          });
        }
      }
    }

    // Check 3: Look for hardcoded secrets in settings
    const checkHardcodedKeys = config['checkHardcodedKeys'] !== false;
    if (checkHardcodedKeys) {
      // We only have access to client_safe settings — secure settings are redacted
      // Still check for accidentally exposed keys in client_safe
      const clientSafeStr = JSON.stringify(app.reusableElements).slice(0, 50000);
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(clientSafeStr)) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: 'error',
            confidence: 'MEDIUM',
            category: this.category,
            message: `Possible hardcoded API key or secret detected in app export (pattern: ${pattern.source.slice(0, 30)}...)`,
            location: {
              type: 'page',
              id: 'app',
              name: 'Application',
            },
            safeToDelete: false,
            impactedBy: [],
            suggestion: `Use Bubble's built-in key management (Settings → API) instead of hardcoding secrets in element properties or HTML elements.`,
            metadata: { pattern: pattern.source },
          });
          break; // Report once per pattern type
        }
      }
    }

    return findings;
  },
};
