import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkerService } from './worker.service';
import { CreateWorkerDto, LoginWorkerDto, UpdateWorkerDto } from './dto';
import { AuthGuard } from '../../guards';
import { tokenGenerator } from 'src/utils/token-generator';
import * as bcrypt from 'bcrypt';

@Controller('worker')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Post('create')
@UseGuards(AuthGuard)
async CreateWorker(@Body() data: CreateWorkerDto, @Req() req: Request) {
  try {
    // Extract tenantId from the authenticated user
    const tenantId = req['user']?.tenantId;

    // Validate tenantId is present
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Log incoming data for debugging
    console.log('Creating worker with data:', { ...data, tenantId });

    const findByUsername = await this.workerService.findByUsername(tenantId, data.username);

    if (findByUsername) {
      throw new BadRequestException('Worker with username already exists!');
    }

    // create worker
    const createWorker = await this.workerService.create({ 
      ...data, 
      tenantId,
      // Ensure float conversion
      daily_pay_rate: Number(data.daily_pay_rate),
      extra_hourly_rate: Number(data.extra_hourly_rate)
    });

    return {
      message: 'Worker is created successfully!',
      info: createWorker,
    };
  } catch (error) {
    console.error('Worker Creation Error:', error);
    
    // More detailed error handling
    if (error instanceof BadRequestException) {
      throw error;
    }

    // Log the full error for server-side debugging
    console.error('Full Error:', error);

    throw new InternalServerErrorException(
      `Failed to create worker: ${error.message || 'Unknown error'}`
    );
  }
}

  @Get()
  @UseGuards(AuthGuard)
  async GetWorkers(
    @Req() req: Request,
    @Query('keyword') keyword?: string,
  ) {
    try {
      // Check if the user is a global admin
      const isGlobalAdmin = req['globalAdmin'] !== undefined;

      // Extract tenantId from the authenticated user
      const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
  
      const workers = await this.workerService.getWorkers({ 
        tenantId, 
        keyword 
      });

      return {
        message: 'Workers list retrieved successfully!',
        workers,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to retrieve workers'
      );
    }
  }

  @Get(':workerId')
  @UseGuards(AuthGuard)
  async GetWorker(
    @Param('workerId') workerId: string,
    @Req() req: Request
  ) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;

    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;

    const worker = await this.workerService.findById(tenantId, +workerId);

    if (!worker) {
      throw new BadRequestException(`Worker with ID ${workerId} not found!`);
    }

    // hide (delete) password
    delete worker.password;

    return {
      message: 'Worker retrieved successfully!',
      worker,
    };
  }

  @Put(':workerId')
  @UseGuards(AuthGuard)
  async UpdateWorker(
    @Param('workerId') workerId: string,
    @Body() data: UpdateWorkerDto,
    @Req() req: Request
  ) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;

    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;

    const findByWorkerId = await this.workerService.findById(tenantId, +workerId);
    if (!findByWorkerId) {
      throw new BadRequestException(`Worker with id ${workerId} not found!`);
    }

    // update worker data
    const updateWorker = await this.workerService.update(tenantId, +workerId, data);

    // hide (delete) password
    delete updateWorker.password;

    return {
      message: `Worker info is updated successfully!`,
      info: updateWorker,
    };
  }

  @Delete(':workerId')
  @UseGuards(AuthGuard)
  async DeleteWorker(
    @Param('workerId') workerId: string,
    @Req() req: Request
  ) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;

    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;

    const findByWorkerId = await this.workerService.findById(tenantId, +workerId);
    if (!findByWorkerId) {
      throw new BadRequestException(`Worker with id ${workerId} not found!`);
    }

    // delete worker
    await this.workerService.delete(tenantId, +workerId);

    return {
      message: `Worker with id ${workerId} deleted successfully!`,
      ID: +workerId,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async LoginWorker(@Body() data: LoginWorkerDto) {
    const findByUsername = await this.workerService.findByUsernamelogin(data.username);
    
    if (!findByUsername) {
      throw new BadRequestException('Wrong username or password!');
    }

    const isPasswordValid = await bcrypt.compare(data.password, findByUsername.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Wrong username or password!');
    }

    // make a payload for generating tokens
    const payload = {
      info: findByUsername,
    };
    // generate access and refresh tokens
    const { accessToken, refreshToken } = await tokenGenerator(payload);

    // hide (delete) password
    delete findByUsername.password;

    return {
      message: `Welcome back ${findByUsername.name}`,
      info: findByUsername,
      accessToken,
      refreshToken
    };
  }
}