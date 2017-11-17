const R = require('ramda');
const Cancel = Symbol('Cancel');

function ignoreCancellations(err) {
    return err === Cancel ? null : Promise.reject(err);
}

function validateAction(payload) {
    return payload.action === 'opened' ? payload : Promise.reject(Cancel);
}

function getChangedFiles(githubClient, githubParams) {
    const extractFilenames = R.pipe(R.prop('data'), R.map(R.prop('filename')));

    return githubClient.pullRequests.getFiles(githubParams)
        .then(extractFilenames);
}

function detectMissingFiles(fileSet, changedFiles) {
    return R.without(changedFiles, fileSet);
}

function postComment(githubClient, githubParams, fileSet, missingFiles) {
    const fileSetList = '`[' + fileSet.join(', ') + ']`';
    const missingFilesList = '`[' + missingFiles.join(', ') + ']`';

    const body = `Usually these filesets are changed together, but I detected some missing changes:\n\n` +
        `* in ${fileSetList} set there no change in these files: ${missingFilesList}\n\n` +
        `Please make sure that you didn't forget about something. If everything is all right, then sorry, my bad!`

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

    return Promise.resolve(payload)
        .then(validateAction)
        .then(getChangedFiles.bind(null, githubClient, githubParams))
        .then(detectMissingFiles.bind(null, fileSet))
        .then(postComment.bind(null, githubClient, githubParams, fileSet))
        .then(logMessage.bind(null, logger, githubParams))
        .catch(ignoreCancellations);
};
