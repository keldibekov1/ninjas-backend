import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  public async assignCrewToOrder(
    tenantId: number, 
    crewId: number, 
    reportId: number
  ) {
    // Check if crew exists
    const crew = await this.prisma.crew.findFirst({
      where: { 
        id: crewId, 
        tenantId 
      }
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${crewId} not found!`);
    }

    // Check if order exists
    const order = await this.prisma.order.findFirst({
      where: { 
        report_id: reportId, 
        tenantId 
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with report_id ${reportId} not found!`);
    }

    // Check if order is already assigned to a crew
    const existingAssignment = await this.prisma.crewAssignment.findUnique({
      where: { 
        crewId_reportId: {
          crewId,
          reportId
        }
      }
    });

    if (existingAssignment) {
      throw new BadRequestException(
        `Order with report_id ${reportId} is already assigned to this crew!`
      );
    }

    // Create crew assignment
    return this.prisma.crewAssignment.create({
      data: {
        crewId,
        reportId,
        tenantId
      }
    });
  }

  public async getCrewAssignments(crewId: number) {
    return this.prisma.crewAssignment.findMany({
      where: { crewId },
      include: {
        order: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  public assignOrder(tenantId: number, workerId: number, report_id: number) {
    return this.prisma.assignment.create({
      data: {
        worker_id: workerId,
        report_id: report_id,
        tenantId
      },
    });
  }

  public findById(id: number) {
    return this.prisma.assignment.findUnique({
      where: {
        id,
      },
    });
  }

  public findByWorkerAndReportId(workerId: number, report_id: number) {
    return this.prisma.assignment.findFirst({
      where: {
        worker_id: workerId,
        report_id,
      },
    });
  }

  public findCrewAssignmentById(id: number) {
    return this.prisma.crewAssignment.findUnique({
      where: {
        id,
      },
    });
  }
  
  public deleteCrewAssignment(id: number) {
    return this.prisma.crewAssignment.delete({
      where: {
        id,
      },
    });
  }

public async getWorkerAssignments(workerId: number, tenantId: number) {
  // Find crews the worker is a member of
  const workerCrews = await this.prisma.crewMember.findMany({
    where: { workerId },
    select: { crewId: true }
  });

  const crewIds = workerCrews.map(cm => cm.crewId);

  // Retrieve individual assignments
  const individualAssignments = await this.prisma.assignment.findMany({
    where: {
      worker_id: workerId,
      tenantId
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Retrieve crew assignments
  const crewAssignments = await this.prisma.crewAssignment.findMany({
    where: {
      crewId: { in: crewIds },
      tenantId
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Combine assignments
  return [...individualAssignments, ...crewAssignments];
}

  public delete(id: number) {
    return this.prisma.assignment.delete({
      where: {
        id,
      },
    });
  }
}
