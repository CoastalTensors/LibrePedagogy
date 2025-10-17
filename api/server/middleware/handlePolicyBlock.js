const { v4 } = require('uuid');
const { sendEvent } = require('@librechat/api');
const { Constants } = require('librechat-data-provider');
const { saveMessage } = require('~/models');

/**
 * Middleware that checks if a request was blocked by the policy judge.
 * If blocked, it sends the canned response immediately and ends the request.
 * This allows the conversation to be created properly (even for first messages).
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
async function handlePolicyBlock(req, res, next) {
  // Check if policy middleware marked this as blocked
  if (!req.policyJudgment || !req.policyJudgment.blocked) {
    return next(); // Not blocked, continue normally
  }

  console.log('[POLICY_BLOCK] Handling blocked request with canned response');

  const {
    text,
    messageId: _messageId,
    conversationId: _conversationId,
    parentMessageId: _parentMessageId,
  } = req.body;

  const { cannedResponse } = req.policyJudgment;

  // Generate IDs like the normal flow would
  const userMessageId = _messageId || v4();
  const responseMessageId = v4();
  const conversationId = _conversationId || v4();
  const parentMessageId = _parentMessageId || Constants.NO_PARENT;

  // Create user message
  const userMessage = {
    user: req.user.id,
    text,
    messageId: userMessageId,
    parentMessageId,
    conversationId,
    isCreatedByUser: true,
    sender: 'User',
  };

  // Send user message event
  sendEvent(res, { message: userMessage, created: true });

  // Save user message to database
  await saveMessage(req, { ...userMessage }, { context: 'handlePolicyBlock - user message' });

  // Create canned response message
  const responseMessage = {
    user: req.user.id,
    text: cannedResponse,
    messageId: responseMessageId,
    parentMessageId: userMessageId,
    conversationId,
    isCreatedByUser: false,
    sender: 'Assistant',
    model: req.body.model || 'policy-judge',
    endpoint: req.body.endpoint,
  };

  // Save response message to database
  await saveMessage(req, { ...responseMessage }, { context: 'handlePolicyBlock - canned response' });

  // Send final event with both messages
  sendEvent(res, {
    final: true,
    conversation: {
      conversationId,
      endpoint: req.body.endpoint,
      title: 'New Chat',
    },
    requestMessage: userMessage,
    responseMessage,
  });

  // End the response
  res.end();

  console.log('[POLICY_BLOCK] Sent canned response and ended request');
}

module.exports = handlePolicyBlock;