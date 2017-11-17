const expect = require('chai').expect;
const sinon = require('sinon');

const checkCoupledFiles = require('../../tasks/check-coupled-files');

describe('task check-coupled-files', () => {
    const defaultPayload = {
        number: 123,
        action: 'opened',
        repository: {
            name: 'bar',
            owner: {
                login: 'foo'
            }
        }
    };

    function createGithubClient() {
        return {
            pullRequests: {
                getFiles: sinon.stub()
            },
            issues: {
                createComment: sinon.stub().resolves()
            }
        };
    }

    it('should detect non-changed files', function () {
        const logger = { log: sinon.spy() };
        const githubClient = createGithubClient();
        githubClient.pullRequests.getFiles.resolves({ data:
            [ { filename: 'deps.json' }, { filename: 'README.md' } ]
        });
        const fileSets = [ [ 'deps.json', 'deps.lock' ] ];

        checkCoupledFiles(logger, { githubClient, fileSets }, defaultPayload).then(() => {
            expect(githubClient.pullRequests.getFiles).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 123
            });

            expect(githubClient.issues.createComment).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 123,
                body: 'Usually these filesets are changed together, but I detected some missing changes:\n\n' +
                      '* in `[deps.json, deps.lock]` set there no change in these files: `[deps.lock]`\n\n' +
                       'Please make sure that you didn\'t forget about something. ' +
                       'If everything is all right, then sorry, my bad!'
            });

            expect(logger.log).to.have.been.calledWithExactly('Posted info under pull request foo/bar#123');
        });
    });

    it('should detect changes in multiple filesets', function () {
        const logger = { log: sinon.spy() };
        const githubClient = createGithubClient();
        githubClient.pullRequests.getFiles.resolves({ data: [
            { filename: 'deps.json' },
            { filename: 'docs/README.html' }
        ] });
        const fileSets = [
            [ 'deps.json', 'deps.lock' ],
            [ 'README.md', 'docs/README.html', 'docs/README.pdf' ]
        ];

        checkCoupledFiles(logger, { githubClient, fileSets }, defaultPayload).then(() => {
            expect(githubClient.pullRequests.getFiles).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 123
            });

            expect(githubClient.issues.createComment).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 123,
                body: 'Usually these filesets are changed together, but I detected some missing changes:\n\n' +
                      '* in `[deps.json, deps.lock]` set there no change in these files: `[deps.lock]`\n' +
                      '* in `[README.md, docs/README.html, docs/README.pdf]` set there no change ' +
                      'in these files: `[README.md, docs/README.pdf]`\n\n' +
                      'Please make sure that you didn\'t forget about something. ' +
                       'If everything is all right, then sorry, my bad!'
            });

            expect(logger.log).to.have.been.calledWithExactly('Posted info under pull request foo/bar#123');
        });
    });

    it('should perform check link only for opened pull requests', () => {
        const ignoredActions = [ 'assigned', 'unassigned', 'labeled', 'unlabeled', 'edited', 'closed', 'reopened' ];
        const createTestCaseForAction = (action) => {
            const logger = { log: sinon.spy() };
            const githubClient = createGithubClient();
            const payload = Object.assign({}, defaultPayload, { action });

            return checkCoupledFiles(logger, { githubClient, fileSets: [] }, payload)
                .then(() => {
                    expect(githubClient.pullRequests.getFiles).not.to.have.been.called;
                    expect(githubClient.issues.createComment).not.to.have.been.called;
                    expect(logger.log).not.to.have.been.called;
                });
        };

        return Promise.all(ignoredActions.map(createTestCaseForAction));
    });
});
