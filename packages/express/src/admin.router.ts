import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { BaseAdminService } from './admin.service';
import { PrismaService } from './prisma.service';
import {
    GetModelItemsType,
    ValidationError,
    ApiResponseError,
    CommonPostResult,
    InlineFileDataType,
    FilesMapFormat,
    InlineItemsData,
    reformatInlineFilesData,
} from '../../core/src';

const upload = multer({ storage: multer.memoryStorage() });

export class AdminRouter {
    public router: Router;
    protected adminService: BaseAdminService;

    constructor(prisma: PrismaService, adminServiceFactory?: (prisma: PrismaService) => BaseAdminService) {
        this.router = Router();
        this.adminService = adminServiceFactory ? adminServiceFactory(prisma) : new BaseAdminService(prisma);
        this.setupRoutes();
    }

    protected getPostResult(req: Request, data: any, error?: any): CommonPostResult {
        if (error) {
            if (Array.isArray(error)) {
                const errorMap: Record<string, ValidationError['errors'] | null> = {};
                error.forEach(err => {
                    if (err.model && err.errors?.length) {
                        errorMap[err.model] = err.errors;
                    }
                });
                if (Object.keys(errorMap).length > 0) {
                    return {
                        status: 'error',
                        message: 'Validation errors occurred',
                        errors: null,
                        errorMap,
                        data: null
                    };
                }
            }
            if (error instanceof ValidationError) {
                return {
                    status: 'error',
                    message: error.message,
                    errors: error.errors,
                    data: null
                }
            }
            if (error instanceof ApiResponseError) {
                return {
                    status: 'error',
                    message: error.message,
                    errors: null,
                    data: null
                };
            }
            throw error;
        } else {
            return {
                status: 'success',
                message: 'Operation successful',
                errors: null,
                data
            }
        }
    }

    protected checkPermission(req: Request, res: Response, action: string): boolean {
        if (!this.adminService.checkPermissions(req, (req as any).user, action)) {
            res.status(403).json({ error: `You do not have permission to ${action}.` });
            return false;
        }
        return true;
    }

    protected checkModelPermission(req: Request, res: Response, model: string, action: string): boolean {
        if (!this.adminService.checkModelPermissions(req, (req as any).user, model, action)) {
            res.status(403).json({ error: `You do not have permission to ${action} for model ${model}.` });
            return false;
        }
        return true;
    }

    protected checkModelItemPermission(req: Request, res: Response, model: string, idItem: string, action: string): boolean {
        if (!this.adminService.checkModelItemPermissions(req, (req as any).user, model, idItem, action)) {
            res.status(403).json({ error: `You do not have permission to ${action} item ${idItem} for model ${model}.` });
            return false;
        }
        return true;
    }

    protected setupRoutes() {
        // Get all models
        this.router.get('/models', this.getModels.bind(this));

        // Get model metadata
        this.router.get('/models/:model', this.getModelMetadata.bind(this));

        // Get model items
        this.router.get('/items/:model', this.getModelItems.bind(this));

        // Perform action on items
        this.router.post('/items/:model/actions/:action', this.performAction.bind(this));

        // Get single item
        this.router.get('/items/:model/:idItem', this.getModelItem.bind(this));

        // Create item with files
        this.router.post('/items-with-files/:model', upload.array('files[]'), this.createModelItemWithFiles.bind(this));

        // Create item
        this.router.post('/items/:model', this.createModelItem.bind(this));

        // Update item with files
        this.router.put('/items-with-files/:model/:idItem', upload.array('files[]'), this.updateModelItemWithFiles.bind(this));

        // Update item
        this.router.put('/items/:model/:idItem', this.updateModelItem.bind(this));

        // Save inlines with files
        this.router.put('/inlines-with-files/:model/:idItem', upload.array('files[]'), this.saveInlinesWithFiles.bind(this));

        // Save inlines
        this.router.put('/inlines/:model/:idItem', this.saveInlines.bind(this));

        // Delete item (POST for compatibility)
        this.router.post('/items/:model/:idItem/delete', this.deleteModelItemPost.bind(this));

        // Autocomplete
        this.router.post('/autocomplete/:model', this.getAutocompleteOptions.bind(this));

        // Delete item (DELETE method)
        this.router.delete('/items/:model/:idItem', this.deleteObject.bind(this));

        // Get ID by unique field
        this.router.get('/get-id-by-unique/:model', this.getIdByUniqueField.bind(this));
    }

