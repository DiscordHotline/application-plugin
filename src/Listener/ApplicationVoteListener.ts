import {Client, Message, TextableChannel} from 'eris';
import {types as CFTypes} from 'eris-command-framework';
import {inject, injectable} from 'inversify';
import {Connection, Repository} from 'typeorm';
import {Logger} from 'winston';

import Application, {ApprovalType, VoteResults, VoteType} from '../Entity/Application';
import {Config} from '../index';
import Types from '../types';

interface ApplicationMessage {
    application: Application;
    approvalMessage: Message;
}

const APPROVALS_REQUIRED  = 1;
const DENIALS_REQUIRED    = 1;
const MULTIPLIER_REQUIRED = 1;

@injectable()
export default class ApplicationVoteListener {
    private messages: ApplicationMessage[] = [];

    private repo: Repository<Application>;

    private voteChannel: TextableChannel;

    public constructor(
        @inject(CFTypes.connection) connection: Connection,
        @inject(CFTypes.logger) private logger: Logger,
        @inject(CFTypes.discordClient) private client: Client,
        @inject(Types.application.config) private config: Config,
    ) {
        this.repo = connection.getRepository(Application);
        client.on('messageCreate', this.onMessageCreate.bind(this));
        client.on('messageReactionAdd', this.onMessageReactionAdd.bind(this));
    }

    public async initialize(): Promise<void> {
        this.client.on('ready', async () => {
            if (!this.config.voteChannel) {
                throw new Error('Vote channel not set!');
            }

            this.voteChannel = await this.client.getChannel(this.config.voteChannel) as TextableChannel;
            if (!this.voteChannel) {
                throw new Error('Vote channel not found!');
            }

            await this.loadMessages();
        });
    }

    private async onMessageCreate(voteMessage: Message): Promise<void> {
        if (voteMessage.channel.id !== this.voteChannel.id) {
            return;
        }

        setTimeout(
            async () => {
                const voteMessageId = voteMessage.channel.id + ':' + voteMessage.id;
                const application   = await this.repo.findOne({voteMessageId});
                if (!application) {
                    this.logger.warn(
                        'Vote - Message: Found a message without an application: %j',
                        {id: voteMessage.id, content: voteMessage.content, embeds: voteMessage.embeds[0].title},
                    );

                    return;
                }

                this.messages.push({application, approvalMessage: voteMessage});
            },
            5000,
        );
    }

    private async onMessageReactionAdd(
        voteMessage: Message,
        _emoji: { id: string, name: string },
        userId: string,
    ): Promise<void> {
        voteMessage = await this.client.getMessage(voteMessage.channel.id, voteMessage.id);
        if (voteMessage.channel.id !== this.voteChannel.id) {
            return;
        }

        if (userId === this.client.user.id) {
            return;
        }

        const voteMessageId = voteMessage.channel.id + ':' + voteMessage.id;
        const application   = await this.repo.findOne({voteMessageId});
        if (!application) {
            this.logger.warn(
                'Vote - Reaction: Found a message without an application: %j',
                {id: voteMessage.id, content: voteMessage.content, embeds: voteMessage.embeds[0].title},
            );

            return;
        }

        if (await this.updateApplication(voteMessage, application)) {
            const index = this.messages.findIndex((x) => (
                x.approvalMessage.id === voteMessage.id && x.application.id === application.id
            ));

            this.messages.splice(index, 1);
        }
    }

    private async loadMessages(): Promise<void> {
        this.logger.info('Loading application vote messages!');

        const applications: Application[] = await this.repo.find({
            voteApproved: ApprovalType.APPROVED,
            votePassed:   ApprovalType.AWAITING,
        });
        for (const application of applications) {
            const [channelId, messageId] = application.voteMessageId.split(':');
            const message: Message       = await this.client.getMessage(channelId, messageId);
            if (!message) {
                this.logger.warn(
                    'Vote: Found an application without a message: %j',
                    {id: message.id, content: message.content, embeds: message.embeds[0].title},
                );
                continue;
            }

            if (!await this.updateApplication(message, application)) {
                continue;
            }

            this.messages.push({application, approvalMessage: message});
        }
    }

    private async updateApplication(
        message: Message,
        application: Application,
    ): Promise<boolean> {
        const reactions = message.reactions;
        if (Object.keys(reactions).length === 0) {
            return false;
        }

        const vote: VoteResults = {
            approvals: reactions['✅'].count - (reactions['✅'].me ? 1 : 0),
            denies:    reactions['❌'].count - (reactions['❌'].me ? 1 : 0),
            entries:   {},
        };

        let approved = ApprovalType.AWAITING;
        for (const name of Object.keys(reactions)) {
            if (['✅', '❌'].indexOf(name) === -1) {
                return false;
            }

            const users = await message.getReaction(name);
            for (const user of users) {
                if (!user.bot) {
                    vote.entries[user.id] = name === '✅' ? VoteType.APPROVED : VoteType.DENIED;
                }
            }
        }

        if (vote.approvals < APPROVALS_REQUIRED && vote.denies < DENIALS_REQUIRED) {
            // If there are less than 5 approvals and 5 denies, the vote is too new.
            this.logger.info(
                'Public Vote is still awaiting for "%s" (not enough votes, A: %d, D: %d)',
                application.server,
                vote.approvals,
                vote.denies,
            );

            approved = ApprovalType.AWAITING;
        } else if (vote.approvals >= APPROVALS_REQUIRED && vote.approvals < vote.denies * MULTIPLIER_REQUIRED) {
            // If there are *more* than 5 approvals, but less than twice as many approvals as denies, we need more
            // approvals.

            this.logger.info(
                'Public Vote is still awaiting for "%s" (2x denies, A: %d, D: %d)',
                application.server,
                vote.approvals,
                vote.denies,
            );

            approved = ApprovalType.AWAITING;
        } else if (vote.denies >= DENIALS_REQUIRED && vote.approvals < APPROVALS_REQUIRED) {
            // If there are more than 5 denies, and less than 5 approvals, deny the application
            this.logger.info(
                'Public Vote is denied for "%s" (A: %d, D: %d)',
                application.server,
                vote.approvals,
                vote.denies,
            );

            approved = ApprovalType.DENIED;
        } else if (vote.approvals >= APPROVALS_REQUIRED && vote.approvals >= vote.denies * MULTIPLIER_REQUIRED) {
            // If there are *more* than 5 approvals, and more twice as many approvals as denies, approve the vote.
            this.logger.info(
                'Public Vote has passed for "%s" (A: %d, D: %d)',
                application.server,
                vote.approvals,
                vote.denies,
            );

            approved = ApprovalType.APPROVED;
        } else {
            this.logger.info(
                'Public vote is still awaiting for "%s" (no reason, A: %d, D: %d)',
                application.server,
                vote.approvals,
                vote.denies,
            );

            approved = ApprovalType.AWAITING;
        }

        if (approved === ApprovalType.AWAITING) {
            return false;
        }

        const requester = await this.client.users.get(application.requestUser);
        const dm        = await requester.getDMChannel();
        if (approved === ApprovalType.APPROVED) {
            const invite = this.makeId(8);
            application.hotlineInviteCode = invite;

            // @todo Alphabetize roles after creating.
            const guild              = this.client.guilds.get(this.config.hotlineGuildId);
            const role               = await guild.createRole({
                name:        application.server.replace(/[\W_]+/g, ''),
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
        application.votes      = vote;
        await application.save();
        await message.addReaction('👌');

        return true;
    }

    private makeId(length: number): string {
        let text     = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }
}
