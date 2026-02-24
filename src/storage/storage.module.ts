import { Global, Module } from '@nestjs/common';
import { StorageProviderFactory } from './storage.factory';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [StorageProviderFactory, StorageService],
  exports: [StorageService, StorageProviderFactory],
})
export class StorageModule {}
