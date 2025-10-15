const crypto = require('crypto');
const { loadPolicy } = require('~/server/policy');
const { judgePrompt } = require('~/server/policy/judge');
const denyRequest = require('~/server/middleware/denyRequest');

/**
 * Logger helper for policy middleware
 */
function logPolicy(level, message, data = {}) {
  const prefix = '[POLICY]';
  const logData = Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '';

  if (level === 'error') {
    console.error(`${prefix} ${message}`, logData);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, logData);
  } else {
    console.log(`${prefix} ${message}`, logData);
  }
}

/**
  * Middleware that judges the incoming user prompt and blocks it if unsafe.
  * - If blocked: sends a normal assistant-like response with policy.badPromptMessage via SSE.
  * - Otherwise: forwards unchanged user text; an educational system prefix may be added.
 */
async function policyMiddleware(req, res, next) {
  try {
    const policy = loadPolicy();
    const { text = '', promptPrefix = '', endpoint = 'unknown' } = req.body || {};

    logPolicy('info', `Policy check for endpoint: ${endpoint}`);

    // Judge the user text
    const result = await judgePrompt({ req, res, userText: text });

    if (result.blocked) {
      logPolicy('warn', 'Request BLOCKED by judge', {
        reason: result.reason,
        categories: result.categories,
        textPreview: text.substring(0, 100),
      });
      return await denyRequest(req, res, policy.badPromptMessage);
    }

    logPolicy('info', 'Request ALLOWED by judge', { reason: result.reason });

    // Apply an educational system prefix (idempotently)
    const prefix = String(promptPrefix || '');
    if (!prefix.includes(policy.assistantSystemPrefix)) {
      req.body.promptPrefix = `${policy.assistantSystemPrefix}\n\n${prefix}`.trim();
      logPolicy('info', 'Applied educational system prefix');
    }

    return next();
  } catch (err) {
    // Fail-open to avoid blocking chats in case of policy errors
    logPolicy('error', 'Policy middleware error - failing open', {
      error: err.message,
      stack: err.stack,
    });
    return next();
  }
}

module.exports = policyMiddleware;