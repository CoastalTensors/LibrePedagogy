const crypto = require('crypto');
const { loadPolicy } = require('~/server/policy');
const { judgePrompt } = require('~/server/policy/judge');
const { sendError } = require('~/server/middleware/error');

/**
  * Middleware that judges the incoming user prompt and blocks it if unsafe.
  * - If blocked: sends a normal assistant-like response with policy.badPromptMessage via SSE.
  * - Otherwise: forwards unchanged user text; an educational system prefix may be added.
 */
async function policyMiddleware(req, res, next) {
  try {
    const policy = loadPolicy();
    const {
      text = '',
      promptPrefix = '',
      messageId = crypto.randomUUID(),
      conversationId = crypto.randomUUID(),
      parentMessageId,
    } = req.body || {};

    // Judge the user text
    const result = await judgePrompt({ req, res, userText: text });

    if (result.blocked) {
      return sendError(
        req,
        res,
        {
          user: req.user.id,
          sender: 'Assistant',
          conversationId,
          messageId: crypto.randomUUID(),
          parentMessageId: messageId,
          text: policy.badPromptMessage,
          error: false,
          shouldSaveMessage: true,
        },
      );
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


