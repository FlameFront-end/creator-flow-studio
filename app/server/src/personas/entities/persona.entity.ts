import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'personas' })
export class Persona {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'int', nullable: true })
  age!: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  archetypeTone!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'text', nullable: true })
  visualCode!: string | null;

  @Column({ type: 'text', nullable: true })
  voiceCode!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
