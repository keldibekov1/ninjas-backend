import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { metaData, startIndex } from '../../utils/pagination';
import { CreateCrewDto, FilterCrewsQueryDto, UpdateCrewDto } from './dto';

@Injectable()
export class CrewService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

 public async updateMemberRole(
  crewId: number,
  workerId: number,
  isLeader: boolean,
  tenantId: number,
) {
  const crew = await this.prisma.crew.findFirst({
    where: {
      id: crewId,
      tenantId,
    },
  });

  if (!crew) {
    throw new NotFoundException(`Crew with id ${crewId} not found!`);
  }

  return this.prisma.crewMember.update({
    where: {
      workerId_crewId: {
        workerId,
        crewId,
      },
    },
    data: {
      isLeader,
    },
  });
}

public async removeMember(
  crewId: number,
  workerId: number,
  tenantId: number,
) {
  const crew = await this.prisma.crew.findFirst({
    where: {
      id: crewId,
      tenantId,
    },
  });

  if (!crew) {
    throw new NotFoundException(`Crew with id ${crewId} not found!`);
  }

  return this.prisma.crewMember.delete({
    where: {
      workerId_crewId: {
        workerId,
        crewId,
      },
    },
  });
}

public async addMember(
  crewId: number,
  workerId: number,
  isLeader: boolean,
  tenantId: number,
) {
  const crew = await this.prisma.crew.findFirst({
    where: {
      id: crewId,
      tenantId,
    },
  });

  if (!crew) {
    throw new NotFoundException(`Crew with id ${crewId} not found!`);
  }

  // Check if member already exists
  const existingMember = await this.prisma.crewMember.findUnique({
    where: {
      workerId_crewId: {
        workerId,
        crewId,
      },
    },
  });

  if (existingMember) {
    throw new Error('Member already exists in this crew');
  }

  return this.prisma.crewMember.create({
    data: {
      crewId,
      workerId,
      isLeader,
    },
  });
}

  
  public async getCrewMembers(crewId: number) {
    const crew = await this.prisma.crew.findUnique({
      where: { id: crewId },
      include: {
        members: {
          include: {
            worker: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
  
    return crew.members.map(member => ({
      id: member.workerId,
      name: member.worker.name,
      isLeader: member.isLeader
    }));
  }

  public async create(data: CreateCrewDto, tenantId: number) {
    const crew = await this.prisma.crew.create({
      data: {
        name: data.name,
        description: data.description,
        tenantId,
        members: {
          create: data.members?.map(member => ({
            workerId: member.workerId,
            isLeader: member.isLeader,
          })),
        },
      },
      include: {
        members: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return crew;
  }

  public async getCrews(query: FilterCrewsQueryDto, tenantId: number) {
    const { page = 1, limit = 10, isActive } = query;

    const whereClause = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
    };

    const crews = await this.prisma.crew.findMany({
      where: whereClause,
      include: {
        members: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
      take: limit,
      skip: startIndex(page, limit),
    });

    const meta = metaData(
      page,
      limit,
      await this.prisma.crew.count({
        where: whereClause,
      }),
      'totalCrews',
    );

    // Transform the data to a more convenient format
    const formattedCrews = crews.map(crew => ({
      ...crew,
      members: crew.members.map(member => ({
        id: member.workerId,
        name: member.worker.name,
        isLeader: member.isLeader,
        joinedAt: member.joinedAt,
      })),
    }));

    return {
      meta,
      crews: formattedCrews,
    };
  }

  public async getCrewById(id: number, tenantId: number) {
    const crew = await this.prisma.crew.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        members: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${id} not found!`);
    }

    return {
      ...crew,
      members: crew.members.map(member => ({
        id: member.workerId,
        name: member.worker.name,
        isLeader: member.isLeader,
        joinedAt: member.joinedAt,
      })),
    };
  }

  public async update(id: number, data: UpdateCrewDto, tenantId: number) {
    const crew = await this.prisma.crew.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${id} not found!`);
    }

    return this.prisma.crew.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
      include: {
        members: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  public async delete(id: number, tenantId: number) {
    const crew = await this.prisma.crew.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${id} not found!`);
    }

    return this.prisma.crew.delete({
      where: { id },
    });
  }
}