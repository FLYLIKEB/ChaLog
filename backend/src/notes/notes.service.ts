import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { TeasService } from '../teas/teas.service';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    private teasService: TeasService,
  ) {}

  async create(userId: string, createNoteDto: CreateNoteDto): Promise<Note> {
    // 차가 존재하는지 확인
    const tea = await this.teasService.findOne(createNoteDto.teaId);
    
    const note = this.notesRepository.create({
      ...createNoteDto,
      userId,
      teaId: tea.id,
    });

    const savedNote = await this.notesRepository.save(note);
    
    // 차의 평균 평점 업데이트
    await this.updateTeaRating(tea.id);

    return savedNote;
  }

  async findAll(userId?: string, isPublic?: boolean): Promise<Note[]> {
    const queryBuilder = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.user', 'user')
      .leftJoinAndSelect('note.tea', 'tea')
      .orderBy('note.createdAt', 'DESC');

    if (userId) {
      queryBuilder.where('note.userId = :userId', { userId });
    }

    if (isPublic !== undefined) {
      if (userId) {
        queryBuilder.andWhere('note.isPublic = :isPublic', { isPublic });
      } else {
        queryBuilder.where('note.isPublic = :isPublic', { isPublic });
      }
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string, userId?: string): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['user', 'tea'],
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    // 비공개 노트는 작성자만 볼 수 있음
    if (!note.isPublic && note.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this note');
    }

    return note;
  }

  async update(id: string, userId: string, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id, userId);

    if (note.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this note');
    }

    Object.assign(note, updateNoteDto);
    const updatedNote = await this.notesRepository.save(note);

    // 차의 평균 평점 업데이트
    await this.updateTeaRating(note.teaId);

    return updatedNote;
  }

  async remove(id: string, userId: string): Promise<void> {
    const note = await this.findOne(id, userId);

    if (note.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this note');
    }

    const teaId = note.teaId;
    await this.notesRepository.remove(note);

    // 차의 평균 평점 업데이트
    await this.updateTeaRating(teaId);
  }

  private async updateTeaRating(teaId: string): Promise<void> {
    const notes = await this.notesRepository.find({
      where: { teaId },
    });

    if (notes.length === 0) {
      return;
    }

    const averageRating =
      notes.reduce((sum, note) => sum + Number(note.rating), 0) / notes.length;

    await this.teasService['teasRepository'].update(teaId, {
      averageRating: Number(averageRating.toFixed(2)),
      reviewCount: notes.length,
    });
  }
}
