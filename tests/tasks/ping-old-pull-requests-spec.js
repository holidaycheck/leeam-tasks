const expect = require('chai').expect;
const sinon = require('sinon');

const pingOldPullRequests = require('../../tasks/ping-old-pull-requests');

describe('task ping-old-pull-request', () => {
    const getCurrentDate = () => new Date('2015-12-12');
    /* eslint-disable camelcase */
    const searchIssuesData = {
        total_count: 3,
        incomplete_results: false,
        items: [
            {
                number: 1,
                state: 'open',
                updated_at: '2015-10-12T00:00:00Z',
                body: 'foo'
            },
            {
                number: 3,
                state: 'open',
                updated_at: '2015-11-10T00:00:00Z',
                body: 'baz'
            }
        ]
    };
    /* eslint-enable camelcase */
    const githubClient = {
        search: {
            issues: sinon.stub().resolves({ data: searchIssuesData })
        },
        issues: {
            createComment: sinon.stub().resolves()
        }
    };

    const repository = {
        owner: 'foo',
        name: 'bar'
    };

    it('should add comment to opened pull requests not updated in last 30 days', () => {
        return pingOldPullRequests({ log: () => {} }, { getCurrentDate, githubClient, repository })
            .then(() => {
                expect(githubClient.search.issues).to.have.been.calledWithExactly({
                    q: 'repo:foo/bar+type:pr+state:open+updated:<2015-11-12',
                    per_page: 100
                });

                expect(githubClient.issues.createComment).to.have.been.calledTwice;
                expect(githubClient.issues.createComment).to.have.been.calledWithExactly({
                    owner: 'foo',
                    repo: 'bar',
                    number: 1,
                    body: 'Hi, I noticed that this pull request hasn\'t been touched in the last 1 month(s). ' +
                            'Could you please do something about it? Thanks in advance!'
                });
                expect(githubClient.issues.createComment).to.have.been.calledWithExactly({
                    owner: 'foo',
                    repo: 'bar',
                    number: 3,
                    body: 'Hi, I noticed that this pull request hasn\'t been touched in the last 1 month(s). ' +
                    'Could you please do something about it? Thanks in advance!'
                });
            });
    });

    it('should log list of found pull requests which should be pinged if there were any', () => {
        const logger = { log: sinon.spy() };

        return pingOldPullRequests(logger, { getCurrentDate, githubClient, repository })
            .then(() => {
                expect(logger.log).to.have.been
                    .calledWithExactly('Pull requests updated before 2015-11-12: [ #1, #3 ]');
            });
    });

    it('should not log list of found pull requests which should be pinged on empty result set', () => {
        const logger = { log: sinon.spy() };
        const githubClient = {
            search: {
                issues: sinon.stub().resolves({ data: {
                    total_count: 0,
                    incomplete_results: false,
                    items: []
                } })
            },
            issues: {
                createComment: sinon.stub().resolves()
            }
        };

        return pingOldPullRequests(logger, { getCurrentDate, githubClient, repository })
            .then(() => {
                expect(logger.log).to.not.have.been
                    .calledWithMatch(/Pull requests updated before/);
            });
    });

    it('should log pinged pull requests', () => {
        const logger = { log: sinon.spy() };

        return pingOldPullRequests(logger, { getCurrentDate, githubClient, repository })
            .then(() => {
                expect(logger.log).to.have.been.calledThrice;
                expect(logger.log).to.have.been.calledWithExactly('Pinged pull request foo/bar#1');
                expect(logger.log).to.have.been.calledWithExactly('Pinged pull request foo/bar#3');
            });
    });

    it('should respect "olderThan" param', () => {
        const olderThan = {
            value: 14,
            unit: 'day'
        };

        return pingOldPullRequests({ log: () => {} }, { getCurrentDate, githubClient, repository, olderThan })
            .then(() => {
                expect(githubClient.search.issues).to.have.been.calledWithExactly({
                    q: 'repo:foo/bar+type:pr+state:open+updated:<2015-11-28',
                    per_page: 100
                });

                expect(githubClient.issues.createComment).to.have.been.calledWithExactly({
                    owner: 'foo',
                    repo: 'bar',
                    number: 3,
                    body: 'Hi, I noticed that this pull request hasn\'t been touched in the last 14 day(s). ' +
                    'Could you please do something about it? Thanks in advance!'
                });
            });
    });
});
