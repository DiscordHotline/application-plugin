import {Client, TextableChannel} from 'eris';
import {types as CFTypes} from 'eris-command-framework';
import {inject, injectable} from 'inversify';
import Application, {ApprovalType, VoteResults} from '../Entity/Application';
import {Config} from '../index';
import Types from '../types';

@injectable()
export default class ApplicationService {
    private static makeId(length: number): string {
        let text     = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }

    private voteChannel: TextableChannel;

    public constructor(
        @inject(CFTypes.discordClient) private client: Client,
        @inject(Types.application.config) private config: Config,
    ) {
    }

    public async initialize(): Promise<void> {
        this.client.on('ready', async () => {
            if (!this.config.approvalChannel) {
                throw new Error('Approval channel not set!');
            }

            if (!this.config.voteChannel) {
                throw new Error('Vote channel not set!');
            }

            this.voteChannel = await this.client.getChannel(this.config.voteChannel) as TextableChannel;
            if (!this.voteChannel) {
                throw new Error('Vote channel not found!');
            }
        });
    }

    public async approveOrDeny(application: Application, approved: ApprovalType, votes?: VoteResults): Promise<void> {
        const [channelId, messageId] = application.approvalMessageId.split(':');
        const message                = await this.client.getMessage(channelId, messageId);
        const requester              = await this.client.users.get(application.requestUser);
        const dm                     = await requester.getDMChannel();
        if (approved === ApprovalType.APPROVED) {
            const invite                  = ApplicationService.makeId(8);
            application.hotlineInviteCode = invite;

            // @todo Alphabetize roles after creating.
            const guild              = this.client.guilds.get(this.config.hotlineGuildId);
            const role               = await guild.createRole({
                name:        application.server.replace(/[\W_\s]+/g, ''),
                permissions: 0,
            });
            application.serverRoleId = role.id;

            const msg = await dm.createMessage({
                embed: {
                    description: `Your application for ${application.server} has passed!

Here is the permanent invite link for this. 
Please pass this along to the people who want to join the server.
If you are also a member of this server, please click the link.

https://apply.hotline.gg/${invite}
`,
                },
            });
            await msg.pin();
        } else {
            await dm.createMessage({
                embed: {
                    description: `Your application for ${application.server} has been denied`,
                },
            });
        }

        application.passedDate = new Date();
        application.votePassed = approved;
        if (votes !== null) {
            application.votes = votes;
        }
        await application.save();
        await message.addReaction('👌');
    }
}
