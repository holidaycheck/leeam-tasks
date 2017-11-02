# Task `add-needs-review-label`

### What does it do?

It adds specified labels to each newly opened pull request, except pull request created by `greenkeeper`.

### Should it be used as a hook or cron?

Hook for `pull_request` event.

### What dependencies are needed?

* `githubClient` - already authenticated instance of npm's [github](https://www.npmjs.com/package/github)
* `labels` - _(string[])_ labels to add
* `ignored` - _(string[])_ ignore PR if it has at least one of those labels
