import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminUseCase } from 'src/application/usecases/admin';
import {
  CreateAdminDto,
  SetAdminActiveDto,
  UpdateAdminDto,
} from 'src/application/dtos/admin/request.dto';
import { AdminResponseDto } from 'src/application/dtos/session/response.dto';
import { ErrorResponseDto } from 'src/application/dtos/auth/response.dto';
import { Admin } from 'src/domain/entities/admin';
import { AdminMapper } from '../mappers/admin.mapper';
import { AuthGuard, CurrentUser } from '../guards/auth.guard';

@ApiTags('Admins')
@Controller('admins')
export class AdminController {
  constructor(private readonly adminUseCase: AdminUseCase) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List admin team members' })
  @ApiResponse({ status: 200, type: [AdminResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async list() {
    const admins = await this.adminUseCase.list();
    return admins.map((a) => AdminMapper.toHttpResponse(a));
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Invite a new admin (allow-listed email domain only)',
  })
  @ApiResponse({ status: 201, type: AdminResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async create(@Body() dto: CreateAdminDto) {
    const admin = await this.adminUseCase.create({
      email: dto.email,
      name: dto.name,
    });
    return AdminMapper.toHttpResponse(admin);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an admin (name/photo)' })
  @ApiResponse({ status: 200, type: AdminResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    const admin = await this.adminUseCase.update(id, {
      name: dto.name,
      photo: dto.photo,
    });
    return AdminMapper.toHttpResponse(admin);
  }

  @Patch(':id/active')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Activate or deactivate an admin' })
  @ApiResponse({ status: 200, type: AdminResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async setActive(
    @CurrentUser() current: Admin,
    @Param('id') id: string,
    @Body() dto: SetAdminActiveDto,
  ) {
    const admin = await this.adminUseCase.setActive(id, dto.active, current.id);
    return AdminMapper.toHttpResponse(admin);
  }
}
