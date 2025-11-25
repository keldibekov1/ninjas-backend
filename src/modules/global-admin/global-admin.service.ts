import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class GlobalAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // FIXED: Return null when not found instead of throwing exception
  async findById(id?: number) {
    if (!id) {
      return null;
    }
  
    const admin = await this.prisma.globalAdmin.findUnique({
      where: { id },
    });
  
    // Return null if not found (for AuthGuard usage)
    return admin || null;
  }

  // NEW: Method that throws exception (for direct API usage)
  async findByIdOrThrow(id: number) {
    const admin = await this.findById(id);
    if (!admin) {
      throw new NotFoundException(`Global admin with ID ${id} not found`);
    }
    return admin;
  }

  async findByUsername(username: string) {
    return this.prisma.globalAdmin.findUnique({
      where: { username },
    });
  }

  async findAll() {
    return this.prisma.globalAdmin.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(createDto: any) {
    const existingAdmin = await this.findByUsername(createDto.username);
    if (existingAdmin) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    return this.prisma.globalAdmin.create({
      data: {
        ...createDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: number, updateDto: any) {
    await this.findByIdOrThrow(id); // Use the throwing version here

    if (updateDto.username) {
      const existingAdmin = await this.findByUsername(updateDto.username);
      if (existingAdmin && existingAdmin.id !== id) {
        throw new ConflictException('Username already exists');
      }
    }

    const updateData = { ...updateDto };
    if (updateDto.password) {
      updateData.password = await bcrypt.hash(updateDto.password, 10);
    }

    return this.prisma.globalAdmin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: number) {
    await this.findByIdOrThrow(id); // Use the throwing version here

    await this.prisma.globalAdmin.delete({
      where: { id },
    });
  }
}