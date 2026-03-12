import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tea } from '../teas/entities/tea.entity';
import * as cheerio from 'cheerio';

export interface CrawlConfig {
  nameSelector: string;
  typeSelector?: string;
  priceSelector?: string;
}

export interface TeaCrawlItem {
  name: string;
  type: string;
  price?: number;
}

@Injectable()
export class CrawlingService {
  private readonly logger = new Logger(CrawlingService.name);

  constructor(
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
  ) {}

  async preview(url: string, config: CrawlConfig): Promise<TeaCrawlItem[]> {
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChaLog-Bot/1.0)' },
      });
      clearTimeout(timeout);
      html = await res.text();
    } catch (err) {
      this.logger.warn(`Crawl fetch failed: ${url} — ${(err as Error).message}`);
      throw new BadRequestException(`URL 접근에 실패했습니다: ${(err as Error).message}`);
    }

    const $ = cheerio.load(html);
    const names: string[] = [];
    const types: string[] = [];
    const prices: string[] = [];

    $(config.nameSelector).each((_, el) => { names.push($(el).text().trim()); });
    if (config.typeSelector) {
      $(config.typeSelector).each((_, el) => { types.push($(el).text().trim()); });
    }
    if (config.priceSelector) {
      $(config.priceSelector).each((_, el) => { prices.push($(el).text().trim()); });
    }

    return names
      .filter(Boolean)
      .slice(0, 100)
      .map((name, idx) => ({
        name,
        type: types[idx] || '기타',
        price: prices[idx] ? parseInt(prices[idx].replace(/[^0-9]/g, ''), 10) || undefined : undefined,
      }));
  }

  async register(items: TeaCrawlItem[], sellerId?: number): Promise<{ success: number; skipped: number }> {
    let success = 0;
    let skipped = 0;

    for (const item of items) {
      const existing = await this.teasRepository.findOne({
        where: { name: item.name, type: item.type },
      });
      if (existing) { skipped++; continue; }

      await this.teasRepository.save(
        this.teasRepository.create({
          name: item.name,
          type: item.type,
          price: item.price,
          seller: sellerId ? ({ id: sellerId } as any) : null,
          averageRating: 0,
          reviewCount: 0,
        }),
      );
      success++;
    }

    return { success, skipped };
  }
}
