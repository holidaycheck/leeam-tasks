const dateMath = require('date-arithmetic');
const dateFormat = require('dateformat');
const R = require('ramda');
const format = require('util').format;

function getLastUpdateDate(getCurrentDate, olderThan) {
    const updateBeforeDate = dateMath.subtract(getCurrentDate(), olderThan.value, olderThan.unit);

    return dateFormat(updateBeforeDate, 'yyyy-mm-dd');
}

function findPullRequests(githubClient, repository, lastUpdatedDate) {
    return githubClient.search.issues({
        q: `repo:${repository.owner}/${repository.name}+type:pr+state:open` +
        `+updated:<${lastUpdatedDate}`,
        per_page: 100
    }).then(R.path([ 'data', 'items' ]));
}

function pingPullRequest(githubClient, repository, olderThan, pullRequest) {
    return githubClient.issues.createComment({
        owner: repository.owner,
        repo: repository.name,
        number: pullRequest.number,
        body: format('Hi, I noticed that this pull request hasn\'t been touched in the last %d %s(s). ' +
            'Could you please do something about it? Thanks in advance!', olderThan.value, olderThan.unit)
    }).then(R.always(pullRequest));
}

function logSuccessfulPing(logger, repository, pullRequest) {
    logger.log(`Pinged pull request ${repository.owner}/${repository.name}#${pullRequest.number}`);
}

function logFoundPullRequestsIfFound(logger, lastUpdatedDate, pullRequests) {
    if (pullRequests.length > 0) {
        const pullRequestsList = pullRequests.map((pr) => `#${pr.number}`).join(', ');

        logger.log(`Pull requests updated before ${lastUpdatedDate}: [ ${pullRequestsList} ]`);
    }

    return pullRequests;
}

module.exports = function pingOldPullRequest(
    logger, { getCurrentDate, githubClient, repository, olderThan = { value: 1, unit: 'month' } }
) {
    const lastUpdatedDate = getLastUpdateDate(getCurrentDate, olderThan);

    return findPullRequests(githubClient, repository, lastUpdatedDate)
        .then(logFoundPullRequestsIfFound.bind(null, logger, lastUpdatedDate))
        .then((pullRequestsToPing) => {
            const pingPullRequestWithParams = pingPullRequest.bind(null, githubClient, repository, olderThan);
            const logSuccessWithParams = logSuccessfulPing.bind(null, logger, repository);

            return Promise.all(pullRequestsToPing.map((pullRequest) => {
                return pingPullRequestWithParams(pullRequest)
                    .then(logSuccessWithParams);
            }));
        });
};
