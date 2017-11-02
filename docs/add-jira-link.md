# Task `add-jira-link`

### What does it do?

Whenever newly opened pull request contains valid JIRA ID in title, it adds link to that issue to PR body.

### Should it be used as a hook or cron?

Hook for `pull_request` event.

### What dependencies are needed?

* `githubClient` - already authenticated instance of npm's [github](https://www.npmjs.com/package/github)
* `jiraBaseUrl` - eg. `https://jira.hc.ag/jira/`
