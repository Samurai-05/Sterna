import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './create-user.dto';
import { PasswordService } from './password.service';
import { User } from './user.entity';

export interface UserResponse {
  id: string;
  email: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly passwords: PasswordService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    try {
      const user = this.users.create({
        email: dto.email,
        passwordHash: this.passwords.hash(dto.password),
        userName: dto.userName,
      });

      return this.toResponse(await this.users.save(user));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('A user with this email already exists.');
      }

      throw error;
    }
  }

  async findByEmailWithPasswordHash(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && error.driverError.code === '23505';
  }
}
