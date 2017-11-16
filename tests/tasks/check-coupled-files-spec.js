const expect = require('chai').expect;
const sinon = require('sinon');

const checkCoupledFiles = require('../../tasks/check-coupled-files');

describe('task check-coupled-files', () => {
    it('should detect non-changed files', function () {
        const logger = { log: sinon.spy() };
        const payload = {
            number: 123,
            repository: {
                name: 'bar',
                owner: {
                    login: 'foo'
                }
            }
        };
        const githubClient = {
            pullRequests: {
                getFiles: sinon.stub().resolves({
                    data: [ { filename: 'deps.json' }, { filename: 'README.md.txt' } ]
                })
            },
            issues: {
                createComment: sinon.stub().resolves()
            }
        };

        checkCoupledFiles(logger, { githubClient, fileSet: [ 'deps.json', 'deps.lock' ] }, payload).then(() => {
            expect(githubClient.pullRequests.getFiles).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 123
            });

            expect(githubClient.issues.createComment).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 123,
                body: 'Usually these files: `deps.json`, `deps.lock` are changed together in one changeset.\n' +
                      'However, in this pull request these files are not changed: `deps.lock`.\n' +
                      'Please make sure that you didn\'t forget about something. ' +
                      'If everything is all right, then sorry, my bad!'
            });

            expect(logger.log).to.have.been.calledWithExactly('Posted info under pull request foo/bar#123');
        });
    });
});
