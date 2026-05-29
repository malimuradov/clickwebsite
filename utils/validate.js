/**
 * Lightweight schema validator (swap for Zod/Joi if preferred).
 * Each rule is: { type, required, min, max, maxLength }
 *
 * @param {Object} data - Incoming payload
 * @param {Object} schema - Field rules
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validate = (data, schema) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data?.[field];
    const missing = value === undefined || value === null || value === '';

    if (rules.required && missing) {
      errors.push(`'${field}' is required`);
      continue;
    }

    if (missing) continue;

    if (rules.type && typeof value !== rules.type) {
      errors.push(`'${field}' must be a ${rules.type}`);
    }

    if (rules.type === 'string') {
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`'${field}' must be at most ${rules.maxLength} characters`);
      }
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`'${field}' must be at least ${rules.minLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`'${field}' has an invalid format`);
      }
    }

    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`'${field}' must be >= ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`'${field}' must be <= ${rules.max}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
};

// ─── Reusable Schemas ──────────────────────────────────────────────────────────

const schemas = {
  chatMessage: {
    username: { type: 'string', required: true, maxLength: 32 },
    message:  { type: 'string', required: true, maxLength: 500 },
  },

  clickData: {
    clickValue:    { type: 'number', required: true, min: 0, max: 1000 },
    isNaturalClick: { type: 'boolean' },
  },

  upgrades: {
    flatClickBonus:       { type: 'number', required: true, min: 0 },
    percentageClickBonus: { type: 'number', required: true, min: 1 },
    flatAutoClicker:      { type: 'number', required: true, min: 0 },
    percentAutoClicker:   { type: 'number', required: true, min: 0 },
    bestCPS:              { type: 'number', required: true, min: 0 },
  },

  createAccount: {
    username: { type: 'string', required: true, minLength: 3, maxLength: 32 },
    email:    { type: 'string', required: true, maxLength: 254 },
    password: { type: 'string', required: true, minLength: 8, maxLength: 128 },
  },

  setUsername: {
    newUsername: { type: 'string', required: true, minLength: 3, maxLength: 32 },
  },
};

module.exports = { validate, schemas };
