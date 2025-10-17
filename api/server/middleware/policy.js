const { loadPolicy } = require('~/server/policy');
const { judgePrompt } = require('~/server/policy/judge');

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
  * Middleware that judges the incoming user prompt.
  * - If blocked: attaches judge result to req.policyJudgment with blocked=true and canned response
  * - Otherwise: applies educational system prefix and forwards normally
  * - Never blocks the request - lets the controller handle creating the conversation properly
 */
async function policyMiddleware(req, res, next) {
  try {
    const policy = loadPolicy();
    const { text = '', promptPrefix = '', endpoint = 'unknown' } = req.body || {};

    logPolicy('info', `Policy check for endpoint: ${endpoint}`);

    // Judge the user text
    const result = await judgePrompt({ req, res, userText: text });

    if (result.blocked) {
      logPolicy('warn', 'Request BLOCKED by judge - attaching canned response', {
        reason: result.reason,
        categories: result.categories,
        textPreview: text.substring(0, 100),
      });

      // Attach the judgment to the request for the controller to handle
      req.policyJudgment = {
        blocked: true,
        reason: result.reason,
        categories: result.categories,
        cannedResponse: policy.badPromptMessage,
      };

      // No need to add educational prefix - we're not calling the LLM
      // Continue to handlePolicyBlock middleware which will send canned response
      return next();
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