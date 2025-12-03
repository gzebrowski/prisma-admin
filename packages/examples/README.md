# @prisma-admin/examples

Example implementations and manual files for Prisma Admin.

## Overview

This package contains example implementations that you need to manually create in your application. These examples show how to integrate the Prisma Admin packages with your specific data models and business logic.

## Examples Included

### 1. Model Definitions (`models/`)

Example Prisma schema definitions and corresponding TypeScript interfaces.

### 2. Backend Integration (`nestjs/`)

Complete NestJS integration examples showing:
- Controllers with admin routes
- Services for data operations
- Prisma client configuration
- Error handling
- Authentication guards

### 3. Frontend Setup (`react/`)

React application setup examples:
- App.tsx with admin routing
- Component integration
- Styling configuration
- State management

## Manual Implementation Guide

### Step 1: Define Your Models

Copy and modify the model definitions from `examples/models/` to match your Prisma schema:

```typescript
// your-app/src/models/user.ts
import { AdminModelInterface } from '@prisma-admin/core';

export class UserAdminModel implements AdminModelInterface {
  // Customize based on your User model
}
```

### Step 2: Backend Integration

1. **Install the packages:**
   ```bash
   npm install @prisma-admin/core @prisma-admin/nestjs
   ```

2. **Create admin controller:**
   ```typescript
   // your-app/src/admin/admin.controller.ts
   import { AdminController } from '@prisma-admin/nestjs';
   // Customize for your needs
   ```

3. **Configure services:**
   ```typescript
   // your-app/src/admin/admin.service.ts
   import { AdminService } from '@prisma-admin/nestjs';
   // Add your business logic
   ```

### Step 3: Frontend Integration

1. **Install packages:**
   ```bash
   npm install @prisma-admin/react @prisma-admin/core
   ```

2. **Add to your React app:**
   ```tsx
   // your-app/src/App.tsx
   import { AdminPanel } from '@prisma-admin/react';
   import '@prisma-admin/react/dist/styles.css';
   ```

### Step 4: Configuration

1. **Environment variables:**
   ```env
   ADMIN_API_URL=http://localhost:3000/admin
   DATABASE_URL="postgresql://..."
   ```

2. **API routes:**
   Configure your backend to serve admin endpoints at `/admin`

## File Structure

```
your-project/
├── src/
│   ├── admin/
│   │   ├── models/          # Copy from examples/models/
│   │   ├── controllers/     # Copy from examples/nestjs/
│   │   └── services/        # Modify as needed
│   ├── components/
│   │   └── admin/          # Optional: custom components
│   └── prisma/
│       └── schema.prisma   # Your Prisma schema
```

## Customization Examples

### Custom Model Implementation

```typescript
import { AdminModelInterface, BaseAdmin } from '@prisma-admin/core';
import { PrismaClient } from '@prisma/client';

export class ProductAdminModel extends BaseAdmin implements AdminModelInterface {
  constructor(prisma: PrismaClient) {
    super(prisma, 'product');
  }

  // Override methods for custom behavior
  async create(data: any) {
    // Custom creation logic
    data.slug = this.generateSlug(data.name);
    return super.create(data);
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
}
```

### Custom Controller

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { AdminController } from '@prisma-admin/nestjs';

@Controller('admin')
export class CustomAdminController extends AdminController {
  
  @Get('dashboard')
  async getDashboard() {
    // Custom dashboard data
    return {
      stats: await this.getStats(),
      recentActivity: await this.getRecentActivity()
    };
  }
  
  @Post('bulk-import')
  async bulkImport(@Body() data: any[]) {
    // Custom bulk import logic
    return this.adminService.bulkImport(data);
  }
}
```

## Best Practices

1. **Security**: Always implement proper authentication and authorization
2. **Validation**: Use class-validator for input validation
3. **Error Handling**: Implement comprehensive error handling
4. **Logging**: Add proper logging for admin operations
5. **Testing**: Write tests for your admin implementations

## Support

- Check the individual package READMEs for detailed API documentation
- Review the example implementations in this package
- Ensure your Prisma schema is properly configured
- Test thoroughly before deploying to production