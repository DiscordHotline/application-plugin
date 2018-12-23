import {Client, Message, TextableChannel} from 'eris';
import {types as CFTypes} from 'eris-command-framework';
import {inject, injectable} from 'inversify';
import * as millisec from 'millisec';
import * as moment from 'moment';
import {Connection, Repository} from 'typeorm';
import {Logger} from 'winston';

import Application, {ApprovalType, VoteResults, VoteType} from '../Entity/Application';
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

    private repo: Repository<Application>;

    private checkInterval: NodeJS.Timeout;

    public constructor(
        @inject(CFTypes.connection) connection: Connection,
        @inject(CFTypes.discordClient) private client: Client,
        @inject(CFTypes.logger) private logger: Logger,
        @inject(Types.application.config) private config: Config,
    ) {
        this.repo = connection.getRepository<Application>(Application);
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

            if (!this.checkInterval) {
                this.checkInterval = setInterval(this.checkOpenApplications.bind(this), 1 * 60 * 1000);
                this.checkOpenApplications();
            }
        });
    }

    public async checkOpenApplications(): Promise<void> {
        const applications = await this.repo.find({
            voteApproved: ApprovalType.APPROVED,
            votePassed:   ApprovalType.AWAITING,
        });
        this.logger.info('Checking Open Applications. Found %d', applications.length);
        for (const application of applications) {
            try {
                await this.checkApplication(application);
            } catch (e) {
                this.logger.error(e);
            }
        }
    }

    public async checkApplication(application: Application): Promise<void> {
        const [channelId, messageId] = application.voteMessageId.split(':');
        const message                = await this.client.getMessage(channelId, messageId);

        try {
            await message.addReaction('✅');
            await message.addReaction('❌');
        } catch (ignored) {
        }

        const now  = moment();
        const date = moment(application.approvedDate);
        const diffDays = now.diff(date, 'days');
        let timeLeft: string;
        if (diffDays < 0) {
            timeLeft = 'None';
        } else {
            const duration = moment.duration(date.add(3, 'd').diff(now)).asMilliseconds();
            timeLeft = millisec(duration).format('DD HH MM');
        }

        const embed = message.embeds[0];
        embed.footer = {text: `Application ID: ${application.id} | Time Left: ${timeLeft}`};
        await message.edit({embed});

        if (diffDays < 3) {
            return;
        }

        const votes                  = await this.getVotes(message);
        const approved               = this.getApproval(application, votes);

        if (approved !== ApprovalType.AWAITING) {
            await this.approveOrDeny(application, approved, votes);
        }
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

        setTimeout(
            () => message.addReaction('☑'),
            1000,
        );
    }

    public getApproval(application: Application, votes: VoteResults): ApprovalType {
        // If there are less than 5 approvals and 5 denies, the vote is too new.
        if (votes.approvals < 10 && votes.denies < 2) {
            this.logger.info(
                'Public Vote is still awaiting for "%s" (not enough votes, A: %d, D: %d)',
                application.server,
                votes.approvals,
                votes.denies,
            );

            return ApprovalType.AWAITING;
        }

        // If there are more than 2 denies, and more than 3 approvals, this is now a manual approval.
        if (votes.approvals >= 3 && votes.denies >= 2) {

            this.logger.info(
                'Public Vote is still awaiting for "%s" (>= 2 denies, A: %d, D: %d)',
                application.server,
                votes.approvals,
                votes.denies,
            );

            return ApprovalType.AWAITING;
        }

        // If there are more than 5 denies, and less than 10 approvals, deny the application
        if (votes.denies >= 5 && votes.approvals < 10) {
            this.logger.info(
                'Public Vote is denied for "%s" (A: %d, D: %d)',
                application.server,
                votes.approvals,
                votes.denies,
            );

            return ApprovalType.DENIED;
        }

        // If there are *more* than 10 approvals approve the vote.
        if (votes.approvals >= 10) {
            this.logger.info(
                'Public Vote has passed for "%s" (A: %d, D: %d)',
                application.server,
                votes.approvals,
                votes.denies,
            );

            return ApprovalType.APPROVED;
        }

        // Vote hasn't been decided yet

        this.logger.info(
            'Public vote is still awaiting for "%s" (no reason, A: %d, D: %d)',
            application.server,
            votes.approvals,
            votes.denies,
        );

        return ApprovalType.AWAITING;
    }

    public async getVotes(message: Message): Promise<VoteResults> {
        const reactions          = message.reactions;
        const votes: VoteResults = {
            approvals: reactions['✅'].count - (reactions['✅'].me ? 1 : 0),
            denies:    reactions['❌'].count - (reactions['❌'].me ? 1 : 0),
            entries:   {},
        };
        if (Object.keys(reactions).length === 0) {
            return votes;
        }

        for (const name of Object.keys(reactions)) {
            if (['✅', '❌'].indexOf(name) === -1) {
                continue;
            }

            const users = await message.getReaction(name);
            for (const user of users) {
                if (!user.bot) {
                    votes.entries[user.id] = name === '✅' ? VoteType.APPROVED : VoteType.DENIED;
                }
            }
        }

        return votes;
    }
}
