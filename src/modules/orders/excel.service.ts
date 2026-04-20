import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilerOrdersQueryDto } from './dto';
import { Prisma, OrderStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class OrdersExcelService {
  constructor(private readonly prisma: PrismaService) {}

  async generateExcel(query: FilerOrdersQueryDto, tenantId: number): Promise<Buffer> {
    const whereConditions: Prisma.OrderWhereInput = {
      tenantId,
      report_id:       query.report_id        ? { equals: query.report_id }                                  : undefined,
      wo_number:       query.wo_numbers        ? { in: query.wo_numbers }                                     : undefined,
      loan_number:     query.loan_number       ? { contains: query.loan_number, mode: 'insensitive' }         : undefined,
      status:          query.statuses          ? { in: query.statuses as OrderStatus[] }
                     : query.status            ? { equals: query.status as OrderStatus }                      : undefined,
      address:         query.address           ? { contains: query.address,  mode: 'insensitive' }            : undefined,
      city:            query.city              ? { contains: query.city,     mode: 'insensitive' }            : undefined,
      state:           query.state             ? { contains: query.state,    mode: 'insensitive' }            : undefined,
      zip:             query.zip_code          ? { contains: query.zip_code, mode: 'insensitive' }            : undefined,
      work_type_alias: query.work_type_alias
        ? Array.isArray(query.work_type_alias)
          ? { in: query.work_type_alias }
          : { in: query.work_type_alias.split(',').map(a => a.trim()) }
        : undefined,
      Workers: query.workerIds
        ? { some: { worker_id: { in: query.workerIds } } }
        : query.workerId
        ? { some: { worker_id: { equals: query.workerId } } }
        : undefined,
      OR: query.keyword
        ? [
            { wo_number:   { contains: query.keyword, mode: 'insensitive' } },
            { loan_number: { contains: query.keyword, mode: 'insensitive' } },
            { address:     { contains: query.keyword, mode: 'insensitive' } },
            { city:        { contains: query.keyword, mode: 'insensitive' } },
            { state:       { contains: query.keyword, mode: 'insensitive' } },
            { zip:         { contains: query.keyword, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const orders = await this.prisma.order.findMany({
      where: whereConditions,
      include: {
        Workers: { include: { worker: true } },
        CrewAssignments: { include: { crew: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Work Orders');

    worksheet.columns = [
      { header: 'Date Received',       key: 'date_received',       width: 16 },
      { header: 'WO #',                key: 'wo_number',           width: 12 },
      { header: 'Client',              key: 'client',              width: 20 },
      { header: 'Property Address',    key: 'address',             width: 28 },
      { header: 'City / State',        key: 'city_state',          width: 18 },
      { header: 'WO Type',             key: 'wo_type',             width: 16 },
      { header: 'Crew / Team',         key: 'crew_team',           width: 18 },
      { header: 'Office Owner',        key: 'office_owner',        width: 16 },
      { header: 'Due Date',            key: 'date_due',            width: 14 },
      { header: 'Field Complete Date', key: 'completed_date',      width: 20 },
      { header: 'Submission Date',     key: 'submission_date',     width: 18 },
      { header: 'Invoice Date',        key: 'invoice_date',        width: 14 },
      { header: 'Paid Date',           key: 'paid_date',           width: 14 },
      { header: 'Status',              key: 'status',              width: 14 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });

    const STATUS_COLORS: Record<string, string> = {
      COMPLETED:   'FFC6EFCE',
      NEW:         'FFBDD7EE',
      REJECTED:    'FFFFC7CE',
      UNCOMPLETED: 'FFFFFFEB9C',
    };

    const ROW_BG = ['FFFFFFFF', 'FFF2F5FA'];

    orders.forEach((order, idx) => {
      const crew = order.CrewAssignments.map(a => a.crew.name).join(', ')
        || order.Workers.map(a => a.worker.name).join(', ')
        || '';

      const row = worksheet.addRow({
        date_received:   order.date_received   ?? '',
        wo_number:       order.wo_number       ?? '',
        client:          order.client_company_alias ?? order.cust_text ?? '',
        address:         order.address         ?? '',
        city_state:      [order.city, order.state].filter(Boolean).join(', '),
        wo_type:         order.work_type_alias ?? '',
        crew_team:       crew,
        office_owner:    order.import_user_id  ?? '',
        date_due:        order.date_due        ?? '',
        completed_date:  order.completed_date
                           ? order.completed_date.toISOString().split('T')[0]
                           : '',
        submission_date: '',   
        invoice_date:    '',   
        paid_date:       '',   
        status:          order.status,
      });

      row.height = 20;
      const rowBg = ROW_BG[idx % 2];

      row.eachCell((cell, colNumber) => {
        cell.font      = { name: 'Arial', size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = {
          top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };

        if (colNumber === 14) {
          const color = STATUS_COLORS[order.status] ?? rowBg;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
          cell.font = { name: 'Arial', size: 9, bold: true };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      });
    });

    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    worksheet.autoFilter = { from: 'A1', to: 'N1' };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}