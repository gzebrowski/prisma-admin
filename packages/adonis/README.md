# @prisma-admin/adonis

AdonisJS integration package for Prisma Admin. This package provides controllers and services to integrate the Prisma Admin panel into your AdonisJS v6+ application.

## Installation

```bash
npm install @prisma-admin/adonis @prisma-admin/core @prisma-admin/node-utils
```

## Prerequisites

- AdonisJS v6+
- @prisma/client v4+
- A configured Prisma schema

## Usage

### 1. Setup Prisma Service

Create a Prisma service in your AdonisJS application:

```typescript
// app/services/prisma_service.ts
import { PrismaService } from '@prisma-admin/adonis';

export default new PrismaService();
```

### 2. Create Admin Controller

Create a controller that extends the base AdminController:

```typescript
// app/controllers/admin_controller.ts
import { HttpContext } from '@adonisjs/core/http';
import { createAdminController } from '@prisma-admin/adonis';
import prismaService from '#services/prisma_service';

// Create controller instance
const adminController = createAdminController(prismaService);

export default class AdminController {
  async getModels(ctx: HttpContext) {
    return adminController.getModels(ctx);
  }

  async getModelMetadata(ctx: HttpContext) {
    return adminController.getModelMetadata(ctx);
  }

  async getModelItems(ctx: HttpContext) {
    return adminController.getModelItems(ctx);
  }

  async performAction(ctx: HttpContext) {
    return adminController.performAction(ctx);
  }

  async getModelItem(ctx: HttpContext) {
    return adminController.getModelItem(ctx);
  }

  async createModelItemWithFiles(ctx: HttpContext) {
    return adminController.createModelItemWithFiles(ctx);
  }

  async createModelItem(ctx: HttpContext) {
    return adminController.createModelItem(ctx);
  }

  async updateModelItemWithFiles(ctx: HttpContext) {
    return adminController.updateModelItemWithFiles(ctx);
  }

  async updateModelItem(ctx: HttpContext) {
    return adminController.updateModelItem(ctx);
  }

  async saveInlinesWithFiles(ctx: HttpContext) {
    return adminController.saveInlinesWithFiles(ctx);
  }

  async saveInlines(ctx: HttpContext) {
    return adminController.saveInlines(ctx);
  }

  async deleteModelItemPost(ctx: HttpContext) {
    return adminController.deleteModelItemPost(ctx);
  }

  async getAutocompleteOptions(ctx: HttpContext) {
    return adminController.getAutocompleteOptions(ctx);
  }

  async deleteObject(ctx: HttpContext) {
    return adminController.deleteObject(ctx);
  }

  async getIdByUniqueField(ctx: HttpContext) {
    return adminController.getIdByUniqueField(ctx);
  }
}
```

### 3. Register Routes

Register the admin routes in your routes file:

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router';

router.group(() => {
  // Get all models
  router.get('/models', 'AdminController.getModels');
  
  // Get model metadata
  router.get('/models/:model', 'AdminController.getModelMetadata');
  
  // Get model items
  router.get('/models/:model/items', 'AdminController.getModelItems');
  
  // Perform bulk action
  router.post('/models/:model/actions/:action', 'AdminController.performAction');
  
  // Get single model item
  router.get('/models/:model/:idItem', 'AdminController.getModelItem');
  
  // Create model item (with files)
  router.post('/models/:model/create-with-files', 'AdminController.createModelItemWithFiles');
  
  // Create model item (without files)
  router.post('/models/:model', 'AdminController.createModelItem');
  
  // Update model item (with files)
  router.post('/models/:model/:idItem/update-with-files', 'AdminController.updateModelItemWithFiles');
  
  // Update model item (without files)
  router.put('/models/:model/:idItem', 'AdminController.updateModelItem');
  
  // Save inline relations (with files)
  router.post('/models/:model/:idItem/inlines-with-files', 'AdminController.saveInlinesWithFiles');
  
  // Save inline relations (without files)
  router.post('/models/:model/:idItem/inlines', 'AdminController.saveInlines');
  
  // Delete model item (POST method)
  router.post('/models/:model/:idItem/delete', 'AdminController.deleteModelItemPost');
  
  // Delete model item (DELETE method)
  router.delete('/models/:model/:idItem', 'AdminController.deleteObject');
  
  // Autocomplete endpoint
  router.post('/models/:model/autocomplete', 'AdminController.getAutocompleteOptions');
  
  // Get ID by unique field
  router.get('/models/:model/get-id', 'AdminController.getIdByUniqueField');
}).prefix('/api/admin');
```

## Custom Admin Service

You can extend the base admin service to implement custom logic:

```typescript
// app/services/custom_admin_service.ts
import { BaseAdminService } from '@prisma-admin/adonis';
import { HttpContext } from '@adonisjs/core/http';

export class CustomAdminService extends BaseAdminService {
  checkPermissions(ctx: HttpContext, user: any, action: string): boolean {
    // Implement your custom permission logic
    if (!user) return false;
    if (user.role !== 'admin') return false;
    return true;
  }

  checkModelPermissions(ctx: HttpContext, user: any, model: string, action: string): boolean {
    // Implement your custom model permission logic
    if (!user) return false;
    if (user.role !== 'admin') return false;
    return true;
  }

  checkModelItemPermissions(ctx: HttpContext, user: any, model: string, idItem: string, action: string): boolean {
    // Implement your custom item permission logic
    if (!user) return false;
    if (user.role !== 'admin') return false;
    return true;
  }
}

// Use your custom service
import { createAdminController } from '@prisma-admin/adonis';
import prismaService from '#services/prisma_service';

export const adminController = createAdminController(
  prismaService,
  (prisma) => new CustomAdminService(prisma)
);
```

## File Upload Configuration

Configure file storage in your admin service:

```typescript
import { LocalFileStorage } from '@prisma-admin/node-utils';
import path from 'path';

export class CustomAdminService extends BaseAdminService {
  constructor(prisma: PrismaService) {
    super(prisma);
    
    // Configure local file storage
    this.fileStorage = new LocalFileStorage({
      uploadDir: path.join(process.cwd(), 'uploads'),
      publicPath: '/uploads'
    });
  }
}
```

## Middleware

Add authentication middleware to protect admin routes:

```typescript
// start/routes.ts
router.group(() => {
  // ... admin routes
})
.prefix('/api/admin')
.middleware(['auth', 'admin']); // Add your middleware
```

## License

MIT
