import { IsString, IsOptional, IsNumber, Min, Max, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SearchEntityType {
  ISSUE = 'issue',
  PROJECT = 'project',
  USER = 'user',
  AFFECTATION = 'affectation',
}

export class GlobalSearchDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: 'Limit results per entity type', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 5;

  @ApiPropertyOptional({ description: 'Entity types to search', enum: SearchEntityType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SearchEntityType, { each: true })
  types?: SearchEntityType[];
}

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  avatar?: string;
  icon?: string;
  url: string;
  score: number;
  matchedFields: string[];
  metadata?: Record<string, any>;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took: number; // ms
  suggestions?: string[];
}
