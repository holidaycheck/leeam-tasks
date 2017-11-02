# Task `ping-old-pull-requests`

### What does it do?

Finds pull requests not updated in specified amount of time (by default it's one month) and adds a comment reminding people subscribed to that PR to do something about it.

### Should it be used as a hook or cron?

Cron.

### What dependencies are needed?

* `githubClient` - already authenticated instance of npm's [github](https://www.npmjs.com/package/github)
* `getCurrentDate` - function returning current date, in simplest form it would be `const getCurrentDate = () => new Date()`
* `olderThan` - (optional) object defining amount of time which should be taken into account to consider PR being stale. Eg. `{ value: 1, unit: 'day|week|month' }`. Please note, that hours/minutes/seconds are ignored.
* `repository` - object containing repo name and owner: `{ owner: 'hc-web', name: 'hc-react-web' }`
