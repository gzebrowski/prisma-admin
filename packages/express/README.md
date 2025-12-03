# @prisma-admin/express

Express.js integration for Prisma Admin - a powerful admin panel generator for Prisma with file upload support.

## Installation

```bash
npm install @prisma-admin/express @prisma-admin/core
```

## Usage

### Basic Setup

```typescript
import express from 'express';
import { PrismaService, createAdminRouter, BaseAdminService } from '@prisma-admin/express';
import { AdminDefinitionMap } from '@prisma-admin/core';
import { LocalFileStorage } from '@prisma-admin/node-utils';
import adminDefinitions from './admin-definitions';

const app = express();
const prisma = PrismaService.getInstance();

// Connect to database
await prisma.connect();

// Create custom admin service with file storage
class AdminService extends BaseAdminService {
    private fileStorage: LocalFileStorage;

    constructor(prisma: PrismaService) {
        super(prisma);
        this.fileStorage = new LocalFileStorage(
            process.env.UPLOAD_DIR || 'uploads',
            process.env.BASE_URL || 'http://localhost:3001'
        );
        this.fileStorage.initialize();
    }

    getAdminDefinitions(): AdminDefinitionMap {
        return adminDefinitions;
    }

    async processFile(model: string, file: Express.Multer.File, id?: string | number | null): Promise<string | null> {
        if (!file) return null;
        return await this.fileStorage.processFile(file, model);
    }

    async processThumbnail(model: string, filePath: string, id?: string | number | null): Promise<string | null> {
        if (!filePath) return null;
        return await this.fileStorage.createThumbnail(filePath, null, 150, 150);
    }

    async getFileUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        return this.fileStorage.getFileUrl(fileKey);
    }

    async getThumbnailUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        return this.fileStorage.getThumbnailUrl(fileKey, 150, 150);
    }

    async deleteFile(fileKey: string): Promise<void> {
        await this.fileStorage.deleteFile(fileKey);
    }
}

// Create admin router
const adminRouter = createAdminRouter(prisma, (p) => new AdminService(p));

// Mount admin router
app.use('/api/admin', adminRouter);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.listen(3001, () => {
    console.log('Server running on http://localhost:3001');
});
```

### Advanced: Custom Router Extension

```typescript
import { AdminRouter, PrismaService, BaseAdminService } from '@prisma-admin/express';
import { Router } from 'express';

class CustomAdminRouter extends AdminRouter {
    constructor(prisma: PrismaService) {
        super(prisma, (p) => new AdminService(p));
        this.addCustomRoutes();
    }

    private addCustomRoutes() {
        // Add custom routes
        this.router.get('/custom-endpoint', (req, res) => {
            res.json({ message: 'Custom endpoint' });
        });
    }
}

const customRouter = new CustomAdminRouter(prisma);
app.use('/api/admin', customRouter.router);
```

### Permission Control

Override permission methods in your AdminService:

```typescript
class AdminService extends BaseAdminService {
    checkPermissions(req: Request, user: any, action: string): boolean {
        // Implement your permission logic
        if (!user || !user.isAdmin) {
            return false;
        }
        return true;
    }

    checkModelPermissions(req: Request, user: any, model: string, action: string): boolean {
        // Model-specific permissions
        if (model === 'user' && !user.isSuperAdmin) {
            return false;
        }
        return true;
    }

    checkModelItemPermissions(req: Request, user: any, model: string, pk: string, action: string): boolean {
        // Item-specific permissions
        return true;
    }
}
```

## API Routes

All routes are automatically created:

- `GET /models` - Get all models
- `GET /models/:model` - Get model metadata
- `GET /items/:model` - Get model items (with pagination and filters)
- `GET /items/:model/:idItem` - Get single item
- `POST /items/:model` - Create new item
- `POST /items-with-files/:model` - Create item with file uploads
- `PUT /items/:model/:idItem` - Update item
- `PUT /items-with-files/:model/:idItem` - Update item with files
- `PUT /inlines/:model/:idItem` - Save inline related items
- `PUT /inlines-with-files/:model/:idItem` - Save inlines with files
- `DELETE /items/:model/:idItem` - Delete item
- `POST /items/:model/actions/:action` - Perform bulk action
- `POST /autocomplete/:model` - Get autocomplete options
- `GET /get-id-by-unique/:model` - Get ID by unique field

## Features

- ✅ **Express.js Integration** - Native Express router
- ✅ **File Upload Support** - Multer integration for file handling
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Flexible Permissions** - Customizable permission system
- ✅ **File Storage** - Compatible with @prisma-admin/node-utils
- ✅ **Prisma Integration** - Direct Prisma client access
- ✅ **Error Handling** - Comprehensive error responses

## Middleware Compatibility

The admin router works with standard Express middleware:

```typescript
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your authentication middleware
app.use('/api/admin', authMiddleware);
app.use('/api/admin', adminRouter);
```

## License

MIT