    async getModels(req: Request, res: Response) {
        try {
            if (!this.checkPermission(req, res, 'view_models')) return;
            const models = this.adminService.getModels();
            res.json(models);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getModelMetadata(req: Request, res: Response) {
        try {
            const { model } = req.params;
            const params = req.query as Record<string, any>;
            
            if (!this.checkPermission(req, res, 'view_model_metadata')) return;
            if (!this.checkModelPermission(req, res, model, 'view_metadata')) return;
            
            const metadata = await this.adminService.getModelMetadata(req, model, params);
            res.json(metadata);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getModelItems(req: Request, res: Response) {
        try {
            const { model } = req.params;
            const filters = req.query as Record<string, any>;
            
            if (!this.checkPermission(req, res, 'view_model_items')) return;
            if (!this.checkModelPermission(req, res, model, 'view_items')) return;
            
            const page = Math.max(0, parseInt(filters.p as string, 10) || 0);
            delete filters.p;
            
            const data = await this.adminService.getModelItems(req, model, page, filters);
            res.json(data);
        } catch (error) {
            console.error('Error fetching model items:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async performAction(req: Request, res: Response) {
        try {
            const { model, action } = req.params;
            const { ids } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json(this.getPostResult(req, null, new Error('Invalid or empty ids array')));
            }
            
            const result = await this.adminService.performAction(req, (req as any).user, model, action, ids);
            res.json(this.getPostResult(req, result));
        } catch (error) {
            console.error('Error performing action:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async getModelItem(req: Request, res: Response) {
        try {
            const { model, idItem } = req.params;
            const params = req.query as Record<string, any>;
            
            if (!this.checkPermission(req, res, 'view_model_item')) return;
            if (!this.checkModelPermission(req, res, model, 'view_item')) return;
            if (!this.checkModelItemPermission(req, res, model, idItem, 'view_item')) return;
            
            const data = await this.adminService.getModelItem(req, model, idItem, params);
            res.json(data);
        } catch (error) {
            console.error('Error fetching model item:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async createModelItemWithFiles(req: Request, res: Response) {
        try {
            const { model } = req.params;
            const data = JSON.parse(req.body.__data);
            const filesMap = JSON.parse(req.body.__files);
            const files = req.files as Express.Multer.File[];
            const filesData: Record<string, Express.Multer.File> = {};
            
            if (files) {
                Object.keys(filesMap).forEach(key => {
                    const index = filesMap[key];
                    filesData[key] = files[index];
                });
            }
            
            await this.createModelItemFn(req, res, model, data, filesData);
        } catch (error) {
            console.error('Error creating model item with files:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async createModelItem(req: Request, res: Response) {
        try {
            const { model } = req.params;
            const itemData = req.body;
            await this.createModelItemFn(req, res, model, itemData);
        } catch (error) {
            console.error('Error creating model item:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async createModelItemFn(req: Request, res: Response, model: string, itemData: Record<string, any> | null, filesData?: Record<string, Express.Multer.File> | null) {
        if (!this.checkPermission(req, res, 'create_model_item')) return;
        if (!this.checkModelPermission(req, res, model, 'create_item')) return;
        
        try {
            const data = await this.adminService.createModelItem(req, model, itemData, filesData);
            res.json(this.getPostResult(req, data));
        } catch (error) {
            console.error('Error creating model item:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async updateModelItemWithFiles(req: Request, res: Response) {
        try {
            const { model, idItem } = req.params;
            const data = JSON.parse(req.body.__data);
            const filesMap = JSON.parse(req.body.__files);
            const files = req.files as Express.Multer.File[];
            const filesData: Record<string, Express.Multer.File> = {};
            
            if (files) {
                Object.keys(filesMap).forEach(key => {
                    const index = filesMap[key];
                    filesData[key] = files[index];
                });
            }
            
            await this.updateModelItemFn(req, res, model, idItem, data, filesData);
        } catch (error) {
            console.error('Error updating model item with files:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async updateModelItem(req: Request, res: Response) {
        try {
            const { model, idItem } = req.params;
            const itemData = req.body;
            await this.updateModelItemFn(req, res, model, idItem, itemData);
        } catch (error) {
            console.error('Error updating model item:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async updateModelItemFn(req: Request, res: Response, model: string, idItem: string, itemData: Record<string, any> | null, filesData?: Record<string, Express.Multer.File> | null) {
        if (!this.checkPermission(req, res, 'update_model_item')) return;
        if (!this.checkModelPermission(req, res, model, 'update_item')) return;
        if (!this.checkModelItemPermission(req, res, model, idItem, 'update_item')) return;
        
        try {
            const data = await this.adminService.getModelItem(req, model, idItem);
            if (!data || !data.item || !data.item.$pk) {
                return res.status(404).json({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            const updatedItem = await this.adminService.updateModelItem(req, model, idItem, itemData, filesData);
            res.json(this.getPostResult(req, updatedItem));
        } catch (error) {
            console.error('Error updating model item:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async saveInlinesWithFiles(req: Request, res: Response) {
        try {
            const { model, idItem } = req.params;
            const data = JSON.parse(req.body.__data) as InlineItemsData;
            const filesMap = JSON.parse(req.body.__files) as FilesMapFormat;
            const files = req.files as Express.Multer.File[];
            
            const filesData: InlineFileDataType = reformatInlineFilesData(data, filesMap, files as any);
            await this.commonSaveInlines(req, res, model, idItem, data.existingItems, data.newItems, filesData);
        } catch (error) {
            console.error('Error saving inlines with files:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async saveInlines(req: Request, res: Response) {
        try {
            const { model, idItem } = req.params;
            const { existingItems, newItems } = req.body;
            await this.commonSaveInlines(req, res, model, idItem, existingItems, newItems);
        } catch (error) {
            console.error('Error saving inlines:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async commonSaveInlines(req: Request, res: Response, model: string, idItem: string, existingItems: Record<string, any>, newItems: Record<string, any>, filesData?: InlineFileDataType | null) {
        if (!this.checkPermission(req, res, 'update_model_item')) return;
        if (!this.checkModelPermission(req, res, model, 'update_item')) return;
        if (!this.checkModelItemPermission(req, res, model, idItem, 'update_item')) return;
        
        try {
            const data = await this.adminService.getModelItem(req, model, idItem);
            if (!data || !data.item || !data.item.$pk) {
                return res.status(404).json({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            const updatedItem = await this.adminService.saveInlines(req, model, idItem, existingItems, newItems, filesData);
            res.json(this.getPostResult(req, updatedItem));
        } catch (error) {
            console.error('Error updating model item:', error);
            res.json(this.getPostResult(req, null, error));
        }
    }

    async deleteModelItemPost(req: Request, res: Response) {
        try {
            const { model, idItem } = req.params;
            
            if (!this.checkPermission(req, res, 'delete_model_item')) return;
            if (!this.checkModelPermission(req, res, model, 'delete_item')) return;
            if (!this.checkModelItemPermission(req, res, model, idItem, 'delete_item')) return;
            
            const data = await this.adminService.getModelItems(req, model, 0, { id: idItem });
            if (data.items.length === 0) {
                return res.status(404).json({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            await this.adminService.deleteObject(req, model, idItem);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting model item:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAutocompleteOptions(req: Request, res: Response) {
        try {
            const { model } = req.params;
            const { targetModel, depData, keyField, query } = req.body;
            
            if (!this.checkPermission(req, res, 'autocomplete_model_item')) return;
            if (!this.checkModelPermission(req, res, model, 'autocomplete_items')) return;
            
            const data = await this.adminService.getAutocompleteItems(req, model, targetModel, keyField, query, depData);
            res.json(data);
        } catch (error) {
            console.error('Error getting autocomplete options:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteObject(req: Request, res: Response) {
        try {
            const { model, idItem } = req.params;
            
            if (!this.checkPermission(req, res, 'delete_model_item')) return;
            if (!this.checkModelPermission(req, res, model, 'delete_item')) return;
            if (!this.checkModelItemPermission(req, res, model, idItem, 'delete_item')) return;
            
            const data = await this.adminService.getModelItem(req, model, idItem);
            if (!data || !data.item || !data.item.$pk) {
                return res.status(404).json({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            await this.adminService.deleteObject(req, model, idItem);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting model item:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getIdByUniqueField(req: Request, res: Response) {
        try {
            const { model } = req.params;
            const { field, value } = req.query as { field: string, value: string };
            
            if (!this.checkPermission(req, res, 'view_model_item')) return;
            if (!this.checkModelPermission(req, res, model, 'view_item')) return;
            
            const id = await this.adminService.getModelItemIdByUniqueField(model, field, value);
            res.json({ id });
        } catch (error) {
            console.error('Error getting model item ID by unique field:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

/**
 * Create admin router for Express application
 * @param prisma PrismaService instance
 * @param adminServiceFactory Optional factory function to create custom admin service
 * @returns Express Router instance
 */
export function createAdminRouter(
    prisma: PrismaService,
    adminServiceFactory?: (prisma: PrismaService) => BaseAdminService
): Router {
    const adminRouter = new AdminRouter(prisma, adminServiceFactory);
    return adminRouter.router;
}
