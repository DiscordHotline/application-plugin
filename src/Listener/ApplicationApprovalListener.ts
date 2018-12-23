import {Client, Message, TextableChannel} from 'eris';
import {types as CFTypes} from 'eris-command-framework';
import Embed from 'eris-command-framework/Model/Embed';
import {inject, injectable} from 'inversify';
import {Connection, Repository} from 'typeorm';
import {Logger} from 'winston';

import Application, {ApprovalType} from '../Entity/Application';
import {Config} from '../index';
import Types from '../types';

interface ApplicationMessage {
    application: Application;
    approvalMessage: Message;
}

@injectable()
export default class ApplicationApprovalListener {
    private messages: ApplicationMessage[] = [];

    private repo: Repository<Application>;

    private approvalChannel: TextableChannel;

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
            if (!this.config.approvalChannel) {
                throw new Error('Approval channel not set!');
            }

            if (!this.config.voteChannel) {
                throw new Error('Vote channel not set!');
            }

            this.approvalChannel = await this.client.getChannel(this.config.approvalChannel) as TextableChannel;
            if (!this.approvalChannel) {
                throw new Error('Approval channel not found!');
            }
            this.voteChannel = await this.client.getChannel(this.config.voteChannel) as TextableChannel;
            if (!this.voteChannel) {
                throw new Error('Vote channel not found!');
            }

            await this.loadMessages();
        });
    }

    private async onMessageCreate(approvalMessage: Message): Promise<void> {
        if (approvalMessage.channel.id !== this.approvalChannel.id) {
            return;
        }
        setTimeout(
            async () => {
                const approvalMessageId = approvalMessage.channel.id + ':' + approvalMessage.id;
                const application       = await this.repo.findOne({approvalMessageId});
                if (!application) {
                    this.logger.warn(
                        'Approval - Message Create: Found a message without an application: %j',
                        {
                            id:      approvalMessage.id,
                            content: approvalMessage.content,
                            embeds:  approvalMessage.embeds[0].title,
                        },
                    );

                    return;
                }

                this.messages.push({application, approvalMessage});
            },
            5000,
        );
    }

    private async onMessageReactionAdd(
        approvalMessage: Message,
        _emoji: { id: string, name: string },
        userId: string,
    ): Promise<void> {
        approvalMessage = await this.client.getMessage(approvalMessage.channel.id, approvalMessage.id);
        if (approvalMessage.channel.id !== this.config.approvalChannel) {
            return;
        }

        if (userId === this.client.user.id) {
            return;
        }

        const approvalMessageId = approvalMessage.channel.id + ':' + approvalMessage.id;
        const application       = await this.repo.findOne({approvalMessageId});
        if (!application) {
            this.logger.warn(
                'Approval - Reaction: Found a message without an application: %j',
                {id: approvalMessage.id, content: approvalMessage.content, embeds: approvalMessage.embeds[0].title},
            );

            return;
        }

        if (await this.updateApplication(approvalMessage, application)) {
            const index = this.messages.findIndex((x) => (
                x.approvalMessage.id === approvalMessage.id && x.application.id === application.id
            ));

            this.messages.splice(index, 1);
        }
    }

    private async loadMessages(): Promise<void> {
        this.logger.info('Loading application approval messages!');

        const applications: Application[] = await this.repo.find({voteApproved: ApprovalType.AWAITING});
        for (const application of applications) {
            const [channelId, messageId] = application.approvalMessageId.split(':');
            try {
                const message: Message = await this.client.getMessage(channelId, messageId);
                if (!await this.updateApplication(message, application)) {
                    continue;
                }

                this.messages.push({application, approvalMessage: message});
            } catch (e) {
                this.logger.warn(
                    'Approval - Load: Found an application without a message, denying: %j',
                    application,
                );

                application.voteApproved = ApprovalType.DENIED;
                await application.save();
            }
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

        let approved = ApprovalType.AWAITING;
        for (const name of Object.keys(reactions)) {
            if (['✅', '❌'].indexOf(name) === -1) {
                return false;
            }

            const stats = reactions[name];
            if (name === '✅' && stats.count > (stats.me ? 1 : 0)) {
                approved = ApprovalType.APPROVED;
            }
            if (name === '❌' && stats.count > (stats.me ? 1 : 0)) {
                approved = ApprovalType.DENIED;
            }
        }

        if (approved === ApprovalType.AWAITING) {
            this.logger.info('Approval vote is still awaiting for "%s"', application.server);

            return false;
        }

        application.approvedDate = new Date();
        application.voteApproved = approved;
        await application.save();
        await message.addReaction('☑️');

        const requester = await this.client.users.get(application.requestUser);
        const dm        = await requester.getDMChannel();
        if (approved === ApprovalType.DENIED) {
            this.logger.info('Approval vote has been denied for "%s"', application.server);
            await dm.createMessage({content: `Your application for ${application.server} has been denied`});

            return true;
        }

        this.logger.info('Approval vote has been approved for "%s"', application.server);

        const embed: Embed        = new Embed({
            title:       `New Application Request From: ${requester.username}#${requester.discriminator}`,
            description: `${application.server}\n\n${application.reason}\n\n${application.inviteCode}`,
            timestamp:   application.insertDate,
            footer:      {
                text: `Application ID: ${application.id} | Time Left: 3 days 0 Hours 0 Minutes`,
            },
        });
        const voteMessage         = await this.voteChannel.createMessage({embed: embed.serialize()});
        application.voteMessageId = voteMessage.channel.id + ':' + voteMessage.id;
        await application.save();

        await voteMessage.addReaction('✅');
        await sleep(500);
        await voteMessage.addReaction('❌');

        return true;
    }
}

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
