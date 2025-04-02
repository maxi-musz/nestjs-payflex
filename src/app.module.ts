import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { BankingModule } from './banking/banking.module';

@Module({
  imports: [
    ConfigModule.forRoot({}), 
    AuthModule, 
    UserModule, 
    BookmarkModule, 
    PrismaModule, BankingModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AppModule {}
