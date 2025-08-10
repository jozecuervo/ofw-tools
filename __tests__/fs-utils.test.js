const fs = require('fs');
const path = require('path');
const os = require('os');
const { ensureDir, writeFile, writeJson } = require('../utils/fs');

describe('utils/fs', () => {
  test('ensureDir + writeFile + writeJson', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ofw-'));
    const dir = path.join(tmp, 'nested');
    const txtPath = path.join(dir, 'a.txt');
    const jsonPath = path.join(dir, 'b.json');
    ensureDir(dir);
    writeFile(txtPath, 'hello');
    expect(fs.readFileSync(txtPath, 'utf8')).toBe('hello');
    writeJson(jsonPath, { x: 1 });
    const read = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(read.x).toBe(1);
  });
});


