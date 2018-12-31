import {AbstractPlugin} from 'eris-command-framework';
import Decorator from 'eris-command-framework/Decorator';
import {Container, inject, injectable} from 'inversify';

import Application, {ApprovalType, VoteType} from './Entity/Application';
import ApplicationApprovalListener from './Listener/ApplicationApprovalListener';
import ApplicationVoteListener from './Listener/ApplicationVoteListener';
import ApplicationService from './Service/ApplicationService';
import Types from './types';

export interface Config {
    hotlineGuildId    : string;
    approvalChannel   : string;
    voteChannel       : string;
    discussionCategory: string;
    inviteChannel     : string;
}

@injectable()
export default class extends AbstractPlugin {
    public static Config: Config;

    public static addToContainer(container: Container): void {
        container.bind<Config>(Types.application.config).toConstantValue(this.Config);
        container.bind<ApplicationApprovalListener>(Types.application.listener.approval)
                 .to(ApplicationApprovalListener);
        container.bind<ApplicationVoteListener>(Types.application.listener.vote)
                 .to(ApplicationVoteListener);
        container.bind<ApplicationService>(Types.application.service.application).to(ApplicationService);
    }

    public static getEntities(): any[] {
        return [Application];
    }

    x;

    @inject(Types.application.listener.approval)
    private applicationListener: ApplicationApprovalListener;

    @inject(Types.application.listener.vote)
    private voteListener: ApplicationVoteListener;

    @inject(Types.application.service.application)
    private appService: ApplicationService;

    public async initialize(): Promise<void> {
        this.logger.info('Initializing ApplicationPlugin');
        await this.appService.initialize();
        await this.applicationListener.initialize();
        await this.voteListener.initialize();

        return;
    }

    @Decorator.Command('app approve', 'Approves an application')
    @Decorator.Permission('application.approve')
    public async ApproveCommand(id: number): Promise<void> {
        const application = await this.getRepository<Application>(Application).findOne(id);
        if (!application) {
            return await this.reactNotOk();
        }

        await this.appService.approveOrDeny(application, ApprovalType.APPROVED);
        await this.reactOk();
    }

    @Decorator.Command('app deny', 'Denies an application')
    @Decorator.Permission('application.approve')
    public async DenyCommand(id: number): Promise<void> {
        const application = await this.getRepository<Application>(Application).findOne(id);
        if (!application) {
            return await this.reactNotOk();
        }

        await this.appService.approveOrDeny(application, ApprovalType.DENIED);
        await this.reactOk();
    }

    @Decorator.Command('app view', 'Views an application')
    @Decorator.Permission('application.view')
    public async ViewCommand(id: number): Promise<void> {
        const application = await this.getRepository<Application>(Application).findOne(id);
        if (!application) {
            return await this.reactNotOk();
        }

        const fields  = [];
        let approvals = 0;
        let denies    = 0;
        for (const userId of Object.keys(application.votes.entries)) {
            const user = this.client.users.get(userId);
            const vote = application.votes.entries[userId];
            approvals += vote === VoteType.APPROVED ? 1 : 0;
            denies += vote === VoteType.DENIED ? 1 : 0;

            fields.push({
                name:   user.username + '#' + user.discriminator,
                value:  vote === VoteType.APPROVED ? '✅' : '❌',
                inline: true,
            });
        }

        await this.embedMessage((x) => {
            x.author  = {
                name: 'Vote Results for: ' + application.server,
            };
            x.fields = fields;
            x.title = `Current Results: ${approvals} - ${denies}`;
        });
    }
};
