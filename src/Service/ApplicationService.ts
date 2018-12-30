import {Client, Invite, Message, TextableChannel} from 'eris';
import {types as CFTypes} from 'eris-command-framework';
import Embed from 'eris-command-framework/Model/Embed';
import {inject, injectable} from 'inversify';
import * as millisec from 'millisec';
import * as moment from 'moment';
import Axios from 'axios';
import {Connection, Repository} from 'typeorm';
import {Logger} from 'winston';

import Application, {ApprovalType, VoteResults, VoteType} from '../Entity/Application';
import {Config} from '../index';
import Types, { restUser } from '../types';

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
                this.checkInterval = setInterval(this.checkOpenApplications.bind(this), 15 * 60 * 1000);
                this.checkOpenApplications();
            }
        });
    }

    public async postApplicationMessage(application: Application, edit: boolean): Promise<Message> {
        const now  = moment();
        const date = moment(application.insertDate);
        const diff = moment.duration(date.add(3, 'd').diff(now)).asMilliseconds();
        let timeLeft: string;
        if (diff < 0) {
            timeLeft = 'None';
        } else {
            timeLeft = millisec(diff < 0 ? 0 : diff).format('DD HH MM');
        }

        const requester = await this.getUser(application.requestUser);
        let invite: Invite;
        try {
            invite = await this.client.getInvite(
                application.inviteCode.replace(/https:\/\/discord\.gg\//, ''),
                true,
            );
        } catch (e) {
            this.logger.error('Failed to find invite for application: %j', application);

            throw e;
        }

        const votes = await this.countVotes(application)

        const embed: Embed = new Embed({
            title:       application.server,
            description: application.reason,
            timestamp:   application.approvedDate,
            author:      {
                name:    `${requester.username}#${requester.discriminator}`,
                iconUrl: `https://cdn.discordapp.com/avatars/${requester.id}/${requester.avatar}.png`,
            },
            thumbnail:   {
                url: `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.webp`,
            },
            fields:      [
                {name: 'Invite: ', value: application.inviteCode, inline: true},
                {name: 'Members: ', value: `${invite.presenceCount} / ${invite.memberCount}`, inline: true},
                {name: 'Votes', value: votes.entries ? Object.keys(votes.entries).length.toString() : '0', inline: true},
            ],
            footer:      {
                text: `Application ID: ${application.id} | Time Left: ${timeLeft}`,
            },
        });

        if (!edit) {
            const message = await this.client.createMessage(this.config.voteChannel, {embed: embed.serialize()});
            await message.addReaction('✅');
            await message.addReaction('❌');

            return message;
        }

        try {
            const [channelId, messageId] = application.voteMessageId.split(':');
            const message                = await this.client.getMessage(channelId, messageId);

            await message.edit({embed: embed.serialize()});
            await message.addReaction('✅');
            await message.addReaction('❌');

            return message;
        } catch (e) {
            this.logger.error(e);

            return this.postApplicationMessage(application, false);
        }
    }

    public async getApplication(applicationId): Promise<Application> {
        return this.repo.findOne({id: applicationId})
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
        await this.postApplicationMessage(application, true);

        const now  = moment();
        const date = moment(application.insertDate);
        const diff = moment.duration(date.add(3, 'd').diff(now)).asHours();
        if (diff > 0) {
            this.logger.info('Application "%s" has %d more hours.', application.server, diff);

            return;
        }

        this.setVoteCounts(application);
        const approved = this.getApproval(application);

        if (approved !== ApprovalType.AWAITING) {
            await this.approveOrDeny(application, approved);
        }
    }

    public async approveOrDeny(application: Application, approved: ApprovalType): Promise<void> {
        const votes                  = application.votes;
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

Please limit yourself to invite 5 people. If you think you need more,
talk to the Discord Hotline Staff, and ask for permission.

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

        await sleep(1000)
        await message.removeReactions()
        await message.addReaction(approved === ApprovalType.APPROVED ? '✅' : '❌')
        await message.addReaction('👌')
    }

    public getApproval(application: Application): ApprovalType {
        const votes = application.votes;

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

        // If there are more than 3x more denies than approvals and at least 10 votes, automatically deny.
        if (votes.approvals + votes.denies > 10 && votes.denies >= votes.approvals * 3) {

            this.logger.info(
                'Public Vote is denied for "%s" (>= 3x denies, A: %d, D: %d)',
                application.server,
                votes.approvals,
                votes.denies,
            );

            return ApprovalType.DENIED;
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

    public async getVotes(message: Message, deleteReaction: boolean = false): Promise<VoteResults> {
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
                    this.logger.info('Vote added for %s', user.id);
                    if (deleteReaction) {
                        await message.removeReaction(name, user.id);
                        await sleep(500);
                    }
                }
            }
        }

        return votes;
    }

    public async countVotes(application: Application): Promise<VoteResults> {
        if (!application.votes) {
            application = await this.getApplication(application.id)
        } if (!application.votes.entries) {
            return application.votes
        }

        for (const user of Object.keys(application.votes.entries)) {
            const entry = application.votes.entries[user];

            if (entry === VoteType.APPROVED) {
                application.votes.approvals++;
            } else {
                application.votes.denies++;
            }
        }
        return application.votes;
    }

    private setVoteCounts(application: Application): void {
        application.votes.approvals = 0;
        application.votes.denies    = 0;

        for (const user of Object.keys(application.votes.entries)) {
            const entry = application.votes.entries[user];

            if (entry === VoteType.APPROVED) {
                application.votes.approvals++;
            } else {
                application.votes.denies++;
            }
        }
    }

    // TODO: Remove this method after restClient has been added to eris-command-framework
    public async getUser(userId: string): Promise<restUser> {
        const { data } = await Axios.get(`https://discordapp.com/api/users/${userId}`, {
            headers: {
                Authorization: this.client.token
            },
            validateStatus: (statusCode) => statusCode === 200
        })

        return data
    }
}

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
