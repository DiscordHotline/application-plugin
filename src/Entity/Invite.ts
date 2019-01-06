import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

export interface useMetadata {
  user  : string
  usedAt: Date
}

@Entity({database: 'applications', synchronize: true, name: 'invites'})
export default class Invite extends BaseEntity {
  @PrimaryGeneratedColumn({name: 'id'})
  public id: number

  @CreateDateColumn({type: 'timestamp', name: 'createdAt'})
  public createdAt: Date

  @Column({type: 'datetime', name: 'expiresAt', nullable: true})
  public expiresAt?: Date

  @Column({type: 'tinyint', name: 'applicationId', nullable: true})
  public applicationId?: number

  @Column({type: 'varchar', name: 'code', length: 100})
  @Index({unique: true})
  public code: string

  @Column({type: 'tinyint', name: 'maxUses', default: 5})
  public maxUses: number

  @Column({type: 'tinyint', name: 'uses', default: 0})
  public uses: number

  @Column({type: 'json', name: 'useMetadata'})
  public useMetadata: useMetadata[]

  @Column({type: 'tinyint', name: 'revoked', default: 0, width: 1, transformer:  {
    from: (value) => !!value,
    to  : (value) => value ? 1: 0
  }})
  public revoked: boolean
}
