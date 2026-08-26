import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { UserResponse, UsersService } from './users.service';

const userExample = {
  id: '1',
  email: 'alice@example.com',
  userName: 'Alice',
  createdAt: '2026-08-25T12:01:00.000Z',
  updatedAt: '2026-08-25T12:01:00.000Z',
};

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Creates a user account and stores a password hash in PostgreSQL.',
  })
  @ApiCreatedResponse({
    description: 'User created.',
    schema: { example: userExample },
  })
  @ApiConflictResponse({
    description: 'A user with this email already exists.',
  })
  create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return this.users.create(dto);
  }
}
