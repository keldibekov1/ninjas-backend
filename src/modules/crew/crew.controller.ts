import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Post,
    Query,
    Put,
    UseGuards,
    Param,
    Req,
  } from '@nestjs/common';
  import { CrewService } from './crew.service';
  import { AuthGuard } from '../../guards/auth.guard';
import { CreateCrewDto, FilterCrewsQueryDto, UpdateCrewDto } from './dto';
  
  
  @Controller('crews')
  @UseGuards(AuthGuard)
  export class CrewController {
    constructor(
      private readonly crewService: CrewService,
    ) {}
  
    @Put(':id/members/:workerId/role')
  async updateMemberRole(
    @Param('id') id: number,
    @Param('workerId') workerId: number,
    @Body('isLeader') isLeader: boolean,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    const updatedMember = await this.crewService.updateMemberRole(
      id,
      workerId,
      isLeader,
      tenantId,
    );
    return {
      message: 'Member role updated successfully!',
      info: updatedMember,
    };
  }

  @Delete(':id/members/:workerId')
  async removeMember(
    @Param('id') id: number,
    @Param('workerId') workerId: number,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    const removedMember = await this.crewService.removeMember(
      id,
      workerId,
      tenantId,
    );
    return {
      message: 'Member removed successfully!',
      info: removedMember,
    };
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: number,
    @Body('workerId') workerId: number,
    @Body('isLeader') isLeader: boolean,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    const newMember = await this.crewService.addMember(
      id,
      workerId,
      isLeader,
      tenantId,
    );
    return {
      message: 'Member added successfully!',
      info: newMember,
    };
  }


    @Post()
    async createCrew(
      @Body() data: CreateCrewDto,
      @Req() req: Request
    ) {
      const isGlobalAdmin = req['globalAdmin'] !== undefined;
      const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
      
      const crew = await this.crewService.create(data, tenantId);
  
      return {
        message: 'Crew created successfully!',
        info: crew,
      };
    }
  
    @Get()
    async getCrews(
      @Query() query: FilterCrewsQueryDto,
      @Req() req: Request
    ) {
      const isGlobalAdmin = req['globalAdmin'] !== undefined;
      const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
  
      const crews = await this.crewService.getCrews(query, tenantId);
  
      return {
        message: 'Crews retrieved successfully!',
        ...crews,
      };
    }
  
    @Get(':id')
    async getCrew(
      @Param('id') id: number,
      @Req() req: Request
    ) {
      const isGlobalAdmin = req['globalAdmin'] !== undefined;
      const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
  
      const crew = await this.crewService.getCrewById(id, tenantId);
  
      return {
        message: 'Crew retrieved successfully!',
        info: crew,
      };
    }
  
    @Put(':id')
    async updateCrew(
      @Param('id') id: number,
      @Body() data: UpdateCrewDto,
      @Req() req: Request
    ) {
      const isGlobalAdmin = req['globalAdmin'] !== undefined;
      const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
  
      const updatedCrew = await this.crewService.update(id, data, tenantId);
  
      return {
        message: 'Crew updated successfully!',
        info: updatedCrew,
      };
    }
  
    @Delete(':id')
    async deleteCrew(
      @Param('id') id: number,
      @Req() req: Request
    ) {
      const isGlobalAdmin = req['globalAdmin'] !== undefined;
      const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
  
      const deletedCrew = await this.crewService.delete(id, tenantId);
  
      return {
        message: 'Crew deleted successfully!',
        info: deletedCrew,
      };
    }
  }