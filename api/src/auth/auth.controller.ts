import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './login.dto';

const loginExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  user: {
    id: '1',
    email: 'alice@example.com',
    userName: 'Alice',
    createdAt: '2026-08-25T12:01:00.000Z',
    updatedAt: '2026-08-25T12:01:00.000Z',
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Log in',
    description:
      'Verifies user credentials and returns the public user profile.',
  })
  @ApiOkResponse({
    description: 'Credentials are valid.',
    schema: { example: loginExample },
  })
  @ApiUnauthorizedResponse({
    description: 'Email or password is invalid.',
  })
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto);
  }
}
