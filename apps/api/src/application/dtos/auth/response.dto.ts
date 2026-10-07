import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;
}

/** RFC 7807 problem document returned for every error. */
export class ErrorResponseDto {
  @ApiProperty({ description: 'Stable error code', example: 'AUTH_FAILED' })
  type: string;

  @ApiProperty({ example: 'Authentication failed' })
  title: string;

  @ApiProperty({ description: 'HTTP status code', example: 401 })
  status: number;

  @ApiProperty({ nullable: true, example: null })
  detail: string | null;

  @ApiProperty({ example: '/api/auth/session' })
  instance: string;
}
