# @prisma-admin/nestjs

NestJS integration for Prisma Admin.

## Installation

```bash
npm install @prisma-admin/nestjs @prisma-admin/core
npm install @prisma/client luxon uuid
```

## Quick Start

### 1. Setup Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AdminController, AdminService, PrismaService } from '@prisma-admin/nestjs';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AppModule {}
```

### 2. Define Admin Models

```typescript
// admin/models/user.admin.ts
import { BaseAdminModel } from '@prisma-admin/core';

export class UserAdmin extends BaseAdminModel {
    override prismaModel = 'User';
    protected override listDisplayFields: string[] = ['id', 'email', 'firstName', 'lastName', 'isActive', 'avatar', 'createdAt', 'updatedAt'];
    static override prismaModelName = 'User';
    protected override listFilterFields: string[] = ['isActive'];
    protected override inlines: InlineDefinition[] = inlines;
    protected override searchFields: string[] = ['&id', 'firstName', 'lastName', 'email'];
    protected override widgets: Record<string, string> = {
        avatar: 'image',
    };
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected users?' },
        { key: 'activateUsers', label: 'Set isActive to true', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to change the status to active?'}
    ];

    async validate_email(value: string, id?: string) {
        value = value?.trim().toLowerCase();
        if (!validateEmail(value)) {
            throw new ValidationError('Invalid email format');
        }
        return value;
    }
    public override async getLabelFromObject(object: Record<string, any>): Promise<string> {
        return ['firstName', 'lastName'].map(field => object?.[field]).filter(Boolean).join(' ') || object?.['email'];
        // return (object?.['name'] || object?.['title'] || object?.['label'] || this.getObjectPk(object) || '<unnamed>').toString();
    }
    async activateUsers(request: any, user: any, ids: ActionIdsType) { // ids can be the list of primary keys or 'all'
        const model = this.getPrismaModel();
        const whereClause = this.getActionWhereClause(ids);
        await this.prismaClient[model].update({ where: whereClause, data: {isActive: true} })
    }

}
```

### 3. Register Admin Models

```typescript
// admin/adminlist.ts
import { UserAdmin } from "./models/user";
import { AdminDefinitionMap } from "@prisma-admin/core";

const adminDefinitions: AdminDefinitionMap = {
  user: {cls: UserAdmin, name: UserAdmin.getPrismaModelPlural()},
};
export default adminDefinitions;
```

### 4. Create Admin Service

```typescript
// admin/admin.service.ts
import adminDefinitions from './adminlist';
import { AdminDefinitionMap } from "@prisma-admin/core";
import { BaseAdminService } from "@prisma-admin/nestjs";
import { PrismaService } from '../prisma/prisma.service';


class AdminService extends BaseAdminService {

    getAdminDefinitions(): AdminDefinitionMap {
        return adminDefinitions as AdminDefinitionMap;
    }
}

export { AdminService };
```

#### More advanced example:

```typescript
// admin/admin.service.ts
import adminDefinitions from './adminlist';
import { AdminDefinitionMap } from "@prisma-admin/core";
import { BaseAdminService } from "@prisma-admin/nestjs";
import { PrismaService } from '../prisma/prisma.service';
import { LocalFileStorage } from '@prisma-admin/node-utils';
import { ForbiddenException } from '@prisma-admin/core/';


class AdminService extends BaseAdminService {
    private fileStorage: LocalFileStorage;

    constructor(prisma: PrismaService) {
        super(prisma);
        // Initialize file upload helper
        this.fileStorage = new LocalFileStorage(process.env.UPLOAD_DIR || 'uploads', process.env.BASE_URL || 'http://localhost:3001');
        
        // Ensure upload directory exists on service initialization
        this.fileStorage.initialize().catch(err => {
            console.error('Failed to initialize file storage:', err);
        });
    }

    getAdminDefinitions(): AdminDefinitionMap {
        return adminDefinitions as AdminDefinitionMap;
    }

    /**
     * Process uploaded file and save it to disk
     * @param model Model name (e.g., 'users', 'posts')
     * @param file File from multipart form upload
     * @param id Optional item ID for updates
     * @returns File key (relative path like "users/bardzo-piekny-obrazek-1234567890.jpg")
     */
    async processFile(model: string, file: File, id?: string | number | null): Promise<string | null> {
        if (!file) {
            return null;
        }

        try {
            const fileKey = await this.fileStorage.processFile(file, model);
            return fileKey;
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        }
    }

    /**
     * Get public URL for uploaded file
     * @param fileKey File key returned by processFile (e.g., "users/bardzo-piekny-obrazek-1234567890.jpg")
     * @param model Model name
     * @param idItem Optional item ID
     * @returns Full URL to access the file (e.g., "http://localhost:3001/uploads/users/bardzo-piekny-obrazek-1234567890.jpg")
     */
    async processThumbnail(model: string, filePath: string, id?: string | number | null): Promise<string | null> {
        if (!filePath) {
            return null;
        }

        try {
            const fileKey = await this.fileStorage.createThumbnail(filePath, null, 150, 150);
            return fileKey;
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        }
    }
    async getFileUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        return await this.fileStorage.getFileUrl(fileKey);
    }
    async getThumbnailUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        // Implement your logic to generate a thumbnail URL based on the file key, model, and item ID
        // For example, if using cloud storage, generate a signed URL for the thumbnail
        return await this.fileStorage.getThumbnailUrl(fileKey, 150, 150);
    }

    /**
     * Delete file from disk (optional - can be called when deleting records)
     * @param fileKey File key to delete
     */
    async deleteFile(fileKey: string): Promise<void> {
        await this.fileStorage.deleteFile(fileKey);
    }
    checkPermissions(req: Request, user: any, action: string) {
        // Implement permission checks based on your application's requirements
        if (!user || !user.isStaff) { // or !user.isAdmin or whatever you need
            throw new ForbiddenException('You do not have permission to perform this action.');
        }
        return true;
    }
    checkModelPermissions(req: Request, user: any, model: string, action: string) {
        // Implement permission checks based on your application's requirements
        const exists = await this.prisma.UserPermissin.findFirst({ where: { userId: user?.id, model, action} });
        if (!exists) {
            throw new ForbiddenException('You do not have permission to perform this action.');
        }
        return true;
    }
    checkModelItemPermissions(req: Request, user: any, model: string, pk: string, action: string) {
        // Implement permission checks based on your application's requirements
        // if (!user || !user.isAdmin) {
        //     throw new ForbiddenException('You do not have permission to perform this action on this model.');
        // }
        return true;
    }
    
}

export { AdminService };
```

## API

### AdminController

Provides REST endpoints:
- `GET /admin/models` - List all available models
- `GET /admin/:model` - List model items
- `GET /admin/:model/:id` - Get specific item
- `POST /admin/:model` - Create new item  
- `PUT /admin/:model/:id` - Update item
- `DELETE /admin/:model/:id` - Delete item

### AdminService


## Configuration

You can customize the admin behavior by extending the base classes and overriding methods as needed.
