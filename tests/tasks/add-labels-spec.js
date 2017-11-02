const expect = require('chai').expect;
const sinon = require('sinon');

const addLabels = require('../../tasks/add-labels');

describe('task add-labels', () => {
    const payload = {
        number: 123,
        action: 'opened',
        repository: {
            name: 'bar',
            full_name: 'foo/bar',
            owner: {
                login: 'foo'
            }
        }
    };

    it('should ignore pull request with different than "opened"', () => {
        const ignoredActions = [ 'assigned', 'unassigned', 'labeled', 'unlabeled', 'edited', 'closed', 'reopened' ];
        const createTestCaseForAction = (action) => {
            const logger = { log: sinon.spy() };
            const githubClient = {
                issues: {
                    getIssueLabels: sinon.spy()
                }
            };

            return addLabels(logger, { githubClient }, { number: 123, action })
                .then(() => expect(githubClient.issues.getIssueLabels).not.to.have.been.called);
        };

        return Promise.all(ignoredActions.map(createTestCaseForAction));
    });

    it('should add specified labels', () => {
        const logger = { log: sinon.spy() };
        const githubClient = {
            issues: {
                getIssueLabels: sinon.stub().resolves({ data: [] }),
                addLabels: sinon.stub().resolves()
            }
        };

        return addLabels(logger, { githubClient, labels: [ 'foo', 'bar' ] }, payload)
            .then(() => {
                expect(githubClient.issues.addLabels).to.have.been.calledWithExactly({
                    owner: 'foo',
                    repo: 'bar',
                    number: 123,
                    labels: [ 'foo', 'bar' ]
                });

                expect(logger.log).to.have.been
                    .calledOnce
                    .calledWithExactly('Added labels [ "foo", "bar" ] to pull request foo/bar#123');
            });
    });

    it('should not add specified label when PR contains at least one of ignored labels', () => {
        const logger = { log: sinon.spy() };
        const githubClient = {
            issues: {
                addLabels: sinon.spy(),
                getIssueLabels: sinon.stub().resolves({ data: [ {
                    name: 'greenkeeper'
                } ] })
            }
        };

        return addLabels(logger, { githubClient, labels: [ 'foobar' ], ignored: [ 'greenkeeper' ] }, payload)
            .then(() => {
                expect(githubClient.issues.getIssueLabels).to.have.been.calledWithExactly({
                    owner: 'foo',
                    repo: 'bar',
                    number: 123
                });

                expect(githubClient.issues.addLabels).not.to.have.been.called;
                expect(logger.log).to.have.been
                    .calledWithExactly('Ignoring pull request foo/bar#123 - ' +
                        'it contains at least one of ignored labels: [ "greenkeeper" ]');
            });
    });
});
