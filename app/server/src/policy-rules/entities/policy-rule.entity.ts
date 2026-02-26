import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PolicyRuleType {
  DO = 'DO',
  DONT = 'DONT',
}

export enum PolicyRuleSeverity {
  HARD = 'hard',
  SOFT = 'soft',
}

@Entity({ name: 'policy_rules' })
export class PolicyRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 8 })
  type!: PolicyRuleType;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'varchar', length: 8 })
  severity!: PolicyRuleSeverity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
