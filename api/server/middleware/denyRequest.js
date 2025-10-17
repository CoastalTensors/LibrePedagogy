const crypto = require('crypto');
const { sendEvent } = require('@librechat/api');
const { getResponseSender, Constants } = require('librechat-data-provider');
const { sendError } = require('~/server/middleware/error');
const { saveMessage } = require('~/models');

/**
 * Logger helper for deny request
 */
function logDeny(level, message, data = {}) {
  const prefix = '[DENY]';
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
 * Denies a request by sending an error message and optionally saves the user's message.
 *
 * @async
 * @function
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The body of the request.
 * @param {string} [req.body.messageId] - The ID of the message.
 * @param {string} [req.body.conversationId] - The ID of the conversation.
 * @param {string} [req.body.parentMessageId] - The ID of the parent message.
 * @param {string} req.body.text - The text of the message.
 * @param {Object} res - Express response object.
 * @param {string} errorMessage - The error message to be sent.
 * @returns {Promise<Object>} A promise that resolves with the error response.
 * @throws {Error} Throws an error if there's an issue saving the message or sending the error.
 */
const denyRequest = async (req, res, errorMessage) => {
  let responseText = errorMessage;
  if (typeof errorMessage === 'object') {
    responseText = JSON.stringify(errorMessage);
  }

  const { messageId, conversationId: _convoId, parentMessageId, text } = req.body;
  const conversationId = _convoId ?? crypto.randomUUID();

  // Always treat as non-error to keep it as part of the conversation
  const isFirstMessage = !_convoId || !parentMessageId || parentMessageId === Constants.NO_PARENT;

  logDeny('info', 'Denying request', {
    hasConvoId: !!_convoId,
    hasParentId: !!parentMessageId,
    isFirstMessage,
    textPreview: text.substring(0, 50),
  });

  const userMessage = {
    sender: 'User',
    messageId: messageId ?? crypto.randomUUID(),
    parentMessageId: parentMessageId || Constants.NO_PARENT,
    conversationId,
    isCreatedByUser: true,
    text,
  };
  sendEvent(res, { message: userMessage, created: true });

  // Always save the message to make it part of the conversation
  const shouldSaveMessage = true;

  if (shouldSaveMessage) {
    await saveMessage(
      req,
      { ...userMessage, user: req.user.id },
      { context: `api/server/middleware/denyRequest.js - ${responseText}` },
    );
  }

  logDeny('info', `Sending denial as conversation message (error=false)`, {
    conversationId,
    responsePreview: responseText.substring(0, 50),
    isFirstMessage,
  });

  // Always set error: false to make it a normal conversation message
  return await sendError(req, res, {
    sender: getResponseSender(req.body),
    messageId: crypto.randomUUID(),
    conversationId,
    parentMessageId: userMessage.messageId,
    text: responseText,
    error: false, // Always false - treat as normal conversation message
    shouldSaveMessage,
    user: req.user.id,
  });
};

module.exports = denyRequest;
