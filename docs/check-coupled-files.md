# Task `check-coupled-files`

### What does it do?

For each opened pull request it checks, whether files that usually should be changed in one changeset are actually changed.
Think for example - whenever `package.json` changes, `package-lock.json`, should also be changed.
If it detects missing change in one of fileset, it's reported in form of comment under pull request.

### Should it be used as a hook or cron?

Hook for `pull_request` event.

### What dependencies are needed?

* `githubClient` - already authenticated instance of npm's [github](https://www.npmjs.com/package/github)
* `fileSets` - array of filesets to check. Each fileset is an array. Example:
```javascript
    const fileSets = [
        [ 'deps.json', 'deps.lock' ], // checked separately from second fileset
        [ 'README.md', 'docs/README.html', 'docs/README.pdf' ]
    ];
```
