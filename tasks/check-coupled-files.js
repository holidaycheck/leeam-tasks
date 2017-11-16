const R = require('ramda');

function getChangedFiles(githubClient, githubParams) {
    return githubClient.pullRequests.getFiles(githubParams)
        .then(R.prop('data'))
        .then(R.map(R.prop('filename')));
}

function detectMissingFiles(fileSet, changedFiles) {
    return R.without(changedFiles, fileSet);
}

function postComment(githubClient, githubParams, fileSet, missingFiles) {
    const wrapWithCodeMarkup = (str) => `\`${ str }\``;
    const fileSetList = fileSet.map(wrapWithCodeMarkup).join(', ');
    const missingFilesList = missingFiles.map(wrapWithCodeMarkup).join(', ');

    const body = `Usually these files: ${fileSetList} are changed together in one changeset.\n` +
        `However, in this pull request these files are not changed: ${missingFilesList}.\n` +
        'Please make sure that you didn\'t forget about something. If everything is all right, then sorry, my bad!';

    return githubClient.issues.createComment(R.merge(githubParams, { body }));
}

function logMessage(logger, githubParams) {
    logger.log(`Posted info under pull request ${githubParams.owner}/${githubParams.repo}#${githubParams.number}`);
}

module.exports = function checkCoupledFiles(logger, { githubClient, fileSet }, payload) {
    const githubParams = {
        number: payload.number,
        owner: payload.repository.owner.login,
        repo: payload.repository.name
    };

    return getChangedFiles(githubClient, githubParams)
        .then(detectMissingFiles.bind(null, fileSet))
        .then(postComment.bind(null, githubClient, githubParams, fileSet))
        .then(logMessage.bind(null, logger, githubParams));
};
