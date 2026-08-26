import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Poi } from './poi.entity';

export interface PoiResponse {
  id: string;
  title: string;
  description: string | null;
  longitude: number;
  latitude: number;
  imageUrl: string | null;
}

interface PoiRow {
  id: string;
  title: string;
  description: string | null;
  longitude: string;
  latitude: string;
  image_url: string | null;
}

@Injectable()
export class PoisService {
  constructor(
    @InjectRepository(Poi)
    private readonly pois: Repository<Poi>,
  ) {}

  async findAll(): Promise<PoiResponse[]> {
    const rows = await this.pois
      .createQueryBuilder('poi')
      .select('poi.id', 'id')
      .addSelect('poi.title', 'title')
      .addSelect('poi.description', 'description')
      .addSelect('ST_X(poi.location)', 'longitude')
      .addSelect('ST_Y(poi.location)', 'latitude')
      .addSelect('poi.imageUrl', 'image_url')
      .orderBy('poi.title', 'ASC')
      .getRawMany<PoiRow>();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      imageUrl: row.image_url,
    }));
  }
}
