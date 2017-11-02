const R = require('ramda');

const Cancel = Symbol('Cancel');
function ignoreCancellations(err) {
    return err === Cancel ? null : Promise.reject(err);
}

function validateAction(payload) {
    return payload.action === 'opened' ? payload : Promise.reject(Cancel);
}

function extractJiraId(payload) {
    const jiraId = payload.pull_request.title.match(/[A-Z]+-\d+/);

    return jiraId ?
        R.merge(payload, { jiraId: jiraId[0] }) :
        Promise.reject(Cancel);
}

function updatePullRequest(githubClient, jiraBaseUrl, payload) {
    return githubClient.pullRequests.update({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        number: payload.number,
        base: payload.pull_request.base.ref,
        body: `${payload.pull_request.body}\n\n**Auto-linked issue**: ${jiraBaseUrl}browse/${payload.jiraId}`
    }).then(R.always(payload));
}

function logSuccess(logger, payload) {
    logger.log(`Added JIRA ${payload.jiraId} link to pull request ${payload.repository.full_name}#${payload.number}`);
}

module.exports = function addJiraLink(logger, { githubClient, jiraBaseUrl }, payload) {
    return Promise.resolve(payload)
        .then(validateAction)
        .then(extractJiraId)
        .then(updatePullRequest.bind(null, githubClient, jiraBaseUrl))
        .then(logSuccess.bind(null, logger))
        .catch(ignoreCancellations);
};
