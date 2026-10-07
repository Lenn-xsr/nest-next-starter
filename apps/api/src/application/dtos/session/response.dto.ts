import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  })
  agent: string;

  @ApiProperty({ description: 'Location of the session', example: 'BR' })
  location: string;

  @ApiProperty({
    description: 'IP address of the session',
    example: '192.168.1.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-12-16T10:30:00.000Z',
  })
  lastActivity: Date;

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({ description: 'Whether the session is active', example: true })
  isActive: boolean;

  @ApiProperty({
    description: 'True for the session that made the request',
    example: false,
  })
  current: boolean;
}

export class AdminResponseDto {
  @ApiProperty({ description: 'Admin ID', example: '507f1f77bcf86cd799439012' })
  id: string;

  @ApiProperty({ description: 'Admin email', example: 'jane@example.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Admin name', example: 'Jane Doe' })
  name: string | null;

  @ApiPropertyOptional({
    description: 'Admin profile photo URL',
    example: 'https://example.com/photo.png',
  })
  photo: string | null;

  @ApiProperty({ description: 'Whether the admin is active', example: true })
  active: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-12-16T10:30:00.000Z',
  })
  updatedAt: Date;
}
