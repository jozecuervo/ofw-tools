const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    throw error;
  }
}

function writeFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    fs.writeFileSync(filePath, data);
  } catch (error) {
    console.error(`Failed to write to ${filePath}:`, error);
    throw error;
  }
}

function writeJson(filePath, obj) {
  const json = JSON.stringify(obj, null, 2);
  writeFile(filePath, json);
}

module.exports = { ensureDir, writeFile, writeJson };


