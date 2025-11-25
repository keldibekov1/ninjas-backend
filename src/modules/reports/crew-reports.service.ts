import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CrewReportFilters, 
  CrewWorkSummary, 
  CrewReportResponse, 
  CrewPerformanceMetrics,
  ExpenseSummary,
  WorkOrderSummary,
  TaskSummary
} from './types/crew-reports.types';

@Injectable()
export class CrewReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCrewReport(filters: CrewReportFilters, tenantId: number): Promise<CrewReportResponse> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        crewId, 
        from_date, 
        to_date
      } = filters;
      
      const skip = (page - 1) * limit;

      // Build date range filter for completed orders only
      const completedDateFilter = from_date && to_date ? {
        completed_date: {
          gte: new Date(from_date),
          lte: new Date(to_date),
        }
      } : {
        completed_date: { not: null } // Always require completion date
      };

      // Get ONLY crew assignments for COMPLETED orders
      const crewAssignments = await this.prisma.crewAssignment.findMany({
        where: {
          tenantId,
          ...(crewId && { crewId }),
          order: {
            tenantId,
            status: 'COMPLETED', // Only completed orders
            ...completedDateFilter
          }
        },
        include: {
          crew: {
            include: {
              members: {
                include: {
                  worker: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              }
            }
          },
          order: {
            include: {
              Tasks: {
                include: {
                  TaskTimeRecords: {
                    include: {
                      worker: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              },
              expenses: true
            }
          }
        },
        orderBy: { 
          order: {
            completed_date: 'desc' // Order by completion date
          }
        },
        skip,
        take: limit,
      });

      // Get all crew member IDs from the assignments
      const crewMemberIds = new Set<number>();
      const crewMembersByCrewId = new Map<number, number[]>();
      
      crewAssignments.forEach(assignment => {
        const memberIds = assignment.crew.members.map(member => member.workerId);
        memberIds.forEach(id => crewMemberIds.add(id));
        crewMembersByCrewId.set(assignment.crew.id, memberIds);
      });

      // Get shift records for crew members within the completion date range
      const shiftRecords = crewMemberIds.size > 0 ? await this.prisma.shiftTimeRecord.findMany({
        where: {
          tenantId,
          worker_id: { in: Array.from(crewMemberIds) },
          ...(from_date && to_date && {
            date: {
              gte: new Date(from_date),
              lte: new Date(to_date),
            }
          })
        },
        include: {
          worker: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }) : [];

      // Group assignments by completion date and crew
      const groupedData = new Map<string, Map<number, any>>();
      
      crewAssignments.forEach(assignment => {
        const completionDate = assignment.order.completed_date;
        const dateKey = completionDate ? completionDate.toISOString().split('T')[0] : 'no-date';
        const crewId = assignment.crew.id;
        
        if (!groupedData.has(dateKey)) {
          groupedData.set(dateKey, new Map());
        }
        
        const dateGroup = groupedData.get(dateKey);
        if (!dateGroup.has(crewId)) {
          dateGroup.set(crewId, {
            crew: assignment.crew,
            assignments: []
          });
        }
        
        dateGroup.get(crewId).assignments.push(assignment);
      });

      // Transform data into report format grouped by date
      const crewReports: CrewWorkSummary[] = [];
      
      for (const [dateKey, crewGroups] of groupedData.entries()) {
        for (const [crewId, crewData] of crewGroups.entries()) {
          const crew = crewData.crew;
          const assignments = crewData.assignments;
          
          const workOrders = assignments.map(assignment => {
            const order = assignment.order;
            
            // Calculate task hours for this order from crew members only
            const taskHours = order.Tasks.reduce((total, task) => {
              const taskTime = task.TaskTimeRecords
                .filter(record => {
                  // Only include time records from crew members
                  return record.worker_id && crewMembersByCrewId.get(crewId)?.includes(record.worker_id);
                })
                .reduce((taskTotal, record) => {
                  if (record.start_time && record.end_time) {
                    const timeDiff = record.spent_time || (record.end_time - record.start_time);
                    return taskTotal + timeDiff;
                  }
                  return taskTotal;
                }, 0);
              return total + taskTime;
            }, 0);

            // Calculate expenses
            const expenses: ExpenseSummary = {
              total: order.expenses.reduce((sum, expense) => sum + expense.amount, 0),
              spending: order.expenses
                .filter(e => e.action === 'SPENDING')
                .reduce((sum, expense) => sum + expense.amount, 0),
              penalties: order.expenses
                .filter(e => e.action === 'PENALTY')
                .reduce((sum, expense) => sum + expense.amount, 0)
            };

            const workOrderSummary: WorkOrderSummary = {
              reportId: order.report_id,
              woNumber: order.wo_number || `WO-${order.report_id}`,
              status: order.status,
              address: [order.address, order.city, order.state]
                .filter(Boolean)
                .join(', ') || 'No address provided',
              startDate: assignment.createdAt,
              completedDate: order.completed_date,
              totalHours: taskHours,
              tasks: order.Tasks.map(task => ({
                id: task.id,
                description: task.desc || 'No description',
                isCompleted: task.isCompleted,
                completedDate: task.completedDate,
                timeSpent: task.TaskTimeRecords
                  .filter(record => {
                    // Only include time records from crew members
                    return record.worker_id && crewMembersByCrewId.get(crewId)?.includes(record.worker_id);
                  })
                  .reduce((total, record) => {
                    if (record.start_time && record.end_time) {
                      return total + (record.spent_time || (record.end_time - record.start_time));
                    }
                    return total;
                  }, 0)
              })),
              expenses
            };

            return workOrderSummary;
          });

          // Calculate shift hours for crew members on the completion date
          const completionDate = dateKey !== 'no-date' ? new Date(dateKey) : null;
          const relevantShiftRecords = shiftRecords.filter(record => {
            const isCrewMember = crewMembersByCrewId.get(crewId)?.includes(record.worker_id);
            const isCorrectDate = completionDate ? 
              record.date.toISOString().split('T')[0] === dateKey : true;
            return isCrewMember && isCorrectDate;
          });

          const totalShiftHours = relevantShiftRecords.reduce((total, record) => {
            if (record.clockin_time && record.clockout_time) {
              const hours = record.clockout_time - record.clockin_time;
              return total + hours;
            }
            return total;
          }, 0);

          // Calculate total task spent time for crew members
          const totalTaskSpentTime = workOrders.reduce((total, wo) => {
            return total + wo.tasks.reduce((taskTotal, task) => taskTotal + task.timeSpent, 0);
          }, 0);

          const crewReport: CrewWorkSummary = {
            crewId: crew.id,
            crewName: crew.name,
            members: crew.members.map(member => ({
              workerId: member.workerId,
              workerName: member.worker.name,
              isLeader: member.isLeader
            })),
            workOrders,
            totalHours: totalShiftHours, // Total shift hours for all crew members
            totalWorkOrders: workOrders.length,
            completedWorkOrders: workOrders.filter(wo => wo.status === 'COMPLETED').length,
            totalCost: workOrders.reduce((sum, wo) => sum + wo.expenses.total, 0),
            taskTotalSpentTime: totalTaskSpentTime, // Combined task time from crew members
          };

          crewReports.push(crewReport);
        }
      }

      // Sort reports by most recent completion date first
      crewReports.sort((a, b) => {
        // Extract completion dates from work orders for comparison
        const getLatestCompletionDate = (workOrders: WorkOrderSummary[]) => {
          const dates = workOrders
            .map(wo => wo.completedDate)
            .filter((date): date is Date => date !== null)
            .sort((dateA, dateB) => dateB.getTime() - dateA.getTime());
          return dates[0] || null;
        };

        const aLatest = getLatestCompletionDate(a.workOrders);
        const bLatest = getLatestCompletionDate(b.workOrders);
        
        if (!aLatest && !bLatest) return 0;
        if (!aLatest) return 1;
        if (!bLatest) return -1;
        return bLatest.getTime() - aLatest.getTime();
      });

      // Get total count for pagination
      const totalCount = await this.prisma.crewAssignment.count({
        where: {
          tenantId,
          ...(crewId && { crewId }),
          order: {
            tenantId,
            status: 'COMPLETED',
            ...completedDateFilter
          }
        },
      });

      return {
        total: totalCount,
        page,
        limit,
        data: crewReports,
        summary: {
          totalCrews: new Set(crewReports.map(crew => crew.crewId)).size,
          totalWorkOrders: crewReports.reduce((sum, crew) => sum + crew.totalWorkOrders, 0),
          totalCompletedOrders: crewReports.reduce((sum, crew) => sum + crew.completedWorkOrders, 0),
          totalShiftHours: crewReports.reduce((sum, crew) => sum + crew.totalHours, 0),
          totalTaskSpentTime: crewReports.reduce((sum, crew) => sum + crew.taskTotalSpentTime, 0),
          totalCost: crewReports.reduce((sum, crew) => sum + crew.totalCost, 0),
        }
      };

    } catch (error) {
      console.error('Error in getCrewReport:', error);
      throw new InternalServerErrorException(`Failed to generate crew report: ${error.message}`);
    }
  }

  async getCrewPerformanceMetrics(crewId: number, tenantId: number): Promise<CrewPerformanceMetrics> {
    try {
      const crew = await this.prisma.crew.findFirst({
        where: {
          id: crewId,
          tenantId,
        },
        include: {
          members: {
            include: {
              worker: true
            }
          }
        }
      });

      if (!crew) {
        throw new NotFoundException(`Crew with id ${crewId} not found`);
      }

      // Get only crew assignments for completed orders
      const assignments = await this.prisma.crewAssignment.findMany({
        where: {
          crewId,
          tenantId,
          order: {
            status: 'COMPLETED'
          }
        },
        include: {
          order: true
        }
      });

      const completedOrders = assignments.filter(
        assignment => assignment.order.status === 'COMPLETED'
      );

      const averageCompletionTime = completedOrders.length > 0 ? 
        completedOrders.reduce((sum, assignment) => {
          if (assignment.createdAt && assignment.order.completed_date) {
            const start = new Date(assignment.createdAt);
            const end = new Date(assignment.order.completed_date);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          }
          return sum;
        }, 0) / completedOrders.length : 0;

      return {
        crewId: crew.id,
        crewName: crew.name,
        memberCount: crew.members.length,
        totalAssignments: assignments.length,
        completedAssignments: completedOrders.length,
        completionRate: assignments.length > 0 ? 
          (completedOrders.length / assignments.length) * 100 : 100, // 100% since we only query completed
        averageCompletionDays: Math.round(averageCompletionTime * 100) / 100,
        productivity: {
          ordersPerMember: crew.members.length > 0 ? 
            Math.round((assignments.length / crew.members.length) * 100) / 100 : 0,
          completedOrdersPerMember: crew.members.length > 0 ? 
            Math.round((completedOrders.length / crew.members.length) * 100) / 100 : 0,
        }
      };

    } catch (error) {
      console.error('Error in getCrewPerformanceMetrics:', error);
      throw new InternalServerErrorException(`Failed to get crew performance metrics: ${error.message}`);
    }
  }
}