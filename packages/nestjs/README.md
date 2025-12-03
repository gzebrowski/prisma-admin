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
import { AdminModelInterface } from '@prisma-admin/core';

export class UserAdmin implements AdminModelInterface {
  modelName = 'User';
  
  getFieldDefinitions() {
    return {
      id: { data_type: 'uuid', label: 'ID' },
      email: { data_type: 'string', label: 'Email', required: true },
      name: { data_type: 'string', label: 'Name' },
      role: { 
        data_type: 'enum', 
        label: 'Role',
        choices: [
          { value: 'USER', label: 'User' },
          { value: 'ADMIN', label: 'Admin' }
        ]
      },
      createdAt: { data_type: 'datetime', label: 'Created' },
    };
  }

  getInlineDefinitions() {
    return {
      posts: {
        model: 'Post',
        fk_name: 'authorId',
        mode: 'table'
      }
    };
  }

  getListDisplay() {
    return ['name', 'email', 'role', 'createdAt'];
  }

  getSearchFields() {
    return ['name', 'email'];
  }
}
```

### 3. Register Admin Models

```typescript
// admin/adminlist.ts
import { UserAdmin } from './models/user.admin';
import { PostAdmin } from './models/post.admin';

export const adminModels = {
  User: UserAdmin,
  Post: PostAdmin,
};
```

### 4. Create Admin Service

```typescript
// admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { AdminService as BaseAdminService } from '@prisma-admin/nestjs';
import { adminModels } from './adminlist';

@Injectable()
export class AdminService extends BaseAdminService {
  constructor(prisma: PrismaService) {
    super(prisma, adminModels);
  }
}
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

Core service with methods:
- `getModels()` - Get available models
- `getModelItems(model, params)` - Get model data
- `createModelItem(model, data)` - Create new item
- `updateModelItem(model, id, data)` - Update item
- `deleteModelItem(model, id)` - Delete item

## Configuration

You can customize the admin behavior by extending the base classes and overriding methods as needed.