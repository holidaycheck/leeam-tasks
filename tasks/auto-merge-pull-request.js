const R = require('ramda');

const Cancel = Symbol('Cancel');
function ignoreCancellations(err) {
    return err === Cancel ? null : Promise.reject(err);
}

function fetchPullRequestRefAndMergeStatus(githubClient, repository, pullRequestData) {
    return githubClient.pullRequests.get({
        owner: repository.owner,
        repo: repository.name,
        number: pullRequestData.number
    }).then((response) => {
        const pullRequest = response.data;
        return R.merge(pullRequestData, {
            ref: pullRequest.head.ref,
            mergeable_state: pullRequest.mergeable_state
        });
    });
}

function mergePullRequest(githubClient, repository, pullRequestData) {
    return githubClient.pullRequests.merge({
        owner: repository.owner,
        repo: repository.name,
        number: pullRequestData.number
    }).then(R.always(pullRequestData));
}

function commentOnPullRequest(githubClient, label, repository, pullRequestData) {
    return githubClient.issues.createComment({
        owner: repository.owner,
        repo: repository.name,
        number: pullRequestData.number,
        body: `Hi, I noticed that this PR has a \`${label}\` label. ` +
        'Since all status checks are green I went ahead and merged it for you.'
    }).then(R.always(pullRequestData));
}

function deletePullRequestBranch(githubClient, repository, pullRequestData) {
    return githubClient.gitdata.deleteReference({
        owner: repository.owner,
        repo: repository.name,
        ref: `heads/${pullRequestData.ref}`
    }).then(R.always(pullRequestData));
}

function logSuccessfulMerge(logger, repository, pullRequestData) {
    logger.log(`Merged pull request ${repository.owner}/${repository.name}#${pullRequestData.number}`);
}

function findPullRequests(githubClient, label, repository) {
    return githubClient.search.issues({
        q: `repo:${repository.owner}/${repository.name}+type:pr+state:open+label:${label}`,
        order: 'asc',
        sort: 'created',
        per_page: 100
    });
}

module.exports = function autoMergePullRequest(logger, { githubClient, label, repository }) {
    function mergePullRequestWithStrategy(pickPullRequest, pullRequests) {
        return Promise.resolve(pickPullRequest(pullRequests))
            .then((pr) => pr || Promise.reject(Cancel))
            .then((pr) => fetchPullRequestRefAndMergeStatus(githubClient, repository, { number: pr.number }))
            .then((pullRequestData) => {
                if (pullRequestData.mergeable_state === 'clean') {
                    return mergePullRequest(githubClient, repository, pullRequestData)
                        .then(commentOnPullRequest.bind(null, githubClient, label, repository))
                        .then(deletePullRequestBranch.bind(null, githubClient, repository))
                        .then(logSuccessfulMerge.bind(null, logger, repository));
                }

                const mergeablePullRequests = pullRequests.filter((pullRequest) => {
                    return pullRequest.number !== pullRequestData.number;
                });

                return mergePullRequestWithStrategy(pickPullRequest, mergeablePullRequests);
            });
    }

    return findPullRequests(githubClient, label, repository)
        .then((response) => {
            const pickPullRequest = R.head;

            return mergePullRequestWithStrategy(pickPullRequest, response.data.items);
        }).catch(ignoreCancellations);
};
