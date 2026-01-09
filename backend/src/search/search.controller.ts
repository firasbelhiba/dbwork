import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { GlobalSearchDto, SearchEntityType } from './dto/global-search.dto';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across all entities' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Results per entity type', required: false })
  @ApiQuery({ name: 'types', description: 'Entity types to search', required: false, isArray: true, enum: SearchEntityType })
  async globalSearch(
    @Query() dto: GlobalSearchDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user._id || req.user.sub;
    const isAdmin = req.user.role === UserRole.ADMIN;

    return this.searchService.globalSearch(dto, currentUserId, isAdmin);
  }
}
