const expect = require('chai').expect;
const sinon = require('sinon');

const autoMergePullRequest = require('../../tasks/auto-merge-pull-request');

describe('task auto-merge-pull-request', () => {
    const createGithubClient = () => {
        return {
            gitdata: {
                deleteReference: sinon.stub()
            },
            issues: {
                createComment: sinon.stub()
            },
            pullRequests: {
                get: sinon.stub(),
                merge: sinon.stub()
            },
            search: {
                issues: sinon.stub()
            }
        };
    };

    const createLogger = () => {
        return { log: sinon.spy() };
    };

    it('should merge pull request with status "clean"', () => {
        const logger = createLogger();
        const repository = { owner: 'foo', name: 'bar' };
        const label = 'merge-me-please';
        const githubClient = createGithubClient();
        githubClient.gitdata.deleteReference.resolves();
        githubClient.issues.createComment.resolves();
        githubClient.pullRequests.get.resolves({ data: {
            head: { ref: 'feature-branch' },
            mergeable_state: 'clean'
        } });
        githubClient.pullRequests.merge.resolves();
        githubClient.search.issues.resolves({ data: { items: [ { number: 1337 } ] } });

        return autoMergePullRequest(logger, { githubClient, label, repository }).then(() => {
            expect(githubClient.search.issues).to.have.been.calledWithExactly({
                q: 'repo:foo/bar+type:pr+state:open+label:merge-me-please',
                order: 'asc',
                sort: 'created',
                per_page: 100
            });

            expect(githubClient.pullRequests.get).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 1337
            });

            expect(githubClient.pullRequests.merge).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 1337
            });

            expect(githubClient.issues.createComment).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                number: 1337,
                body: 'Hi, I noticed that this PR has a `merge-me-please` label. ' +
                    'Since all status checks are green I went ahead and merged it for you.'
            });

            expect(githubClient.gitdata.deleteReference).to.have.been.calledWithExactly({
                owner: 'foo',
                repo: 'bar',
                ref: 'heads/feature-branch'
            });

            expect(logger.log).to.have.been.calledWithExactly('Merged pull request foo/bar#1337');
        });
    });

    it('should merge pull request with status "unstable"', () => {
        const logger = createLogger();
        const repository = { owner: 'foo', name: 'bar' };
        const label = 'merge-me-please';
        const githubClient = createGithubClient();
        githubClient.gitdata.deleteReference.resolves();
        githubClient.issues.createComment.resolves();
        githubClient.pullRequests.get.resolves({ data: {
            head: { ref: 'feature-branch' },
            mergeable_state: 'unstable'
        } });
        githubClient.pullRequests.merge.resolves();
        githubClient.search.issues.resolves({ data: { items: [ { number: 1337 } ] } });

        return autoMergePullRequest(logger, { githubClient, label, repository }).then(() => {
            expect(githubClient.search.issues).to.have.been.calledOnce;
            expect(githubClient.pullRequests.get).to.have.been.calledOnce;
            expect(githubClient.pullRequests.merge).to.have.been.calledOnce;
            expect(githubClient.issues.createComment).to.have.been.calledOnce;
            expect(githubClient.gitdata.deleteReference).to.have.been.calledOnce;
            expect(logger.log).to.have.been.calledOnce;
        });
    });

    it('should not merge anything when there\'s no matching pull request found', () => {
        const logger = createLogger();
        const repository = { owner: 'foo', name: 'bar' };
        const label = 'merge-me-please';
        const githubClient = createGithubClient();
        githubClient.search.issues.resolves({ data: { items: [] } });

        return autoMergePullRequest(logger, { githubClient, label, repository })
            .then(() => {
                expect(githubClient.search.issues).to.have.been.calledOnce;
                expect(githubClient.pullRequests.get).not.to.have.been.called;
                expect(githubClient.pullRequests.merge).not.to.have.been.called;
                expect(githubClient.issues.createComment).not.to.have.been.called;
                expect(githubClient.gitdata.deleteReference).not.to.have.been.called;
                expect(logger.log).not.to.have.been.called;
            });
    });

    it('should merge only one matching pull request during one execution', () => {
        const logger = createLogger();
        const repository = { owner: 'foo', name: 'bar' };
        const label = 'merge-me-please';
        const githubClient = createGithubClient();
        githubClient.gitdata.deleteReference.resolves();
        githubClient.issues.createComment.resolves();
        githubClient.pullRequests.get.resolves({ data: {
            head: { ref: 'feature-branch' },
            mergeable_state: 'clean'
        } });
        githubClient.pullRequests.merge.resolves();
        githubClient.search.issues.resolves({ data: { items: [ { number: 1 }, { number: 2 } ] } });

        return autoMergePullRequest(logger, { githubClient, label, repository })
            .then(() => {
                expect(githubClient.search.issues).to.have.been.calledOnce;
                expect(githubClient.pullRequests.get).to.have.been.calledOnce;
                expect(githubClient.pullRequests.merge).to.have.been.calledOnce;
                expect(githubClient.issues.createComment).to.have.been.calledOnce;
                expect(githubClient.gitdata.deleteReference).to.have.been.calledOnce;
                expect(logger.log).to.have.been
                    .calledOnce
                    .calledWithMatch(sinon.match(/Merged pull request foo\/bar#[12]/));
            });
    });

    it('should not try to merge non-mergeable pull request', () => {
        const ignoredStates = [ 'dirty', 'unknown', 'blocked', 'behind', 'has_hooks', 'foobar' ];
        const createTestCaseForMergeableState = (state) => {
            const logger = createLogger();
            const repository = { owner: 'foo', name: 'bar' };
            const label = 'merge-me-please';
            const githubClient = createGithubClient();
            githubClient.pullRequests.get.resolves({ data: {
                head: { ref: 'feature-branch' },
                mergeable_state: state
            } });
            githubClient.search.issues.resolves({ data: { items: [ { number: 1337 } ] } });

            return autoMergePullRequest(logger, { githubClient, label, repository })
                .then(() => {
                    expect(githubClient.search.issues).to.have.been.calledOnce;
                    expect(githubClient.pullRequests.get).to.have.been.calledOnce;
                    expect(githubClient.pullRequests.merge).not.to.have.been.called;
                    expect(githubClient.issues.createComment).not.to.have.been.called;
                    expect(githubClient.gitdata.deleteReference).not.to.have.been.called;
                    expect(logger.log).not.to.have.been.called;
                });
        };

        return Promise.all(ignoredStates.map(createTestCaseForMergeableState));
    });
});
