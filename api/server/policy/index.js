const path = require('path');

/**
 * Loads the policy configuration and prompts.
 * Exposes helpers to access judge/rewrite prompts and default messages.
 */
function loadPolicy() {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const config = require(path.resolve(__dirname, './config'));
  return config;
}

module.exports = {
  loadPolicy,
};