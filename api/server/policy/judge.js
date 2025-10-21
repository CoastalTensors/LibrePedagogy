const { loadPolicy } = require('./index');
const { CustomOpenAIClient: OpenAI } = require('@librechat/agents');
const { EModelEndpoint } = require('librechat-data-provider');

/** Local copy of isEnabled to avoid module-alias requirements during tests */
function isEnabled(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
  return false;
}

/** Logger helper for judge decisions */
function logJudge(level, message, data = {}) {
  const prefix = '[JUDGE]';
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
 * Build a client using the configured endpoint or user's endpoint.
 * Properly handles Google, custom, and OpenAI endpoints.
 * @param {ServerRequest} req
 */
async function getJudgeLLM(req) {
  const { getCustomEndpointConfig } = require('@librechat/api');
  const { extractEnvVariable, envVarRegex, AuthKeys } = require('librechat-data-provider');

  const appConfig = req?.config || {};

  // Use POLICY_JUDGE_ENDPOINT if configured, otherwise use user's endpoint
  const targetEndpoint = process.env.POLICY_JUDGE_ENDPOINT || req?.body?.endpoint;
  const configuredModel = process.env.POLICY_JUDGE_MODEL || undefined;

  logJudge('info', `Target endpoint: ${targetEndpoint || 'none (defaulting to OpenAI)'}`);

  // Handle Google endpoint using proper GoogleClient
  if (targetEndpoint === EModelEndpoint.google || targetEndpoint === 'google') {
    return await getGoogleJudgeLLM(req, appConfig, configuredModel);
  }

  // Handle custom/OpenRouter endpoints with OpenAI-compatible API
  return getOpenAICompatibleJudgeLLM(req, appConfig, targetEndpoint, configuredModel);
}

/**
 * Create a Google client for judge using the same infrastructure as chat
 * @param {ServerRequest} req
 * @param {AppConfig} appConfig
 * @param {string} configuredModel
 */
async function getGoogleJudgeLLM(req, appConfig, configuredModel) {
  const { AuthKeys } = require('librechat-data-provider');
  const { GoogleClient } = require('~/app');

  const GOOGLE_KEY = process.env.GOOGLE_KEY;

  if (!GOOGLE_KEY || GOOGLE_KEY === 'user_provided') {
    logJudge('warn', 'Google endpoint selected but no valid GOOGLE_KEY found');
    return null;
  }

  // Get model from config if not explicitly set
  let model = configuredModel;
  if (!model) {
    const googleConfig = appConfig?.endpoints?.[EModelEndpoint.google];
    const models = googleConfig?.models?.default;
    if (Array.isArray(models) && models.length > 0) {
      model = models[0];
    } else {
      // Default to a fast, cheap model for judging
      model = 'gemini-2.0-flash-lite';
    }
  }

  const credentials = {
    [AuthKeys.GOOGLE_API_KEY]: GOOGLE_KEY,
  };

  const clientOptions = {
    req,
    res: req.res,
    modelOptions: {
      model,
    },
  };

  try {
    const client = new GoogleClient(credentials, clientOptions);
    logJudge('info', `Using Google client`, { model });

    return {
      client,
      model,
      endpoint: EModelEndpoint.google,
      isGoogle: true,
    };
  } catch (error) {
    logJudge('error', 'Failed to create Google client', { error: error.message });
    return null;
  }
}

/**
 * Create OpenAI-compatible client for judge (OpenRouter, custom endpoints, OpenAI)
 * @param {ServerRequest} req
 * @param {AppConfig} appConfig
 * @param {string} endpoint
 * @param {string} configuredModel
 */
function getOpenAICompatibleJudgeLLM(req, appConfig, endpoint, configuredModel) {
  const { extractEnvVariable, envVarRegex } = require('librechat-data-provider');

  let baseURL = 'https://api.openai.com/v1';
  let apiKey = process.env.OPENAI_API_KEY;
  let defaultHeaders = undefined;
  let model = configuredModel;
  let supportsJSONFormat = false;

  // Try to use custom endpoint config
  try {
    if (endpoint && endpoint !== 'openAI' && endpoint !== 'azureOpenAI') {
      const endpointConfig = getCustomEndpointConfig({ endpoint, appConfig });

      if (endpointConfig) {
        const CUSTOM_API_KEY = extractEnvVariable(endpointConfig.apiKey);
        const CUSTOM_BASE_URL = extractEnvVariable(endpointConfig.baseURL);

        if (!CUSTOM_API_KEY.match(envVarRegex) && CUSTOM_API_KEY !== 'user_provided') {
          apiKey = CUSTOM_API_KEY;
        }

        if (!CUSTOM_BASE_URL.match(envVarRegex)) {
          baseURL = CUSTOM_BASE_URL;
        }

        // Extract configured model from endpoint if not explicitly set
        if (!model) {
          const models = endpointConfig?.models?.default;
          if (Array.isArray(models) && models.length > 0) {
            model = models[0];
          }
        }

        // OpenRouter and most custom endpoints support JSON format
        supportsJSONFormat = true;

        // Check if this is OpenRouter for special headers
        if (
          endpointConfig.name?.toLowerCase().includes('openrouter') ||
          baseURL.includes('openrouter.ai')
        ) {
          defaultHeaders = {
            'HTTP-Referer': 'https://librechat.ai',
            'X-Title': 'LibreChat Judge',
          };
        }

        logJudge('info', `Using custom endpoint config: ${endpoint}`, {
          baseURL,
          model,
        });
      }
    }
  } catch (err) {
    logJudge('warn', 'Failed to load custom endpoint config, falling back to OpenAI', {
      error: err.message,
    });
  }

  if (!apiKey || apiKey === 'user_provided') {
    logJudge('warn', 'No valid API key available');
    return null;
  }

  const opts = { baseURL };
  if (defaultHeaders) {
    opts.defaultHeaders = defaultHeaders;
  }

  const openai = new OpenAI({ apiKey, ...opts });
  return {
    client: openai,
    model,
    endpoint: endpoint || 'openAI',
    supportsJSONFormat,
    isGoogle: false,
  };
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
    logJudge('info', 'Judge disabled via POLICY_JUDGE_ENABLED');
    return { blocked: false, categories: [], reason: 'judge disabled', rewrite: null };
  }

  logJudge('info', `Judging prompt: "${userText.substring(0, 100)}${userText.length > 100 ? '...' : ''}"`);

  // Heuristic removed per request: rely solely on LLM judge

  // Attempt LLM judge if available (env keys often required). If it fails, default to allow.
  try {
    const result = await getJudgeLLM(req);
    if (!result) {
      logJudge('warn', 'LLM unavailable - no valid API key found');
      return { blocked: false, categories: [], reason: 'llm_unavailable', rewrite: null };
    }

    const { client, model, isGoogle, supportsJSONFormat } = result;
    const system = policy.judgePrompt;
    const prompt = `USER_PROMPT:\n${userText}`;

    logJudge('info', `Using model: ${model} (${isGoogle ? 'Google' : 'OpenAI-compatible'})`);

    let content;

    // Handle Google client differently
    if (isGoogle) {
      // Build payload for Google (it expects a specific format)
      const payload = [
        {
          role: 'user',
          parts: [{ text: `${system}\n\n${prompt}` }],
        },
      ];

      client.setOptions({
        modelOptions: {
          model,
          maxOutputTokens: 512,
          temperature: 0,
        },
      });

      // Send message to Google with required options
      const abortController = new AbortController();
      const response = await client.sendCompletion(payload, {
        abortController,
        onProgress: () => {}, // No-op progress handler
      });
      content = response || '';
    } else {
      // OpenAI-compatible client
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
      const completion = await client.chat.completions.create(params);
      content = completion?.choices?.[0]?.message?.content ?? '';
    }

    logJudge('info', `LLM raw response: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);

    // Try direct JSON parse
    try {
      const json = JSON.parse(content);
      const { blocked, categories = [], reason = '', rewrite = null } = json || {};
      const decision = {
        blocked: !!blocked,
        categories: Array.isArray(categories) ? categories : [],
        reason: String(reason || ''),
        rewrite: rewrite != null ? String(rewrite) : null,
      };

      logJudge('info', `Decision: ${blocked ? 'BLOCKED' : 'ALLOWED'}`, {
        reason: decision.reason,
        categories: decision.categories,
      });

      return decision;
    } catch (parseErr) {
      logJudge('warn', 'Direct JSON parse failed, trying fallback extraction', {
        error: parseErr.message,
      });
    }

    // Fallback: extract JSON object from content
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const json = JSON.parse(match[0]);
        const { blocked, categories = [], reason = '', rewrite = null } = json || {};
        const decision = {
          blocked: !!blocked,
          categories: Array.isArray(categories) ? categories : [],
          reason: String(reason || ''),
          rewrite: rewrite != null ? String(rewrite) : null,
        };

        logJudge('info', `Decision (fallback): ${blocked ? 'BLOCKED' : 'ALLOWED'}`, {
          reason: decision.reason,
          categories: decision.categories,
        });

        return decision;
      }
      logJudge('error', 'Parse error - no valid JSON found in response', { content });
      return { blocked: false, categories: [], reason: 'parse_error', rewrite: null };
    } catch (err) {
      logJudge('error', 'Parse error - fallback extraction failed', {
        error: err.message,
        content,
      });
      return { blocked: false, categories: [], reason: 'parse_error', rewrite: null };
    }
  } catch (error) {
    logJudge('error', 'Judge error - LLM call failed', {
      error: error.message,
      stack: error.stack,
    });
    return { blocked: false, categories: [], reason: 'judge_error', rewrite: null };
  }
}

module.exports = { judgePrompt };