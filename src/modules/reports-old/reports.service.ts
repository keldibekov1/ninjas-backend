import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkerService } from '../worker/worker.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workerService: WorkerService,
  ) {}

  public async getOrdersReport(
    workerId?: number,
    from_date?: string,
    to_date?: string,
  ) {
    try {
      // 1. Fetch base data
      const [orders, shifts, workers, expenses] = await Promise.all([
        this.fetchOrders(workerId, from_date, to_date),
        this.fetchShifts(workerId, from_date, to_date),
        this.prisma.worker.findMany({
          select: {
            id: true,
            name: true,
            daily_pay_rate: true,
            extra_hourly_rate: true,
          }
        }),
        this.prisma.expense.findMany({
          where: {
            workerId: workerId || undefined,
            createdAt: {
              gte: from_date ? new Date(from_date) : undefined,
              lte: to_date ? new Date(to_date) : undefined,
            }
          },
          include: {
            worker: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        })
      ]);

      // 2. Process and format data
      const formattedOrders = await this.formatOrders(orders);
      const formattedShifts = this.formatShifts(shifts);

      // 3. Calculate statistics
      const stats = await this.calculateStats(workerId);

      // 4. Calculate worker-specific analytics
      const workerAnalytics = this.calculateWorkerAnalytics(
        formattedOrders,
        formattedShifts,
        workers,
        expenses,
        workerId
      );

      return {
        orders: {
          stats,
          overall: workerAnalytics.totals,
          list: formattedOrders,
        },
        shifts: formattedShifts,
      };
    } catch (error) {
      console.error('Error in getOrdersReport:', error);
      throw error;
    }
  }

  private async calculateStats(workerId?: number) {
    const [
      total_orders,
      completed_orders,
      uncompleted_orders,
      rejected_orders,
      total_tasks,
      completed_tasks,
      uncompleted_tasks
    ] = await Promise.all([
      this.prisma.order.count({
        where: workerId ? { Workers: { some: { worker_id: workerId } } } : undefined
      }),
      this.prisma.order.count({
        where: {
          ...(workerId ? { Workers: { some: { worker_id: workerId } } } : {}),
          status: 'COMPLETED'
        }
      }),
      this.prisma.order.count({
        where: {
          ...(workerId ? { Workers: { some: { worker_id: workerId } } } : {}),
          status: 'UNCOMPLETED'
        }
      }),
      this.prisma.order.count({
        where: {
          ...(workerId ? { Workers: { some: { worker_id: workerId } } } : {}),
          status: 'REJECTED'
        }
      }),
      this.prisma.task.count({
        where: workerId ? {
          order: { Workers: { some: { worker_id: workerId } } }
        } : undefined
      }),
      this.prisma.task.count({
        where: {
          ...(workerId ? {
            order: { Workers: { some: { worker_id: workerId } } }
          } : {}),
          isCompleted: true
        }
      }),
      this.prisma.task.count({
        where: {
          ...(workerId ? {
            order: { Workers: { some: { worker_id: workerId } } }
          } : {}),
          isCompleted: false
        }
      })
    ]);

    return {
      orders: { total_orders, completed_orders, uncompleted_orders, rejected_orders },
      tasks: { total_tasks, completed_tasks, uncompleted_tasks }
    };
  }

  private calculateWorkerAnalytics(
    orders: any[],
    shifts: any[],
    workers: any[],
    expenses: any[],
    workerId?: number
  ) {
    const analytics = new Map();

    // Process shifts first to establish base records
    shifts.forEach(shift => {
      const worker = workers.find(w => w.id === shift.workerId);
      if (!worker) return;

      const date = shift.date;
      const key = `${worker.id}-${date}`;

      if (!analytics.has(key)) {
        analytics.set(key, {
          workerId: worker.id,
          workerName: worker.name,
          dailyPayRate: worker.daily_pay_rate,
          extraHourlyRate: worker.extra_hourly_rate,
          completedOrders: 0,
          completedTasks: 0,
          clockInTime: shift.clockin_time,
          finishJobTime: shift.finishjob_time,
          clockOutTime: shift.clockout_time,
          workedHours: parseFloat(shift.shiftDuration) - 1, // Subtract 1 hour for break
          taskTime: 0,
          expenses: 0,
          salary: worker.daily_pay_rate, // Base salary
          date: date
        });
      }
    });

    // Process orders and tasks
    orders.forEach(order => {
      if (order.status === 'COMPLETED' && order.completed_date) {
        const date = new Date(order.completed_date).toISOString().split('T')[0];
        
        order.task.list.forEach(task => {
          if (task.completion?.worker) {
            const workerId = task.completion.worker.id;
            const worker = workers.find(w => w.id === workerId);
            if (!worker) return;

            const key = `${workerId}-${date}`;
            const record = analytics.get(key) || {
              workerId: worker.id,
              workerName: worker.name,
              dailyPayRate: worker.daily_pay_rate,
              extraHourlyRate: worker.extra_hourly_rate,
              completedOrders: 0,
              completedTasks: 0,
              clockInTime: null,
              finishJobTime: null,
              clockOutTime: null,
              workedHours: 0,
              taskTime: 0,
              expenses: 0,
              salary: worker.daily_pay_rate,
              date: date
            };

            record.completedOrders = 1;
            record.completedTasks += 1;
            record.taskTime += task.completion.spent_time || 0;

            analytics.set(key, record);
          }
        });
      }
    });

    // Process expenses
    expenses.forEach(expense => {
      const date = new Date(expense.createdAt).toISOString().split('T')[0];
      const key = `${expense.worker.id}-${date}`;
      
      if (analytics.has(key)) {
        const record = analytics.get(key);
        record.expenses += expense.amount;
        analytics.set(key, record);
      }
    });

    // Calculate totals
    const totals = {
      total_spent_time: 0,
      total_spent_amount: 0,
      total_task_price: 0,
      total_profit: 0,
      total_worked_hours: 0,
      total_salaries: 0,
      total_expenses: 0,
      worker: workerId ? {
        name: workers.find(w => w.id === workerId)?.name,
        daily_pay_rate: workers.find(w => w.id === workerId)?.daily_pay_rate,
        extra_hourly_rate: workers.find(w => w.id === workerId)?.extra_hourly_rate,
        worked_hours: 0,
        total_salary: 0,
        expenses: 0
      } : null
    };

    // Convert analytics map to array and calculate totals
    const analyticsArray = Array.from(analytics.values());
    analyticsArray.forEach(record => {
      totals.total_spent_time += record.taskTime;
      totals.total_worked_hours += record.workedHours;
      totals.total_salaries += record.salary;
      totals.total_expenses += record.expenses;
    });

    return {
      records: analyticsArray,
      totals
    };
  }
  
  private async fetchOrders(
    workerId?: number,
    from_date?: string,
    to_date?: string,
  ) {
    return this.prisma.order.findMany({
      where: {
        ...(workerId ? {
          Workers: {
            some: {
              worker_id: workerId,
            },
          },
        } : {}),
        status: 'COMPLETED',
        AND: [
          {
            completed_date: {
              gte: from_date ? from_date : undefined,
              lte: to_date ? to_date : undefined,
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        report_id: true,
        wo_number: true,
        work_type_alias: true,
        city: true,
        address: true,
        status: true,
        completed_date: true,
        Tasks: {
          where: { isCompleted: true },
          include: { 
            TaskTimeRecords: {
              include: {
                worker: {
                  select: {
                    id: true,
                    name: true,
                    daily_pay_rate: true,
                    extra_hourly_rate: true
                  }
                }
              }
            }
          },
        },
        Workers: {
          include: {
            worker: {
              select: { 
                id: true,
                name: true, 
                daily_pay_rate: true, 
                extra_hourly_rate: true 
              },
            },
          },
        },
      },
    });
  }
  
  public async fetchShifts(worker_id?: number, from_date?: string, to_date?: string) {
    return this.prisma.shiftTimeRecord.findMany({
      where: {
        worker_id: worker_id || undefined,
        date: {
          gte: from_date ? new Date(from_date) : undefined,
          lte: to_date ? new Date(to_date) : undefined,
        },
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        worker: {  // Include worker information with each shift
          select: {
            id: true,
            name: true,
            daily_pay_rate: true,
            extra_hourly_rate: true,
          }
        }
      },
    });
  }

  // Format shifts data
  private formatShifts(shifts: any[]) {
    return shifts.map(shift => {
      const shiftDuration = (new Date(shift.clockout_time).getTime() - new Date(shift.clockin_time).getTime()) / 3600000; // Convert milliseconds to hours
      return {
        workerId: shift.worker_id,  // Ensure worker_id is part of the formatted shift
        clockin_time: shift.clockin_time,
        finishjob_time: shift.finishjob_time,
        clockout_time: shift.clockout_time,
        shiftDuration: shiftDuration.toFixed(2), // Format to 2 decimal places
        date: shift.date.toISOString().split('T')[0], // Format date to YYYY-MM-DD
      };
    });
  }


  private async formatOrders(orders: any[]) {
    return Promise.all(
      orders.map(async (order) => {
        const taskList = await this.formatTasks(order.Tasks);
        const overallSpentTime = await this.calculateOverallSpentTime(order.Tasks);

        return {
          report_id: order.report_id,
          wo_number: order.wo_number,
          work_type_alias: order.work_type_alias,
          city: order.city,
          address: order.address,
          status: order.status,
          completed_date: order.completed_date,
          workers: order?.Workers?.map(
            (worker: { worker: { name: any } }) => worker?.worker?.name,
          ).join(', '),
          task: {
            list: taskList,
            overall: {
              spent_time: overallSpentTime || 0,
              spent_amount: taskList.reduce(
                (acc, task) => acc + (task.completion.spent_amount || 0),
                0,
              ),
              total_tasks_price: taskList.reduce(
                (acc, task) => acc + (task.total || 0),
                0,
              ),
            },
          },
        };
      }),
    );
  }

  private async formatTasks(tasks: any[]) {
    return Promise.all(
      tasks.map(async (task) => {
        const totalSpentTime = await this.calculateOverallSpentTime([task]);
        
        // Get worker info from TaskTimeRecords if available
        const workerFromRecords = task.TaskTimeRecords?.[0]?.worker_id;
        const workerId = task.completedWorker || workerFromRecords;
        
        // Get worker details
        const worker = workerId ? await this.prisma.worker.findUnique({
          where: { id: workerId },
          select: {
            id: true,
            name: true,
            daily_pay_rate: true,
            extra_hourly_rate: true
          }
        }) : null;
  
        return {
          id: task.id,
          desc: task.desc,
          quantity: task.qty,
          price: task.price,
          total: task.total,
          completion: {
            spent_time: totalSpentTime || 0,
            spent_amount: worker
              ? this.calculateSpentAmount(
                  totalSpentTime,
                  worker.daily_pay_rate,
                  worker.extra_hourly_rate,
                )
              : 0,
            worker: worker ? {
              id: worker.id,
              name: worker.name
            } : null,
          },
        };
      }),
    );
  }

  private calculateSpentAmount(
    totalSpentTime: number,
    dailyPayRate: number,
    extraHourlyRate: number,
  ) {
    const dailyHours = 9;
    let remainingHours = totalSpentTime / 3600; // Convert seconds to hours
    let totalAmount = 0;

    while (remainingHours > 0) {
      const hoursForDay = Math.min(remainingHours, dailyHours);
      const extraHours = Math.max(0, remainingHours - dailyHours);

      totalAmount += dailyPayRate + extraHours * extraHourlyRate;
      remainingHours -= hoursForDay + extraHours;
    }

    return totalAmount;
  }


  private async calculateOverallSpentTime(tasks: any[]) {
    const result = await this.prisma.taskTimeRecord.aggregate({
      where: { task_id: { in: tasks.map((task) => task.id) } },
      _sum: { spent_time: true },
    });
    return result._sum.spent_time || 0;
  }

  private calculateDayWiseSpentAmount(
    dailyWorkedHours: number[],
    dailyPayRate: number,
    extraHourlyRate: number,
  ) {
    const dailyHours = 9;
    let totalAmount = 0;

    for (const workedHours of dailyWorkedHours) {
      if (workedHours <= dailyHours) {
        totalAmount += dailyPayRate;
      } else {
        totalAmount += dailyPayRate + (workedHours - dailyHours) * extraHourlyRate;
      }
    }

    return totalAmount;
  }

  public async getSalaryReportByWorker(
    from_date?: string,
    to_date?: string,
  ) {
    const workers = await this.prisma.worker.findMany({
      select: {
        id: true,
        name: true,
        daily_pay_rate: true,
        extra_hourly_rate: true,
      },
    });

    const reportData = await Promise.all(
      workers.map(async (worker) => {
        const completedOrders = await this.prisma.order.findMany({
          where: {
            Workers: {
              some: { worker_id: worker.id },
            },
            status: 'COMPLETED',
            AND: [
              {
                completed_date: {
                  gte: from_date ? new Date(from_date) : undefined,
                  lte: to_date ? new Date(to_date) : undefined,
                },
              },
            ],
          },
          include: {
            Tasks: {
              where: { isCompleted: true },
              include: { TaskTimeRecords: true },
            },
          },
        });

        // Calculate the number of completed work orders for each worker
        const completedWOs = completedOrders.length;
        const completedTasks = completedOrders.reduce((acc, order) => acc + order.Tasks.length, 0);
        const woTotalPrice = completedOrders.reduce((acc, order) => acc + order.Tasks.reduce((taskAcc, task) => taskAcc + task.total, 0), 0);
        const workedHours = completedOrders.reduce((acc, order) => acc + order.Tasks.reduce((taskAcc, task) => taskAcc + task.TaskTimeRecords.reduce((timeAcc, record) => timeAcc + record.spent_time, 0), 0), 0) / 3600;
        const extraHours = Math.max(0, workedHours - (9 * completedOrders.length));

        const totalSalary = completedOrders.reduce((acc, order) => {
          const dailyWorkedHours = order.Tasks.reduce((taskAcc, task) => taskAcc + task.TaskTimeRecords.reduce((timeAcc, record) => timeAcc + record.spent_time, 0), 0) / 3600;
          return acc + this.calculateDayWiseSpentAmount([dailyWorkedHours], worker.daily_pay_rate, worker.extra_hourly_rate);
        }, 0);

        return {
          workerName: worker.name,
          completedWOs, // Number of completed work orders
          completedTasks,
          woTotalPrice,
          workedHours,
          extraHours,
          salaryTotal: totalSalary,
        };
      }),
    );

    return reportData;
  }

  private async calculateReportTotals(
    formattedOrders: any[],
    workerId?: number,
  ) {
    const taskPriceTotal = formattedOrders.reduce((acc, order) => {
      return (
        acc +
        order.task.list.reduce(
          (taskAcc: any, task: { total: any }) => taskAcc + (task.total || 0),
          0,
        )
      );
    }, 0);
  
    const dailyWorkedHoursMap: { [key: string]: { [workerId: number]: number } } = {};
  
    // Aggregate worked hours by date and worker
    formattedOrders.forEach((order) => {
      const date = new Date(order.completed_date).toISOString().split('T')[0]; // Format date to YYYY-MM-DD
      order.task.list.forEach((task: any) => {
        if (task.completion.worker && task.completion.worker.id) {
          const workerId = task.completion.worker.id;
          if (!dailyWorkedHoursMap[date]) {
            dailyWorkedHoursMap[date] = {};
          }
          dailyWorkedHoursMap[date][workerId] = (dailyWorkedHoursMap[date][workerId] || 0) + task.completion.spent_time / 3600; // Convert to hours
        }
      });
    });
  
    const totalWorkerSalary = await Promise.all(Object.entries(dailyWorkedHoursMap).map(async ([date, workersHours]) => {
      return Promise.all(Object.entries(workersHours).map(async ([workerId, workedHours]) => {
        const worker = await this.prisma.worker.findUnique({ where: { id: +workerId } });
        if (worker) {
          return this.calculateDayWiseSpentAmount([workedHours], worker.daily_pay_rate, worker.extra_hourly_rate);
        }
        return 0;
      }));
    }));
  
    const totalOverallSpentAmount = totalWorkerSalary.flat().reduce((acc, amount) => acc + amount, 0);
  
    const workerExpense = await this.prisma.expense.aggregate({
      where: {
        workerId: workerId ? workerId : undefined,
        addedBy: 'ADMIN',
      },
      _sum: {
        amount: true,
      },
    });
  
    const totalWorkerExpense = workerExpense._sum.amount || 0;
    const totalProfit = taskPriceTotal - totalWorkerExpense - totalOverallSpentAmount;
  
    const formattedSpentTime = Object.values(dailyWorkedHoursMap)
      .flatMap(Object.values)
      .reduce((acc, hours) => acc + hours, 0)
      .toFixed(2);
  
    return {
      total_spent_time: parseFloat(formattedSpentTime) || 0,
      total_spent_amount: totalOverallSpentAmount || 0,
      total_task_price: taskPriceTotal || 0,
      total_profit: totalProfit || 0,
      total_worked_hours: parseFloat(formattedSpentTime) || 0,
      total_salaries: totalOverallSpentAmount || 0,
      total_expenses: totalWorkerExpense || 0,
      worker: workerId
        ? {
            name: (await this.prisma.worker.findUnique({ where: { id: workerId } }))?.name,
            daily_pay_rate: (await this.prisma.worker.findUnique({ where: { id: workerId } }))?.daily_pay_rate,
            extra_hourly_rate: (await this.prisma.worker.findUnique({ where: { id: workerId } }))?.extra_hourly_rate,
            worked_hours: parseFloat(formattedSpentTime) || 0,
            total_salary: totalOverallSpentAmount || 0,
            expenses: totalWorkerExpense || 0,
          }
        : null,
    };
  }  
  public async getCompletedWorkOrdersPerWorkerPerDay(
    workerId?: number,
    from_date?: string,
    to_date?: string,
  ) {
    const orders = await this.fetchOrders(workerId, from_date, to_date);
    
    const workOrdersPerDay: { [date: string]: { [workerId: number]: number } } = {};
  
    orders.forEach((order) => {
      const date = new Date(order.completed_date).toISOString().split('T')[0]; // Format date to YYYY-MM-DD
      
      order.Workers.forEach((worker) => {
        if (!workOrdersPerDay[date]) {
          workOrdersPerDay[date] = {};
        }
        workOrdersPerDay[date][worker.worker_id] = (workOrdersPerDay[date][worker.worker_id] || 0) + 1;
      });
    }); 
  console.log(workOrdersPerDay);
    return workOrdersPerDay;
  }
}