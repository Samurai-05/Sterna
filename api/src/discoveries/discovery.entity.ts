import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscoveryCategory } from './discovery-category';
import { DiscoveryLocationSource } from './discovery-location-source';

type GeoJsonPoint = {
  type: 'Point';
  coordinates: [number, number];
};

@Entity({ name: 'discoveries' })
export class Discovery {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'group_id', type: 'bigint', nullable: true })
  groupId: string | null;

  @Column({ name: 'is_personal', type: 'boolean', default: false })
  isPersonal: boolean;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  category: DiscoveryCategory | null;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: GeoJsonPoint;

  @Column({
    name: 'location_source',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  locationSource: DiscoveryLocationSource | null;

  @Column({ name: 'image_object_key', type: 'text' })
  imageObjectKey: string;

  @Column({ name: 'discovered_at', type: 'timestamptz' })
  discoveredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
