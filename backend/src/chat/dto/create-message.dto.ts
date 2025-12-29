import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsMongoId, IsArray } from 'class-validator';
import { MessageType } from '../schemas/message.schema';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Hello team!' })
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageType, required: false, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiProperty({ description: 'Message ID to reply to', required: false })
  @IsOptional()
  @IsMongoId()
  replyTo?: string;

  @ApiProperty({ description: 'User IDs mentioned in message', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  mentions?: string[];
}

export class UpdateMessageDto {
  @ApiProperty({ description: 'Updated message content' })
  @IsString()
  content: string;
}
