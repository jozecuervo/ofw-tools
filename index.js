// Thin wrapper to retain existing entry point while moving the OFW tool to `ofw.js`
const { __processMessages, __parseMessage, parsePdfFile, runCli } = require('./ofw');

// Re-export for tests/backwards-compat
module.exports = { __processMessages, __parseMessage, parsePdfFile };

if (require.main === module) {
  const args = process.argv.slice(2);
  const result = runCli(args);
  if (result && typeof result.then === 'function') {
    result.catch(() => {});
  }
}


