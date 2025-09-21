const { loadPolicy } = require('./index');
const { isEnabled } = require('~/server/utils');
const { getOpenAIClient } = require('~/server/controllers/assistants/helpers');

/**
 * Calls an LLM to judge a prompt against safety/education policy.
 * Returns { blocked, categories, reason, rewrite }.
 * If disabled or errors, returns a permissive default.
 * @param {object} params
 * @param {ServerRequest} params.req
 * @param {ServerResponse} params.res
 * @param {string} params.userText
 */
async function judgePrompt({ req, res, userText }) {
  const policy = loadPolicy();

  // Allow disabling judge with env flag
  if (!isEnabled(process.env.POLICY_JUDGE_ENABLED)) {
    return { blocked: false, categories: [], reason: 'judge disabled', rewrite: null };
  }

  try {
    // Reuse the same client infra; default to assistants endpoint for compatibility
    const { openai } = await getOpenAIClient({ req, res, overrideEndpoint: 'assistants' });

    const system = policy.judgePrompt;
    const prompt = `USER_PROMPT:\n${userText}`;
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: 512,
      temperature: 0,
    });

    const content = completion?.choices?.[0]?.message?.content ?? '';
    try {
      const json = JSON.parse(content);
      const { blocked, categories = [], reason = '', rewrite = null } = json || {};
      return {
        blocked: !!blocked,
        categories: Array.isArray(categories) ? categories : [],
        reason: String(reason || ''),
        rewrite: rewrite != null ? String(rewrite) : null,
      };
    } catch (err) {
      return { blocked: false, categories: [], reason: 'parse error', rewrite: null };
    }
  } catch (error) {
    return { blocked: false, categories: [], reason: 'judge error', rewrite: null };
  }
}

module.exports = { judgePrompt };


