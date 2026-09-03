import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

type GeoJsonPoint = {
  type: 'Point';
  coordinates: [number, number];
};

@Entity({ name: 'pois' })
export class Poi {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: GeoJsonPoint;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'catalog_revision', type: 'integer', default: 0 })
  catalogRevision: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
