import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update availability for a date' })
  @ApiResponse({ status: 201, description: 'Availability created successfully' })
  create(@Body() createDto: CreateAvailabilityDto, @CurrentUser() user) {
    return this.availabilityService.create(user._id, createDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get availability for a specific user' })
  @ApiResponse({ status: 200, description: 'User availability' })
  findByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1));
    return this.availabilityService.findByUser(userId, start, end);
  }

  @Get('user/:userId/month')
  @ApiOperation({ summary: 'Get monthly availability for a user' })
  @ApiResponse({ status: 200, description: 'Monthly availability' })
  getMonthlyAvailability(
    @Param('userId') userId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    return this.availabilityService.getMonthlyAvailability(userId, y, m);
  }

  @Get('range')
  @ApiOperation({ summary: 'Get availability for all users in a date range' })
  @ApiResponse({ status: 200, description: 'Availability for all users' })
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.availabilityService.findByDateRange(start, end);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get availability by ID' })
  @ApiResponse({ status: 200, description: 'Availability details' })
  findOne(@Param('id') id: string) {
    return this.availabilityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update availability' })
  @ApiResponse({ status: 200, description: 'Availability updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAvailabilityDto,
    @CurrentUser() user,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.availabilityService.update(id, user._id, updateDto, isAdmin);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete availability' })
  @ApiResponse({ status: 200, description: 'Availability deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.availabilityService.remove(id, user._id, isAdmin);
  }

  @Delete('user/:userId/date/:date')
  @ApiOperation({ summary: 'Delete availability for a specific date' })
  @ApiResponse({ status: 200, description: 'Availability deleted successfully' })
  removeByDate(
    @Param('userId') userId: string,
    @Param('date') date: string,
    @CurrentUser() user,
  ) {
    // Users can only delete their own availability unless admin
    if (userId !== user._id.toString() && user.role !== UserRole.ADMIN) {
      throw new Error('You can only delete your own availability');
    }
    return this.availabilityService.removeByDate(userId, date);
  }
}
