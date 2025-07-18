#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📝 Generating Release Notes with M4 Features\n');

// Read package.json to get version and M4 feature info
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const appVersion = packageJson.version;
const m4Features = packageJson.m4Features || {};

// Get git log since last tag
let lastTag = '';
try {
  lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null').toString().trim();
} catch (error) {
  console.log('No previous tags found, generating notes for all commits');
}

// Get commits since last tag
let commits = [];
try {
  const gitLogCommand = lastTag 
    ? `git log ${lastTag}..HEAD --pretty=format:"%h|%s|%an|%ai"`
    : `git log --pretty=format:"%h|%s|%an|%ai"`;
  
  const rawCommits = execSync(gitLogCommand).toString().trim();
  if (rawCommits) {
    commits = rawCommits.split('\n').map(line => {
      const [hash, subject, author, date] = line.split('|');
      return { hash, subject, author, date };
    });
  }
} catch (error) {
  console.error('Failed to get git commits:', error.message);
}

// Categorize commits
const categories = {
  features: [],
  fixes: [],
  m4: [],
  performance: [],
  docs: [],
  tests: [],
  build: [],
  other: []
};

commits.forEach(commit => {
  const subject = commit.subject.toLowerCase();
  
  if (subject.includes('feat:') || subject.includes('feature:')) {
    categories.features.push(commit);
  } else if (subject.includes('fix:') || subject.includes('bug:')) {
    categories.fixes.push(commit);
  } else if (subject.includes('m4') || subject.includes('dialogue') || subject.includes('string processor')) {
    categories.m4.push(commit);
  } else if (subject.includes('perf:') || subject.includes('performance')) {
    categories.performance.push(commit);
  } else if (subject.includes('docs:') || subject.includes('doc:')) {
    categories.docs.push(commit);
  } else if (subject.includes('test:') || subject.includes('tests:')) {
    categories.tests.push(commit);
  } else if (subject.includes('build:') || subject.includes('ci:')) {
    categories.build.push(commit);
  } else {
    categories.other.push(commit);
  }
});

// Generate release notes
let releaseNotes = `# Sebastian v${appVersion} Release Notes\n\n`;
releaseNotes += `Released on: ${new Date().toISOString().split('T')[0]}\n\n`;

// Add M4 Features section
if (m4Features.version) {
  releaseNotes += `## 🎯 M4 Features (v${m4Features.version})\n\n`;
  
  if (m4Features.components) {
    releaseNotes += '### Component Versions:\n';
    Object.entries(m4Features.components).forEach(([component, version]) => {
      const componentName = component
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      releaseNotes += `- **${componentName}**: v${version}\n`;
    });
    releaseNotes += '\n';
  }
  
  if (categories.m4.length > 0) {
    releaseNotes += '### M4-Related Changes:\n';
    categories.m4.forEach(commit => {
      releaseNotes += `- ${commit.subject} (${commit.hash})\n`;
    });
    releaseNotes += '\n';
  }
}

// Add other sections
if (categories.features.length > 0) {
  releaseNotes += '## ✨ New Features\n\n';
  categories.features.forEach(commit => {
    releaseNotes += `- ${commit.subject} (${commit.hash})\n`;
  });
  releaseNotes += '\n';
}

if (categories.fixes.length > 0) {
  releaseNotes += '## 🐛 Bug Fixes\n\n';
  categories.fixes.forEach(commit => {
    releaseNotes += `- ${commit.subject} (${commit.hash})\n`;
  });
  releaseNotes += '\n';
}

if (categories.performance.length > 0) {
  releaseNotes += '## ⚡ Performance Improvements\n\n';
  categories.performance.forEach(commit => {
    releaseNotes += `- ${commit.subject} (${commit.hash})\n`;
  });
  releaseNotes += '\n';
}

// Technical details section
if (categories.tests.length > 0 || categories.build.length > 0) {
  releaseNotes += '## 🔧 Technical Updates\n\n';
  
  if (categories.tests.length > 0) {
    releaseNotes += '### Tests\n';
    categories.tests.forEach(commit => {
      releaseNotes += `- ${commit.subject} (${commit.hash})\n`;
    });
    releaseNotes += '\n';
  }
  
  if (categories.build.length > 0) {
    releaseNotes += '### Build & CI\n';
    categories.build.forEach(commit => {
      releaseNotes += `- ${commit.subject} (${commit.hash})\n`;
    });
    releaseNotes += '\n';
  }
}

// Migration notes
releaseNotes += '## 📋 Update Notes\n\n';
releaseNotes += '### M4 Feature Compatibility\n';
releaseNotes += '- All M4 features are automatically included in this update\n';
releaseNotes += '- Worker thread files are properly bundled and unpacked\n';
releaseNotes += '- M4 settings are preserved during the update process\n';
releaseNotes += '- No manual migration steps required\n\n';

// Installation
releaseNotes += '## 📦 Installation\n\n';
releaseNotes += '### Windows\n';
releaseNotes += `Download \`Sebastian-${appVersion}-Setup.exe\` and run the installer.\n\n`;
releaseNotes += '### Auto-Update\n';
releaseNotes += 'If you have a previous version installed, Sebastian will automatically check for updates and prompt you to install.\n\n';

// Contributors
const contributors = new Set();
commits.forEach(commit => contributors.add(commit.author));

if (contributors.size > 0) {
  releaseNotes += '## 👥 Contributors\n\n';
  releaseNotes += 'Thanks to all contributors:\n';
  contributors.forEach(contributor => {
    releaseNotes += `- ${contributor}\n`;
  });
  releaseNotes += '\n';
}

// Footer
releaseNotes += '---\n';
releaseNotes += `Full changelog: ${lastTag ? `[${lastTag}...v${appVersion}](https://github.com/JaekyungCho2140/sebastian/compare/${lastTag}...v${appVersion})` : 'First release'}\n`;

// Save release notes
const releaseNotesPath = path.join(process.cwd(), `RELEASE_NOTES_v${appVersion}.md`);
fs.writeFileSync(releaseNotesPath, releaseNotes);

console.log(`✅ Release notes generated: ${releaseNotesPath}`);
console.log('\nRelease Notes Preview:');
console.log('='.repeat(60));
console.log(releaseNotes);
console.log('='.repeat(60));