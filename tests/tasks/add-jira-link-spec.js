const expect = require('chai').expect;
const sinon = require('sinon');

const addJiraLink = require('../../tasks/add-jira-link');

describe('task add-jira-link', () => {
    const jiraBaseUrl = 'https://jira.example.com/jira/';
    const createGithubClient = () => {
        return { pullRequests: { update: sinon.stub().resolves() } };
    };
    const createLogger = () => {
        return { log: sinon.spy() };
    };
    const defaultPayload = {
        number: 123,
        action: 'opened',
        repository: {
            full_name: 'foo/bar',
            name: 'bar',
            owner: {
                login: 'foo'
            }
        },
        pull_request: {
            title: 'FOOBAR-45',
            body: 'Existing body',
            base: {
                ref: 'master'
            }
        }
    };

    it('should add link to pull request message', () => {
        const logger = createLogger();
        const githubClient = createGithubClient();

        return addJiraLink(logger, { githubClient, jiraBaseUrl }, defaultPayload)
            .then(() => {
                expect(githubClient.pullRequests.update).to.have.been.calledWith({
                    number: 123,
                    owner: 'foo',
                    repo: 'bar',
                    base: 'master',
                    body: 'Existing body\n\n**Auto-linked issue**: https://jira.example.com/jira/browse/FOOBAR-45'
                });

                expect(logger.log).to.have.been.calledWith('Added JIRA FOOBAR-45 link to pull request foo/bar#123');
            });
    });

    it('should add link only for opened pull requests', () => {
        const ignoredActions = [ 'assigned', 'unassigned', 'labeled', 'unlabeled', 'edited', 'closed', 'reopened' ];
        const createTestCaseForAction = (action) => {
            const logger = createLogger();
            const githubClient = createGithubClient();
            const payload = Object.assign({}, defaultPayload, { action });

            return addJiraLink(logger, { githubClient, jiraBaseUrl }, payload)
                .then(() => {
                    expect(githubClient.pullRequests.update).not.to.have.been.called;
                    expect(logger.log).not.to.have.been.called;
                });
        };

        return Promise.all(ignoredActions.map(createTestCaseForAction));
    });

    it('should not add link when title doesn\'t contain valid JIRA link', () => {
        const logger = createLogger();
        const githubClient = createGithubClient();
        const payload = Object.assign({}, defaultPayload);
        payload.pull_request.title = 'No Jira link';

        return addJiraLink(logger, { githubClient, jiraBaseUrl }, payload)
            .then(() => {
                expect(githubClient.pullRequests.update).not.to.have.been.called;
                expect(logger.log).not.to.have.been.called;
            });
    });
});
