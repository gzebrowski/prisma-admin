import adminDefinitions from './adminlist';
import { AdminDefinitionMap } from "@simpleblog/shared/admin";

import { BaseAdminService } from "./nestjsapp/admin.service"

class AdminService extends BaseAdminService {
    getAdminDefinitions(): AdminDefinitionMap {
        return adminDefinitions;
    }
}

export { AdminService };