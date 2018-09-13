# Task `auto-merge-pull-request`

### What does it do?

Looks for pull request matching criteria:

* opened
* has specified label

From that list selects one and checks if that one can be merged (`mergeable_state` === `clean`). If yes, merge is performed and branch is deleted. If not, then it tries with another pull request from result set, until one is merged or there's no pull request left.

### Should it be used as a hook or cron?

Cron.

### What dependencies are needed?

* `label` - label which must be attached to pull request to take into account for auto-merge
* `githubClient` - already authenticated instance of npm's [github](https://www.npmjs.com/package/github)
* `repository` - object containing repository which branches should be compared with CrowdIn: `{ owner: 'foo', name: 'bar' }`.

### FAQ

* **What is the strategy for selecting pull request?**

Oldest pull request (by `created` attribute value).

* What is this `mergeable_state` field in pull request response? I cannot find this in API docs

This value is undocumented, here's the excerpt from GitHub Support:

* *dirty*: Merge conflict. Merging will be blocked
* *unknown*: Mergeability was not checked yet. Merging will be blocked
* *blocked*: Blocked by a failing/missing required status check.
* *behind*: Head branch is behind the base branch. Only if required status checks is enabled but loose policy is not. Merging will be blocked.
* *unstable*: Failing/pending commit status that is not part of the required status checks. Merging is allowed (yellow box).
* *has_hooks*: This is for Enterprise only, if a repo has custom pre-receive hooks. Merging is allowed (green box).
* *clean*: No conflicts, everything good. Merging is allowed (green box).

Basically, we're interested only in `mergeable_state === clean|unstable`
