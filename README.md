# Prisma Admin

A powerful, framework-agnostic admin panel for Prisma ORM with full TypeScript support. Automatically generate CRUD interfaces for your Prisma models with advanced features like inline editing, custom actions, file uploads, and comprehensive permission control.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-4.0+-green.svg)](https://www.prisma.io/)

## ✨ Key Features

- **🎯 Framework Agnostic Core** - Works with any backend framework
- **🚀 Multiple Backend Support** - NestJS, Express, Fastify, and AdonisJS out of the box
- **📘 Type-Safe** - Full TypeScript support with auto-generated types from Prisma schema
- **⚛️ React Frontend** - Modern, responsive React-based admin interface
- **🔄 Auto CRUD** - Automatic Create, Read, Update, Delete operations
- **🔗 Relationships** - Full support for all Prisma relation types (1:1, 1:N, M:N)
- **📝 Inline Editing** - Edit related models inline with parent records
- **⚡ Custom Actions** - Define custom bulk operations on selected items
- **🔍 Advanced Filtering** - Powerful filtering, sorting, and searching with Django-style lookups
- **✅ Data Validation** - Automatic and customizable field-level validation
- **📁 File Upload Support** - Built-in image and file uploads with automatic thumbnail generation
- **🔐 Permission System** - Fine-grained access control at model and item level
- **🎨 Custom Widgets** - Date pickers, textareas, file uploads, and more
- **🔗 Field Dependencies** - Cascading dropdown filters based on related model selection

## 📦 Packages

This monorepo contains the following packages:

| Package | Description | Version |
|---------|-------------|---------|
| **@prisma-admin/core** | Framework-agnostic core logic | 1.0.0 |
| **@prisma-admin/nestjs** | NestJS integration | 1.0.0 |
| **@prisma-admin/express** | Express.js integration | 1.0.0 |
| **@prisma-admin/fastify** | Fastify integration | 1.0.0 |
| **@prisma-admin/adonis** | AdonisJS v6 integration (ESM) | 1.0.0 |
| **@prisma-admin/react** | React frontend components | 1.0.0 |
| **@prisma-admin/node-utils** | Node.js utilities (file storage, Sharp image processing) | 1.0.0 |

## 🚀 Quick Start

### Installation

Choose the packages based on your backend framework:

```bash
# For NestJS
npm install @prisma-admin/core @prisma-admin/nestjs @prisma-admin/node-utils @prisma-admin/react

# For Express
npm install @prisma-admin/core @prisma-admin/express @prisma-admin/node-utils @prisma-admin/react

# For Fastify
npm install @prisma-admin/core @prisma-admin/fastify @prisma-admin/node-utils @prisma-admin/react

# For AdonisJS
npm install @prisma-admin/core @prisma-admin/adonis @prisma-admin/node-utils @prisma-admin/react
```

### Prerequisites

**Database Schema Requirements:**
- Each table must have a single-field primary key
- Primary key should be either:
  - Integer (auto-increment): `id Int @id @default(autoincrement())`
  - UUID: `id String @id @default(uuid()) @db.Uuid`
- Recommended field name: `id`

**Widget Configuration:**
Prisma cannot auto-detect certain field semantics. You must configure widgets for:
- Date-only fields (vs datetime)
- File upload fields (image/file)
- Large text fields (textarea)

## 📖 Documentation

### Getting Started
- [Core Concepts](./docs/core-concepts.md)
- [Model Definitions](./docs/model-definitions.md)
- [API Reference](./docs/api-reference.md)

### Backend Integration
- [NestJS Setup Guide](./packages/nestjs/README.md)
- [Express Setup Guide](./packages/express/README.md)
- [Fastify Setup Guide](./packages/fastify/README.md)
- [AdonisJS Setup Guide](./packages/adonis/README.md)

### Frontend
- [React Components](./packages/react/README.md)

### Advanced Topics
- [File Uploads & Storage](./docs/file-uploads.md)
- [Permissions & Access Control](./docs/permissions.md)
- [Inline Editing](./docs/inline-editing.md)
- [Custom Actions](./docs/custom-actions.md)
- [Field Dependencies](./docs/field-dependencies.md)
- [Data Validation](./docs/validation.md)

### Examples
- [Complete Examples](./packages/examples/)

## 🎯 Basic Usage Example

### Step 1: Define Admin Models

Create an admin class for each Prisma model:

```typescript
// admin/models/user.ts
import { BaseAdminModel } from '@prisma-admin/core';

export class UserAdmin extends BaseAdminModel {
  override prismaModel = 'User';
  static override prismaModelName = 'User';
  
  // Fields displayed in list view
  protected override listDisplayFields = [
    'id',
    'email',
    'firstName',
    'lastName',
    'isActive',
    'createdAt'
  ];
  
  // Search configuration
  protected override searchFields = [
    'email',
    '^firstName',  // Starts with
    '^lastName'
  ];
  
  // Filter sidebar
  protected override listFilterFields = [
    'isActive',
    'createdAt'
  ];
  
  // Custom widgets
  protected override widgets = {
    avatar: 'image',
    bio: 'textarea',
    birthDate: 'date'
  };
  
  // Field validation
  async validate_email(value: string) {
    if (!validateEmail(value)) {
      throw new ValidationError('Invalid email');
    }
    return value.toLowerCase();
  }
}
```

### Step 2: Register Admin Definitions

```typescript
// admin/adminlist.ts
import { UserAdmin } from './models/user';
import { ProjectAdmin } from './models/project';
import { AdminDefinitionMap } from '@prisma-admin/core';

const adminDefinitions: AdminDefinitionMap = {
  user: { cls: UserAdmin, name: UserAdmin.getPrismaModelPlural() },
  project: { cls: ProjectAdmin, name: ProjectAdmin.getPrismaModelPlural() },
};

export default adminDefinitions;
```

**⚠️ Important:** Keys must be lowercase (e.g., `user`, NOT `User` or `userAdmin`).

### Step 3: Backend Setup

#### NestJS Example

```typescript
// admin/admin.service.ts
import { BaseAdminService } from '@prisma-admin/nestjs';
import { LocalFileStorage } from '@prisma-admin/node-utils';
import adminDefinitions from './adminlist';

export class AdminService extends BaseAdminService {
  constructor(prisma: PrismaService) {
    super(prisma);
    
    // Configure file storage
    this.fileStorage = new LocalFileStorage(
      process.env.UPLOAD_DIR || 'uploads',
      process.env.BASE_URL || 'http://localhost:3001'
    );
  }
  
  getAdminDefinitions() {
    return adminDefinitions;
  }
  
  // Optional: Custom permissions
  checkPermissions(req: Request, user: any, action: string) {
    if (!user?.isStaff) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
```

```typescript
// admin/admin.controller.ts
import { BaseAdminController, PrismaService } from '@prisma-admin/nestjs';
import { AdminService } from './admin.service';

export class AdminController extends BaseAdminController<AdminService> {
  getAdminServiceInstance(prisma: PrismaService) {
    return new AdminService(prisma);
  }
}
```

See [NestJS Integration Guide](./packages/nestjs/README.md) for complete setup including module configuration.

#### Express Example

```typescript
// routes/admin.ts
import { createAdminRouter, PrismaService } from '@prisma-admin/express';
import adminDefinitions from '../admin/adminlist';

const prisma = new PrismaService();
const adminRouter = createAdminRouter(prisma, adminDefinitions);

app.use('/api/admin', adminRouter);
```

See [Express Integration Guide](./packages/express/README.md) for details.

#### Fastify Example

```typescript
// plugins/admin.ts
import { createAdminPlugin, PrismaService } from '@prisma-admin/fastify';
import adminDefinitions from '../admin/adminlist';

const prisma = new PrismaService();
await fastify.register(createAdminPlugin(prisma, adminDefinitions), {
  prefix: '/api/admin'
});
```

See [Fastify Integration Guide](./packages/fastify/README.md) for details.

### Step 4: Frontend Setup

```tsx
// App.tsx
import { Routes, Route } from 'react-router-dom';
import { AdminPanel } from '@prisma-admin/react';

function App() {
  return (
    <Routes>
      <Route path="/admin/:adminModel?/:modelId?" element={<AdminPanel />} />
    </Routes>
  );
}
```

## 🔥 Advanced Features

### Inline Editing

Edit related records inline with the parent:

```typescript
const inlines: InlineDefinition[] = [
  {
    model: 'UserPayments',
    label: 'Payment History',
    mode: 'inline',        // or 'stacked'
    expanded: true,
    canAdd: true,
    canDelete: true,
    canUpdate: true,
    maxItems: 20,
    excludeFields: ['createdAt', 'updatedAt'],
    orderBy: ['-createdAt'],  // DESC
  },
];

export class UserAdmin extends BaseAdminModel {
  protected override inlines = inlines;
}
```

### Custom Bulk Actions

```typescript
export class ProjectAdmin extends BaseAdminModel {
  protected override actions = [
    {
      key: 'deleteSelected',
      label: 'Delete Selected',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to delete selected projects?'
    },
    {
      key: 'archiveProjects',
      label: 'Archive Projects',
      requiresConfirmation: true
    },
  ];

  async archiveProjects(request: any, user: any, ids: ActionIdsType) {
    const model = this.getPrismaModel();
    const whereClause = this.getActionWhereClause(ids);
    
    await this.prismaClient[model].updateMany({
      where: whereClause,
      data: { status: 'ARCHIVED', archivedAt: new Date() }
    });
  }
}
```

### Field Dependencies (Cascading Filters)

Perfect for hierarchical relationships:

```typescript
// Example: Project → Category → SubCategory
export class TimeTrackingAdmin extends BaseAdminModel {
  protected override fieldDependencies = {
    'projectCategoryId': ['projectId'],           // Category filtered by Project
    'projectSubCategoryId': ['projectCategoryId'], // SubCategory filtered by Category
  };
}
```

When user selects a Project, only related Categories appear. When they select a Category, only related SubCategories appear.

### Django-Style Field Lookups

```typescript
export class OrderAdmin extends BaseAdminModel {
  protected override listDisplayFields = [
    'id',
    'user__email|Customer Email',        // Lookup with custom label
    'user__firstName|First Name',
    'product__name|Product',
    'totalAmount',
    'status',
  ];
  
  protected override searchFields = [
    '&id',              // & = integer exact
    '#uuid',            // # = UUID exact
    '=email',           // = = exact string match
    '^firstName',       // ^ = starts with
    '$lastName',        // $ = ends with
    '!username',        // ! = case-sensitive
    '~description',     // ~ = regex
    'user__email',      // Relation lookup
  ];
}
```

### Comprehensive Validation

```typescript
export class UserAdmin extends BaseAdminModel {
  // Field-level validation (called for each field)
  async validate_email(value: string, id?: string) {
    value = value?.trim().toLowerCase();
    
    if (!validateEmail(value)) {
      throw new ValidationError('Invalid email format');
    }
    
    // Check uniqueness
    const existing = await this.prismaClient.user.findFirst({
      where: { email: value, id: { not: id } }
    });
    
    if (existing) {
      throw new ValidationError('Email already exists');
    }
    
    return value;
  }
  
  // Cross-field validation
  async validateData(data: Record<string, any>, id?: string) {
    if (!data.canSendEmail && !data.canSendSms) {
      throw new ValidationError('At least one notification method must be enabled');
    }
    
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      throw new ValidationError('End date must be after start date');
    }
    
    return data;
  }
}
```

### File Uploads with Thumbnails

```typescript
export class ProductAdmin extends BaseAdminModel {
  protected override widgets = {
    mainImage: 'image',      // Auto-generates thumbnails
    gallery: 'image',        // Supports multiple files
    manual: 'file',
    description: 'textarea',
    launchDate: 'date',      // Date-only picker
  };
}
```

Backend configuration:

```typescript
export class AdminService extends BaseAdminService {
  constructor(prisma: PrismaService) {
    super(prisma);
    
    // Local storage
    this.fileStorage = new LocalFileStorage('uploads', 'http://localhost:3001');
    
    // Or S3 storage
    // this.fileStorage = new S3FileStorage({
    //   bucket: process.env.AWS_BUCKET,
    //   region: process.env.AWS_REGION,
    //   accessKeyId: process.env.AWS_ACCESS_KEY,
    //   secretAccessKey: process.env.AWS_SECRET_KEY,
    // });
  }
}
```

## 🔐 Permission System

Implement multi-level access control:

```typescript
export class AdminService extends BaseAdminService {
  // Global action permissions
  checkPermissions(req: Request, user: any, action: string) {
    if (!user?.isStaff) {
      throw new ForbiddenException('Staff access required');
    }
    return true;
  }
  
  // Model-level permissions
  checkModelPermissions(req: Request, user: any, model: string, action: string) {
    const permission = await this.prisma.userPermission.findFirst({
      where: {
        userId: user.id,
        model: model,
        action: action
      }
    });
    
    if (!permission) {
      throw new ForbiddenException(`No ${action} permission for ${model}`);
    }
    return true;
  }
  
  // Item-level permissions
  checkModelItemPermissions(req: Request, user: any, model: string, pk: string, action: string) {
    // Example: Users can only edit their own records
    if (model === 'user' && user.id !== parseInt(pk) && !user.isAdmin) {
      throw new ForbiddenException('Can only edit own profile');
    }
    return true;
  }
}
```

Per-model permissions:

```typescript
export class ProjectAdmin extends BaseAdminModel {
  async canDeleteObject(request: any, item: Record<string, any>) {
    // Prevent deletion of active projects
    return item.status !== 'ACTIVE';
  }
  
  async canUpdateObject(request: any, item: any) {
    // Only project owners can edit
    return item.ownerId === request.user?.id || request.user?.isAdmin;
  }
  
  async canViewItem(req: any, item: any) {
    // Only show public projects or owned projects
    return item.isPublic || item.ownerId === req.user?.id;
  }
}
```

## 🏗️ Architecture

```
prisma-admin/
├── packages/
│   ├── core/           # Framework-agnostic core
│   │   ├── baseAdmin.ts      # BaseAdminModel class
│   │   ├── adminService.ts   # AdminService logic
│   │   └── types.ts          # TypeScript definitions
│   ├── nestjs/         # NestJS integration
│   ├── express/        # Express integration
│   ├── fastify/        # Fastify integration
│   ├── adonis/         # AdonisJS integration (ESM)
│   ├── react/          # React UI components
│   └── node-utils/     # File storage & Sharp image processing
└── examples/           # Complete implementation examples
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- TypeScript code compiles without errors
- Tests pass (if applicable)
- Code follows existing style conventions
- Commit messages are clear and descriptive

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Django Admin](https://docs.djangoproject.com/en/stable/ref/contrib/admin/)
- Built for the modern TypeScript and Prisma ecosystem
- Powered by [Sharp](https://sharp.pixelplumbing.com/) for image processing

## 📞 Support & Community

- 📖 [Full Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/gzebrowski/prisma-admin/issues)
- 💬 [Discussions](https://github.com/gzebrowski/prisma-admin/discussions)
- ⭐ Star this repo if you find it helpful!

## 🗺️ Roadmap

- [ ] Angular frontend support
- [ ] GraphQL API support
- [ ] Real-time updates with WebSockets
- [ ] Advanced chart/dashboard widgets
- [ ] Export to CSV/Excel
- [ ] Audit logging
- [ ] Multi-language support (i18n)

---

**Made with ❤️ by [Grzegorz Zebrowski](https://github.com/gzebrowski)**

If you find this project useful, please consider giving it a ⭐️!
