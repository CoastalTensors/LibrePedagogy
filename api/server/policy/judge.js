const { loadPolicy } = require('./index');
const { CustomOpenAIClient: OpenAI } = require('@librechat/agents');

/** Local copy of isEnabled to avoid module-alias requirements during tests */
function isEnabled(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
  return false;
}

/**
 * Build a minimal OpenAI-compatible client using configured endpoint.
 * Supports OpenRouter via librechat.yaml (custom endpoints) or falls back to OpenAI.
 * @param {ServerRequest} req
 */
function getJudgeLLM(req) {
  const appConfig = req?.config || {};
  let baseURL = 'https://api.openai.com/v1';
  let apiKey = process.env.OPENAI_API_KEY;
  let defaultHeaders = undefined;
  let configuredModel = undefined;
  let supportsJSONFormat = false;

  try {
    const customEndpoints = appConfig?.endpoints?.custom || [];
    const openrouter = customEndpoints.find((e) =>
      (e?.name || '').toLowerCase().includes('openrouter') || (e?.baseURL || '').includes('openrouter.ai'),
    );
    if (openrouter) {
      baseURL = openrouter.baseURL || 'https://openrouter.ai/api/v1';
      apiKey = process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY || apiKey;
      defaultHeaders = {
        'HTTP-Referer': 'https://librechat.ai',
        'X-Title': 'LibreChat',
      };
      const defaults = Array.isArray(openrouter?.models?.default)
        ? openrouter.models.default
        : [];
      configuredModel = defaults[0];
      supportsJSONFormat = true;
    }
  } catch {}

  if (!apiKey || apiKey === 'user_provided') {
    return null;
  }

  const opts = { baseURL };
  if (defaultHeaders) {
    opts.defaultHeaders = defaultHeaders;
  }

  const openai = new OpenAI({ apiKey, ...opts });
  return { openai, configuredModel, supportsJSONFormat };
}

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

  // Heuristic removed per request: rely solely on LLM judge

  // Attempt LLM judge if available (env keys often required). If it fails, default to allow.
  try {
    const result = getJudgeLLM(req);
    if (!result) {
      return { blocked: false, categories: [], reason: 'llm_unavailable', rewrite: null };
    }
    const { openai, configuredModel, supportsJSONFormat } = result;

    const system = policy.judgePrompt;
    const prompt = `USER_PROMPT:\n${userText}`;
    const model = req?.body?.model || configuredModel || 'gpt-4o-mini';
    const params = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: 512,
      temperature: 0,
    };
    if (supportsJSONFormat) {
      params.response_format = { type: 'json_object' };
    }
    const completion = await openai.chat.completions.create(params);

    const content = completion?.choices?.[0]?.message?.content ?? '';
    // Try direct JSON parse
    try {
      const json = JSON.parse(content);
      const { blocked, categories = [], reason = '', rewrite = null } = json || {};
      return {
        blocked: !!blocked,
        categories: Array.isArray(categories) ? categories : [],
        reason: String(reason || ''),
        rewrite: rewrite != null ? String(rewrite) : null,
      };
    } catch {}

    // Fallback: extract JSON object from content
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const json = JSON.parse(match[0]);
        const { blocked, categories = [], reason = '', rewrite = null } = json || {};
        return {
          blocked: !!blocked,
          categories: Array.isArray(categories) ? categories : [],
          reason: String(reason || ''),
          rewrite: rewrite != null ? String(rewrite) : null,
        };
      }
      return { blocked: false, categories: [], reason: 'parse_error', rewrite: null };
    } catch (err) {
      return { blocked: false, categories: [], reason: 'parse_error', rewrite: null };
    }
  } catch (error) {
    return { blocked: false, categories: [], reason: 'judge_error', rewrite: null };
  }
}

module.exports = { judgePrompt };


