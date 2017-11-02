const formatString = require('util').format;
const R = require('ramda');

const Cancel = Symbol('Cancel');
function ignoreCancellations(err) {
    return err === Cancel ? null : Promise.reject(err);
}

function validatePullRequestAction(payload) {
    return payload.action === 'opened' ? payload : Promise.reject(Cancel);
}

function getPullRequestLabels(githubClient, payload) {
    return githubClient.issues.getIssueLabels({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        number: payload.number
    }).then((response) => R.assocPath([ 'pull_request', 'labels' ], response.data, payload));
}

function addPullRequestLabels(githubClient, labels, payload) {
    return githubClient.issues.addLabels({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        number: payload.number,
        labels: [].concat(labels)
    }).then(R.always(payload));
}

function hasIgnoredLabel(labels, ignored) {
    return labels.some((label) => R.contains(label.name, ignored));
}

function logIgnore(logger, ignored, payload) {
    const labelsList = ignored.map((l) => `"${l}"`).join(', ');

    logger.log(formatString(
        'Ignoring pull request %s#%d - it contains at least one of ignored labels: [ %s ]',
        payload.repository.full_name, payload.number, labelsList
    ));
}

function checkForIgnoredLabels(logger, ignored, payload) {
    if (hasIgnoredLabel(payload.pull_request.labels, ignored)) {
        logIgnore(logger, ignored, payload);

        return Promise.reject(Cancel);
    }

    return payload;
}

function logSuccess(logger, labels, payload) {
    const labelsList = labels.map((l) => `"${l}"`).join(', ');

    logger.log(formatString(
        'Added labels [ %s ] to pull request %s#%d',
        labelsList, payload.repository.full_name, payload.number
    ));
}

module.exports = function addLabels(logger, { githubClient, labels, ignored = [] }, payload) {
    return Promise.resolve(payload)
        .then(validatePullRequestAction)
        .then(getPullRequestLabels.bind(null, githubClient))
        .then(checkForIgnoredLabels.bind(null, logger, ignored))
        .then(addPullRequestLabels.bind(null, githubClient, labels))
        .then(logSuccess.bind(null, logger, labels))
        .catch(ignoreCancellations);
};
