import { Global, Module } from '@nestjs/common';
import { MarkupService } from './markup.service';

@Global()
@Module({
  providers: [MarkupService],
  exports: [MarkupService],
})
export class MarkupModule {}
