const crypto = require('crypto');
const { loadPolicy } = require('~/server/policy');
const { judgePrompt } = require('~/server/policy/judge');
const denyRequest = require('~/server/middleware/denyRequest');

/**
  * Middleware that judges the incoming user prompt and blocks it if unsafe.
  * - If blocked: sends a normal assistant-like response with policy.badPromptMessage via SSE.
  * - Otherwise: forwards unchanged user text; an educational system prefix may be added.
 */
async function policyMiddleware(req, res, next) {
  try {
    const policy = loadPolicy();
    const { text = '', promptPrefix = '' } = req.body || {};

    // Judge the user text
    const result = await judgePrompt({ req, res, userText: text });

    if (result.blocked) {
      return await denyRequest(req, res, policy.badPromptMessage);
    }

    // Apply an educational system prefix (idempotently)
    const prefix = String(promptPrefix || '');
    if (!prefix.includes(policy.assistantSystemPrefix)) {
      req.body.promptPrefix = `${policy.assistantSystemPrefix}\n\n${prefix}`.trim();
    }

    return next();
  } catch (err) {
    // Fail-open to avoid blocking chats in case of policy errors
    return next();
  }
}

module.exports = policyMiddleware;


