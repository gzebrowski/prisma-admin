# @prisma-admin/fastify

Fastify integration for Prisma Admin - a powerful admin panel generator for Prisma with file upload support.

## Installation

```bash
npm install @prisma-admin/fastify @prisma-admin/core @fastify/multipart
```

## Usage

### Basic Setup

```typescript
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { PrismaService, adminPlugin, BaseAdminService } from '@prisma-admin/fastify';
import { AdminDefinitionMap } from '@prisma-admin/core';
import { LocalFileStorage } from '@prisma-admin/node-utils';
import { MultipartFile } from '@fastify/multipart';
import adminDefinitions from './admin-definitions';

const fastify = Fastify({ logger: true });
const prisma = PrismaService.getInstance();

// Register multipart plugin for file uploads
await fastify.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

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

    async processFile(model: string, file: MultipartFile, id?: string | number | null): Promise<string | null> {
        if (!file) return null;
        
        // Convert Fastify MultipartFile to Buffer
        const buffer = await file.toBuffer();
        const multerFile = {
            fieldname: file.fieldname,
            originalname: file.filename,
            encoding: file.encoding,
            mimetype: file.mimetype,
            buffer: buffer,
            size: buffer.length,
        } as Express.Multer.File;
        
        return await this.fileStorage.processFile(multerFile, model);
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

// Register admin plugin
await fastify.register(adminPlugin, {
    prisma,
    adminServiceFactory: (p) => new AdminService(p),
    prefix: '/api/admin', // optional, defaults to '/admin'
});

// Serve uploaded files
await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/',
});

await fastify.listen({ port: 3001, host: '0.0.0.0' });
console.log('Server running on http://localhost:3001');
```

### With TypeScript Types

```typescript
import { FastifyRequest } from 'fastify';

class AdminService extends BaseAdminService {
    checkPermissions(req: FastifyRequest, user: any, action: string): boolean {
        // Implement your permission logic
        if (!user || !user.isAdmin) {
            return false;
        }
        return true;
    }

    checkModelPermissions(req: FastifyRequest, user: any, model: string, action: string): boolean {
        // Model-specific permissions
        if (model === 'user' && !user.isSuperAdmin) {
            return false;
        }
        return true;
    }

    checkModelItemPermissions(req: FastifyRequest, user: any, model: string, pk: string, action: string): boolean {
        // Item-specific permissions
        return true;
    }
}
```

### With Authentication

```typescript
import fastifyJwt from '@fastify/jwt';

// Register JWT plugin
await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret'
});

// Authentication hook
fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/admin')) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send({ error: 'Unauthorized' });
        }
    }
});

// Register admin plugin (after auth hook)
await fastify.register(adminPlugin, {
    prisma,
    adminServiceFactory: (p) => new AdminService(p),
});
```

### Multiple Admin Panels

```typescript
// Admin panel for main app
await fastify.register(async (instance) => {
    await instance.register(adminPlugin, {
        prisma,
        adminServiceFactory: (p) => new MainAdminService(p),
        prefix: '/api/admin',
    });
});

// Admin panel for CMS
await fastify.register(async (instance) => {
    await instance.register(adminPlugin, {
        prisma,
        adminServiceFactory: (p) => new CmsAdminService(p),
        prefix: '/api/cms-admin',
    });
});
```

## API Routes

All routes are automatically created under the specified prefix (default: `/admin`):

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

- ✅ **Fastify Plugin** - Easy integration as Fastify plugin
- ✅ **File Upload Support** - @fastify/multipart integration
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Flexible Permissions** - Customizable permission system
- ✅ **File Storage** - Compatible with @prisma-admin/node-utils
- ✅ **Prisma Integration** - Direct Prisma client access
- ✅ **Error Handling** - Comprehensive error responses
- ✅ **High Performance** - Leverages Fastify's speed

## Configuration Options

```typescript
interface AdminPluginOptions {
    prisma: PrismaService;
    adminServiceFactory?: (prisma: PrismaService) => BaseAdminService;
    prefix?: string; // default: '/admin'
}
```

## License

MIT
