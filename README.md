Set of automation tasks for [liam](https://github.com/holidaycheck/liam).

Due to the `liam`s architecture, you need to install peer dependencies. You can do this manually or use [`npm-install-peers`](https://www.npmjs.com/package/npm-install-peers) by simply calling `npx npm-install-peers`. (since `npm@5.2.0`).

**NOTE:** you don't have to use `liam` if you want to use these tasks - each is a separate function with all required dependencies being injected during execution.

### Usage

## With `liam` (recommended)

See [example](https://github.com/holidaycheck/liam#example-code) in `liam`'s repository. Just `import/require` required tasks from `@holidaycheck/liam-tasks/tasks/[task-name]`;

## Without `liam` (not-recommneded)

Just `require` specific task and pass required arguments:

```javascript
const task = require('@holidaycheck/liam-tasks/tasks/add-jira-link')
const githubClient = require('github')({ ... })
const logger = console;
githubClient.authenticate({
    type: "token",
    token: '..', // you can hardcode token or pass it through ENV
});

task(logger, { githubClient }) //this task will run once and script will end.
```

### What tasks are currently implemented?

* [`add-labels`](./docs/add-labels.md)
* [`add-jira-link`](./docs/add-jira-link.md)
* [`check-coupled-files`](./docs/check-coupled-files.md)
* [`auto-merge-pull-request`](./docs/auto-merge-pull-request.md)
* [`ping-old-pull-requests`](./docs/ping-old-pull-requests.md)
