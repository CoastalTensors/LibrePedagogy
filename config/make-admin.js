const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const mongoose = require('mongoose');
const { User } = require('@librechat/data-schemas').createModels(mongoose);
const { SystemRoles } = require('librechat-data-provider');
const { askQuestion, silentExit } = require('./helpers');
const connect = require('./connect');

(async () => {
  await connect();

  console.purple('--------------------------');
  console.purple('Make User Admin');
  console.purple('--------------------------');

  if (process.argv.length < 3) {
    console.orange('Usage: npm run make-admin <email> [--demote]');
    console.orange('Note: if you do not pass in the email, you will be prompted for it.');
    console.orange('Use --demote flag to remove admin privileges and set user back to regular user role.');
    console.purple('--------------------------');
  }

  let email = '';
  let demote = false;

  // Parse command line arguments
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--demote') {
      demote = true;
      continue;
    }
    if (!email) {
      email = process.argv[i];
    }
  }

  if (!email) {
    email = await askQuestion('Email:');
  }

  if (!email.includes('@')) {
    console.red('Error: Invalid email address!');
    silentExit(1);
  }

  const user = await User.findOne({ email });
  if (!user) {
    console.red(`Error: User with email ${email} not found!`);
    silentExit(1);
  }

  const targetRole = demote ? SystemRoles.USER : SystemRoles.ADMIN;
  const action = demote ? 'demoted from admin to user' : 'promoted to admin';

  if (user.role === targetRole) {
    console.orange(`User ${email} is already ${demote ? 'a regular user' : 'an admin'}!`);
    silentExit(0);
  }

  try {
    await User.updateOne({ email }, { $set: { role: targetRole } });
    console.green(`✓ User ${email} has been ${action}`);
    console.green(`Previous role: ${user.role}`);
    console.green(`New role: ${targetRole}`);
    silentExit(0);
  } catch (error) {
    console.red('Error updating user role: ' + error.message);
    silentExit(1);
  }
})();

process.on('uncaughtException', (err) => {
  if (!err.message.includes('fetch failed')) {
    console.error('There was an uncaught error:');
    console.error(err);
  }

  if (err.message.includes('fetch failed')) {
    return;
  } else {
    process.exit(1);
  }
});