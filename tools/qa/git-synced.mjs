// Passes only when the working tree is clean and HEAD matches origin/main after a fetch.
import { execFileSync } from 'node:child_process';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
git('fetch', 'origin', 'main', '--quiet');
const dirty = git('status', '--porcelain');
const head = git('rev-parse', 'HEAD');
const remote = git('rev-parse', 'origin/main');
console.log(`HEAD ${head.slice(0, 7)} · origin/main ${remote.slice(0, 7)} · ${dirty ? dirty.split('\n').length + ' uncommitted path(s)' : 'clean'}`);
if (dirty || head !== remote) process.exit(1);
console.log('GIT SYNCED');
