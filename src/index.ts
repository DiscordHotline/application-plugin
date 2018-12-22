import {AbstractPlugin} from 'eris-command-framework';
import Decorator from 'eris-command-framework/Decorator';
import {Container, inject, injectable} from 'inversify';

import Application from './Entity/Application';
import ApplicationApprovalListener from './Listener/ApplicationApprovalListener';
import ApplicationVoteListener from './Listener/ApplicationVoteListener';
import Types from './types';

export interface Config {
    approvalChannel: string;
    voteChannel: string;
    inviteChannel: string;
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
    }

    public static getEntities(): any[] {
        return [Application];
    }

    @inject(Types.application.listener.approval)
    private applicationListener: ApplicationApprovalListener;

    @inject(Types.application.listener.vote)
    private voteListener: ApplicationVoteListener;

    public async initialize(): Promise<void> {
        this.logger.info('Initializing ApplicationPlugin');
        await this.applicationListener.initialize();
        await this.voteListener.initialize();

        return;
    }

    @Decorator.Command('ping', 'Pings the bot!')
    @Decorator.Permission('ping')
    public async PingCommand(): Promise<void> {
        await this.reactOk();
    }
};
