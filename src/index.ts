import {AbstractPlugin} from 'eris-command-framework';
import Decorator from 'eris-command-framework/Decorator';
import {Container, inject, injectable} from 'inversify';

import Application, {ApprovalType} from './Entity/Application';
import ApplicationApprovalListener from './Listener/ApplicationApprovalListener';
import ApplicationService from './Service/ApplicationService';
import Types from './types';

export interface Config {
    hotlineGuildId: string;
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
        container.bind<ApplicationService>(Types.application.service.application).to(ApplicationService);
    }

    public static getEntities(): any[] {
        return [Application];
    }

    @inject(Types.application.listener.approval)
    private applicationListener: ApplicationApprovalListener;

    @inject(Types.application.service.application)
    private appService: ApplicationService;

    public async initialize(): Promise<void> {
        this.logger.info('Initializing ApplicationPlugin');
        await this.appService.initialize();
        await this.applicationListener.initialize();

        return;
    }

    @Decorator.Command('app-approve', 'Approves an application')
    @Decorator.Permission('Owner')
    public async ApproveCommand(id: number): Promise<void> {
        const application = await this.getRepository<Application>(Application).findOne(id);
        if (!application) {
            return await this.reactNotOk();
        }

        await this.appService.approveOrDeny(application, ApprovalType.APPROVED);
        await this.reactOk();
    }

    @Decorator.Command('app-deny', 'Denies an application')
    @Decorator.Permission('Owner')
    public async DenyCommand(id: number): Promise<void> {
        const application = await this.getRepository<Application>(Application).findOne(id);
        if (!application) {
            return await this.reactNotOk();
        }

        await this.appService.approveOrDeny(application, ApprovalType.DENIED);
        await this.reactOk();
    }
};
