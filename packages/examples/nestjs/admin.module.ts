import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from './nestjsapp/prisma.service';
import { AdminController } from './admin.controller';
// import { PrismaModule } from '../prisma/prisma.module';

@Module({
  // imports: [PrismaModule],
  imports: [],
  providers: [AdminService, PrismaService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
