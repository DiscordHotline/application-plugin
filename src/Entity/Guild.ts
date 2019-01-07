import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    OneToMany,
    OneToOne,
    PrimaryColumn,
} from 'typeorm';
import Application from './Application';
import Invite from './Invite';

export interface UseMetadata {
    user: string;
    usedAt: Date;
}

@Entity({name: 'guild'})
export default class Guild extends BaseEntity {
    @PrimaryColumn({type: 'bigint'})
    public id: string;

    @CreateDateColumn({type: 'timestamp', name: 'createdAt'})
    public createdAt: Date;

    @OneToOne((_type) => Application, (application) => application.guild)
    public application?: Application | null;

    @OneToMany((_type) => Invite, (invite) => invite.guild)
    @JoinTable()
    public invites: Invite[];

    @Column({type: 'simple-array'})
    public members: string[];

    @Column({type: 'simple-array'})
    public owners: string[];

    @Column({type: 'bigint', name: 'server_role_id', nullable: true})
    public roleId: string;
}
