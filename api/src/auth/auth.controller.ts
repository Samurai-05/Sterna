import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDto } from './dto/user.dto';

/**
 * Accounts and sessions (FR-01, FR-02, FR-03).
 *
 * Sessions are a stateless JWT access token: there is no refresh token and no
 * server-side session, so **logging out is discarding the token** — there is
 * deliberately no logout endpoint to call (ADR-009).
 *
 * Every other route in the API is protected by default (NFR-18); `register`
 * and `login` are the two exceptions, marked @Public().
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Returns an access token alongside the new account, so the client is ' +
      'signed in without a second round-trip to /auth/login. The email is ' +
      'stored lower-cased and compared case-insensitively.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    description:
      'A field is missing or malformed, or the body carries a property the ' +
      'endpoint does not declare.',
  })
  @ApiConflictResponse({ description: 'That email address is already taken.' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  // Nest answers 201 to a POST by default; a login creates nothing.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in',
    description:
      'An unknown address and a wrong password are answered identically, ' +
      'with the same status, the same message and the same response time — a ' +
      'client cannot use this endpoint to discover whether an account exists ' +
      '(NFR-18).',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'The body is not a valid login.' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Read the signed-in account',
    description:
      'The source of truth for the profile (FR-03). The token carries a copy ' +
      'of the id and the email and nothing else, and that copy goes stale — ' +
      'read the display name from here, never from the token.',
  })
  @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() caller: AuthenticatedUser): Promise<UserDto> {
    return this.auth.findById(caller.id);
  }

  @Patch('me')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Update the signed-in profile',
    description:
      'Only the display name is mutable (FR-03). The email address is the ' +
      'login credential and cannot be changed here. A body with no updatable ' +
      'field is refused rather than silently doing nothing.',
  })
  @ApiOkResponse({ type: UserDto })
  @ApiBadRequestResponse({
    description: 'Nothing to update, or a field failed validation.',
  })
  updateProfile(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.auth.updateProfile(caller.id, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Change the password',
    description:
      'The current password is required as well as the token: a stolen token ' +
      'alone must not be enough to lock the owner out. A wrong current ' +
      'password is answered 400, not 401, so that 401 keeps meaning exactly ' +
      'one thing to a client — the token is bad, send the user to the login ' +
      'screen. Note that access tokens issued before the change stay valid ' +
      'until they expire; the design is stateless and has no revocation ' +
      'list (ADR-009).',
  })
  @ApiNoContentResponse({ description: 'The password was changed.' })
  @ApiBadRequestResponse({
    description:
      'The current password is wrong, the new one repeats it, or it is ' +
      'shorter than the minimum.',
  })
  changePassword(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.auth.changePassword(caller.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Delete the signed-in account',
    description:
      'Irreversible, and it takes the account’s discoveries and group ' +
      'memberships with it — which is why the current password is required ' +
      'in the body as well as the token. Discard the token afterwards.',
  })
  @ApiNoContentResponse({ description: 'The account was deleted.' })
  @ApiBadRequestResponse({ description: 'The current password is incorrect.' })
  deleteAccount(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    return this.auth.deleteAccount(caller.id, dto.currentPassword);
  }
}
