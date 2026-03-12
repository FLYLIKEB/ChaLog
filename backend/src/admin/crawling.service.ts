import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  private validateUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('유효하지 않은 URL입니다.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('http 또는 https URL만 허용됩니다.');
    }
    const h = parsed.hostname;
    const privatePatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^localhost$/i,
    ];
    if (privatePatterns.some((p) => p.test(h))) {
      throw new BadRequestException('내부 네트워크 주소는 허용되지 않습니다.');
    }
  }

  async preview(url: string, config: CrawlConfig): Promise<TeaCrawlItem[]> {
    this.validateUrl(url);
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
    if (items.length === 0) return { success: 0, skipped: 0 };

    const existingTeas = await this.teasRepository.findBy({ name: In(items.map((i) => i.name)) });
    const existingKeys = new Set(existingTeas.map((t) => `${t.name}||${t.type}`));

    const toInsert = items
      .filter((item) => !existingKeys.has(`${item.name}||${item.type}`))
      .map((item) =>
        this.teasRepository.create({
          name: item.name,
          type: item.type,
          price: item.price,
          seller: sellerId ? ({ id: sellerId } as any) : null,
          averageRating: 0,
          reviewCount: 0,
        }),
      );

    if (toInsert.length > 0) {
      await this.teasRepository.save(toInsert);
    }

    return { success: toInsert.length, skipped: items.length - toInsert.length };
  }
}
