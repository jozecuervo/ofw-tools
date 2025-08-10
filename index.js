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

// CLI wrapper intentionally resides in `ofw.js` so it can be invoked via `node ofw.js`


