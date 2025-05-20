const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const THEME_DIR = './'; // Root of the theme directory
const LOG_FILE = path.join(__dirname, 'deploy-log.txt');
const updatedFiles = [];

// Log utility
function log(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, fullMessage);
  console.log(fullMessage);
}

// Recursive walk function
function walk(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

// Clean media links in a file
function cleanMediaLinks(file) {
  if (!file.endsWith('.json') && !file.endsWith('.liquid')) return;

  try {
    let content = fs.readFileSync(file, 'utf-8');
    const original = content;

    // Replace hosted media URLs or `shopify:` references with empty string
    content = content.replace(/"(https:\/\/cdn\.shopify\.com[^"]+|shopify:[^"]+|shopify:)"/g, '""');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf-8');
      updatedFiles.push(file);
      log(`Cleaned media in: ${file}`);
    }
  } catch (err) {
    log(`Error processing file ${file}: ${err.message}\nError code: ${err.code}\nStack trace:\n${err.stack}`);
  }
}

// Log Git-changed files before push
function logGitChanges() {
  try {
    const output = execSync(
      'git show --name-status --pretty=format:"# Changes to be committed:%n"',
      { cwd: process.cwd(), encoding: 'utf-8' }
    );

    const lines = output
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.startsWith('M') || line.startsWith('A') || line.startsWith('D') ? `#\t${line}` : line);

    if (lines.length > 1) {
      log(lines.join('\n'));
    } else {
      log('# No changes committed yet.');
    }
  } catch (err) {
    log(`Error detecting recent commit files: ${err.message}\nError code: ${err.code}\nStack trace:\n${err.stack}`);
  }
}


// Log files changed in the latest commit
function logLastCommitFiles() {
  try {
    const output = execSync('git show --name-only --pretty="" HEAD', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });

    const files = output
      .split('\n')
      .filter(f => f.trim().length > 0);

    if (files.length > 0) {
      log(`Files changed in the latest commit:\n${files.map(f => `  - ${f}`).join('\n')}`);
    } else {
      log('No files changed in the latest commit.');
    }
  } catch (err) {
    log(`Error detecting files in the latest commit: ${err.message}\nError code: ${err.code}\nStack trace:\n${err.stack}`);
  }
}

// Main execution
(function main() {
  try {
    log('--- Starting theme media cleanup ---');
    walk(THEME_DIR, cleanMediaLinks);

    if (updatedFiles.length > 0) {
      log(`\nSummary of updated files:\n${updatedFiles.map(f => `  - ${f}`).join('\n')}\n`);
    } else {
      log('No files were updated during cleanup.\n');
    }

    logGitChanges();
    // logLastCommitFiles();
    log('--- Cleanup complete ---\n');
  } catch (err) {
    log(`Fatal error: ${err.message}\nError code: ${err.code}\nStack trace:\n${err.stack}`);
  }
})();
