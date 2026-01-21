import {
  Controller,
  Put,
  Post,
  Delete,
  Body,
  Query,
  Get,
  Req,
  BadRequestException,
  UseGuards,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import {
  DeleteShiftsDto,
  ClockOutDto,
  FinishJobDto,
  ClockInDto,
  AddShiftsDto,
  UpdateShiftsDto,
} from './shifts.dto';
import { AuthGuard } from 'src/guards';

@Controller('shifts')
@UseGuards(AuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('clock-in')
  async clockIn(@Body() clockInDto: ClockInDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.shiftsService.clockIn({ ...clockInDto, tenantId });
  }

  @Put('finish-job')
  async finishJob(@Body() finishJobDto: FinishJobDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.shiftsService.finishJob(finishJobDto, tenantId);
  }

  @Put('clock-out')
  async clockOut(@Body() clockOutDto: ClockOutDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.shiftsService.clockOut(clockOutDto, tenantId);
  }

  @Put('updateshifts')
  async shiftsUpdate(@Body() updateShiftsDto: UpdateShiftsDto) {
    return this.shiftsService.shiftsUpdate(updateShiftsDto);
  }

  @Post('addshifts')
  async addShift(@Body() addShiftsDto: AddShiftsDto, @Req() req: Request) {
    const tenantId = addShiftsDto.tenantId || req['user']?.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.shiftsService.addShift(addShiftsDto);
  }

  @Delete('deleteshifts')
  async deleteShift(@Body() deleteShiftsDto: DeleteShiftsDto) {
    return this.shiftsService.deleteShift(deleteShiftsDto);
  }

  @Get('current-shift')
  async getCurrentShift(
    @Req() req: Request,
    @Query('workerId', new ParseIntPipe()) workerId: number,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.shiftsService.getCurrentShift(workerId, tenantId);
  }

  @Get('getshifts')
  async getShifts(
    @Req() req: Request,
    @Query('workerId') workerId?: number,
    @Query('from') from?: number,
    @Query('to') to?: number,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException(
        'User must be authenticated with a valid tenant',
      );
    }
    return this.shiftsService.getShifts(workerId, from, to, tenantId);
  }

  @UseGuards(AuthGuard)
  @Get('getshiftsmy')
  async getShiftsmy(@Req() req: Request) {
    const user = req['user'];

    if (!user || user.type !== 'worker') {
      throw new BadRequestException('Only workers can access this endpoint');
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const shifts = await this.shiftsService.getShiftsMy(user.id, tenantId);

    return {
      message: 'My shifts retrieved successfully!',
      shifts,
    };
  }
}
