import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AdminUserController } from './admin-user/admin-user.controller';
import { AdminUserService } from './admin-user/admin-user.service';
import { AdminTierController } from './admin-user/tier/admin-tier.controller';
import { TierService } from './admin-user/tier/tier.service';
import { BankingModule } from 'src/banking/banking.module';

@Module({
    imports: [BankingModule],
    controllers: [UserController, AdminUserController, AdminTierController],
    providers: [UserService, AdminUserService, TierService]
})

export class UserModule {}
 