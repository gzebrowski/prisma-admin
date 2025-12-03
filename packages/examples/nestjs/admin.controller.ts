import { BaseAdminController } from './nestjsapp/admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from './nestjsapp/prisma.service';


export class AdminController extends BaseAdminController {
    getAdminServiceInstance(prisma: PrismaService) {
        return new AdminService(prisma);
    }
}