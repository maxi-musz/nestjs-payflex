import { Module } from '@nestjs/common';
import { AdminMarkupController } from './admin-markup.controller';
import { AdminMarkupService } from './admin-markup.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMarkupController],
  providers: [AdminMarkupService],
  exports: [AdminMarkupService],
})
export class AdminMarkupModule {}
