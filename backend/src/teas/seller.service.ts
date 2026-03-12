import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Seller } from './entities/seller.entity';
import { Tea } from './entities/tea.entity';

@Injectable()
export class SellerService {
  private readonly logger = new Logger(SellerService.name);

  constructor(
    @InjectRepository(Seller)
    private sellerRepository: Repository<Seller>,
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async createSeller(dto: {
    name: string;
    address?: string;
    mapUrl?: string;
    websiteUrl?: string;
    phone?: string;
    description?: string;
    businessHours?: string;
  }): Promise<Seller> {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new Error('찻집 이름을 입력해주세요.');
    }
    const existing = await this.sellerRepository.findOne({ where: { name: trimmed } });
    if (existing) {
      if (
        dto.address !== undefined ||
        dto.mapUrl !== undefined ||
        dto.websiteUrl !== undefined ||
        dto.phone !== undefined ||
        dto.description !== undefined ||
        dto.businessHours !== undefined
      ) {
        Object.assign(existing, {
          address: dto.address?.trim() || null,
          mapUrl: dto.mapUrl?.trim() || null,
          websiteUrl: dto.websiteUrl?.trim() || null,
          phone: dto.phone?.trim() || null,
          description: dto.description?.trim() || null,
          businessHours: dto.businessHours?.trim() || null,
        });
        return await this.sellerRepository.save(existing);
      }
      return existing;
    }
    try {
      const seller = this.sellerRepository.create({
        name: trimmed,
        address: dto.address?.trim() || null,
        mapUrl: dto.mapUrl?.trim() || null,
        websiteUrl: dto.websiteUrl?.trim() || null,
        phone: dto.phone?.trim() || null,
        description: dto.description?.trim() || null,
        businessHours: dto.businessHours?.trim() || null,
      });
      return await this.sellerRepository.save(seller);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
        const found = await this.sellerRepository.findOne({ where: { name: trimmed } });
        if (found) return found;
      }
      throw err;
    }
  }

  async findSellerByName(name: string): Promise<Seller | null> {
    return this.sellerRepository.findOne({ where: { name: decodeURIComponent(name) } });
  }

  async updateSeller(
    name: string,
    dto: {
      address?: string;
      mapUrl?: string;
      websiteUrl?: string;
      phone?: string;
      description?: string;
      businessHours?: string;
    },
  ): Promise<Seller | null> {
    const seller = await this.sellerRepository.findOne({
      where: { name: decodeURIComponent(name) },
    });
    if (!seller) return null;
    Object.assign(seller, {
      address: dto.address !== undefined ? (dto.address?.trim() || null) : seller.address,
      mapUrl: dto.mapUrl !== undefined ? (dto.mapUrl?.trim() || null) : seller.mapUrl,
      websiteUrl:
        dto.websiteUrl !== undefined ? (dto.websiteUrl?.trim() || null) : seller.websiteUrl,
      phone: dto.phone !== undefined ? (dto.phone?.trim() || null) : seller.phone,
      description:
        dto.description !== undefined ? (dto.description?.trim() || null) : seller.description,
      businessHours:
        dto.businessHours !== undefined ? (dto.businessHours?.trim() || null) : seller.businessHours,
    });
    return await this.sellerRepository.save(seller);
  }

  async findSellers(): Promise<{ name: string; teaCount: number }[]> {
    const rows: { name: string; teaCount: string }[] = await this.dataSource.query(
      `SELECT s.name AS name, COUNT(*) AS teaCount
       FROM teas t
       JOIN sellers s ON t.sellerId = s.id
       WHERE t.sellerId IS NOT NULL
       GROUP BY s.id, s.name
       ORDER BY teaCount DESC`,
    );
    const fromTeas = rows.map((r) => ({ name: r.name, teaCount: Number(r.teaCount) }));
    try {
      const sellerRows: { name: string }[] = await this.dataSource.query(
        `SELECT name FROM sellers`,
      );
      const teaSellerNames = new Set(fromTeas.map((s) => s.name));
      const additional = sellerRows
        .filter((s) => !teaSellerNames.has(s.name))
        .map((s) => ({ name: s.name, teaCount: 0 }));
      return [...fromTeas, ...additional];
    } catch (err) {
      this.logger.warn(`sellers 테이블 조회 실패 (findAllSellers): ${err instanceof Error ? err.message : String(err)}`);
      return fromTeas;
    }
  }

  async findSellersByQuery(query: string): Promise<{ name: string; teaCount: number }[]> {
    const rows: { name: string; teaCount: string }[] = await this.dataSource.query(
      `SELECT s.name AS name, COUNT(*) AS teaCount
       FROM teas t
       JOIN sellers s ON t.sellerId = s.id
       WHERE t.sellerId IS NOT NULL AND s.name LIKE ?
       GROUP BY s.id, s.name
       ORDER BY teaCount DESC
       LIMIT 20`,
      [`%${query}%`],
    );
    const fromTeas = rows.map((r) => ({ name: r.name, teaCount: Number(r.teaCount) }));
    try {
      const sellerRows: { name: string }[] = await this.dataSource.query(
        `SELECT name FROM sellers WHERE name LIKE ?`,
        [`%${query}%`],
      );
      const teaSellerNames = new Set(fromTeas.map((s) => s.name));
      const additional = sellerRows
        .filter((s) => !teaSellerNames.has(s.name))
        .map((s) => ({ name: s.name, teaCount: 0 }));
      return [...fromTeas, ...additional].slice(0, 20);
    } catch (err) {
      this.logger.warn(`sellers 테이블 조회 실패 (findSellersByQuery): ${err instanceof Error ? err.message : String(err)}`);
      return fromTeas.slice(0, 20);
    }
  }

  async findBySeller(sellerName: string): Promise<Tea[]> {
    const seller = await this.sellerRepository.findOne({
      where: { name: sellerName },
    });
    if (!seller) return [];
    return this.teasRepository.find({
      where: { seller: { id: seller.id } },
      relations: ['seller'],
      order: { reviewCount: 'DESC', averageRating: 'DESC', id: 'ASC' },
    });
  }
}
