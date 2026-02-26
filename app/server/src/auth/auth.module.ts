import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthSessionStoreService } from './auth-session-store.service';
import { AuthTokenService } from './auth-token.service';
import { User } from './entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRateLimitService,
    AuthSessionStoreService,
    AuthTokenService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
