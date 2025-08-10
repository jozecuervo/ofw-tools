// Package public API surface aggregated from `ofw.js` and underlying utils
const ofw = require('./ofw');
const { parseMessage, processMessages } = require('./utils/ofw/parser');
const { accumulateStats } = require('./utils/ofw/stats');
const markdown = require('./utils/output/markdown');
const csv = require('./utils/output/csv');

// Public API
module.exports = {
  // High-level OFW tool API
  parsePdfFile: ofw.parsePdfFile,
  writeJsonFile: ofw.writeJsonFile,
  writeMarkDownFile: ofw.writeMarkDownFile,
  compileAndOutputStats: ofw.compileAndOutputStats,
  outputMarkdownSummary: ofw.outputMarkdownSummary,
  outputCSV: ofw.outputCSV,
  runCli: ofw.runCli,
  // Lower-level building blocks for library consumers
  parseMessage,
  processMessages,
  accumulateStats,
  ...markdown,
  ...csv,
  // Back-compat test internals
  __processMessages: ofw.__processMessages,
  __parseMessage: ofw.__parseMessage,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const result = ofw.runCli(args);
  if (result && typeof result.then === 'function') {
    result.catch(() => {});
  }
}


