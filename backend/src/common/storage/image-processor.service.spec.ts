import { Test, TestingModule } from '@nestjs/testing';
import { ImageProcessorService } from './image-processor.service';

describe('ImageProcessorService', () => {
  let service: ImageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessorService],
    }).compile();

    service = module.get<ImageProcessorService>(ImageProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail buffer for valid jpeg', async () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
        ...Array(100).fill(0),
        0xff, 0xd9,
      ]);
      const result = await service.generateThumbnail(jpegBuffer, 'image/jpeg');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return original buffer for unsupported mime type', async () => {
      const buffer = Buffer.from('test');
      const result = await service.generateThumbnail(buffer, 'image/gif');
      expect(result).toBe(buffer);
    });

    it('should validate image type', () => {
      expect(service.validateImageType('image/jpeg')).toBe(true);
      expect(service.validateImageType('image/png')).toBe(true);
      expect(service.validateImageType('image/webp')).toBe(true);
      expect(service.validateImageType('image/gif')).toBe(false);
    });
  });
});
