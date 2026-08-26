import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponse, UsersService } from '../users/users.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';

const currentUserExample = {
  id: '1',
  email: 'alice@example.com',
  userName: 'Alice',
  createdAt: '2026-08-25T12:01:00.000Z',
  updatedAt: '2026-08-25T12:01:00.000Z',
};

@ApiTags('users')
@Controller('users')
export class UsersMeController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current user',
    description:
      'Returns the public profile for the authenticated user and rejects tokens whose user no longer exists.',
  })
  @ApiOkResponse({
    description: 'Current user profile.',
    schema: { example: currentUserExample },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, or no longer maps to a user.',
  })
  async me(@Req() request: AuthenticatedRequest): Promise<UserResponse> {
    const user = await this.users.findById(request.user.id);

    if (!user) {
      throw new UnauthorizedException('Authenticated user no longer exists.');
    }

    return this.users.toResponse(user);
  }
}
