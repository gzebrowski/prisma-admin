import { HttpContext } from '@adonisjs/core/http';
import { BaseAdminService } from './admin.service.js';
import { PrismaService } from './prisma.service.js';
import {
    ValidationError,
    ApiResponseError,
    CommonPostResult,
    InlineFileDataType,
    FilesMapFormat,
    InlineItemsData,
    reformatInlineFilesData,
} from '../../core/src';
import { MultipartFile } from '@adonisjs/core/bodyparser';

export class AdminController {
    protected adminService: BaseAdminService;

    constructor(
        protected prisma: PrismaService,
        adminServiceFactory?: (prisma: PrismaService) => BaseAdminService
    ) {
        this.adminService = adminServiceFactory 
            ? adminServiceFactory(prisma) 
            : new BaseAdminService(prisma);
    }

    protected getPostResult(ctx: HttpContext, data: any, error?: any): CommonPostResult {
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
        }
        return {
            status: 'success',
            message: 'Operation successful',
            errors: null,
            data
        }
    }

    protected checkPermission(ctx: HttpContext, action: string): boolean {
        if (!this.adminService.checkPermissions(ctx, (ctx as any).auth?.user, action)) {
            ctx.response.forbidden({ error: `You do not have permission to ${action}.` });
            return false;
        }
        return true;
    }

    protected checkModelPermission(ctx: HttpContext, model: string, action: string): boolean {
        if (!this.adminService.checkModelPermissions(ctx, (ctx as any).auth?.user, model, action)) {
            ctx.response.forbidden({ error: `You do not have permission to ${action} for model ${model}.` });
            return false;
        }
        return true;
    }

    protected checkModelItemPermission(ctx: HttpContext, model: string, idItem: string, action: string): boolean {
        if (!this.adminService.checkModelItemPermissions(ctx, (ctx as any).auth?.user, model, idItem, action)) {
            ctx.response.forbidden({ error: `You do not have permission to ${action} item ${idItem} for model ${model}.` });
            return false;
        }
        return true;
    }

    async getModels(ctx: HttpContext) {
        if (!this.checkPermission(ctx, 'view_models')) return;
        return this.adminService.getModels();
    }

    async getModelMetadata(ctx: HttpContext) {
        const { model } = ctx.params;
        const params = ctx.request.qs();
        
        if (!this.checkPermission(ctx, 'view_model_metadata')) return;
        if (!this.checkModelPermission(ctx, model, 'view_metadata')) return;
        
        return await this.adminService.getModelMetadata(ctx, model, params);
    }

    async getModelItems(ctx: HttpContext) {
        try {
            const { model } = ctx.params;
            const filters = ctx.request.qs();
            
            if (!this.checkPermission(ctx, 'view_model_items')) return;
            if (!this.checkModelPermission(ctx, model, 'view_items')) return;
            
            const page = Math.max(0, parseInt(filters.p as string, 10) || 0);
            delete filters.p;
            
            return await this.adminService.getModelItems(ctx, model, page, filters);
        } catch (error) {
            console.error('Error fetching model items:', error);
            ctx.response.internalServerError({ error: 'Internal server error' });
        }
    }

    async performAction(ctx: HttpContext) {
        try {
            const { model, action } = ctx.params;
            const { ids } = ctx.request.body();
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return this.getPostResult(ctx, null, new Error('Invalid or empty ids array'));
            }
            
            const result = await this.adminService.performAction(ctx, (ctx as any).auth?.user, model, action, ids);
            return this.getPostResult(ctx, result);
        } catch (error) {
            console.error('Error performing action:', error);
            return this.getPostResult(ctx, null, error);
        }
    }

    async getModelItem(ctx: HttpContext) {
        try {
            const { model, idItem } = ctx.params;
            const params = ctx.request.qs();
            
            if (!this.checkPermission(ctx, 'view_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'view_item')) return;
            if (!this.checkModelItemPermission(ctx, model, idItem, 'view_item')) return;
            
            return await this.adminService.getModelItem(ctx, model, idItem, params);
        } catch (error) {
            console.error('Error fetching model item:', error);
            ctx.response.internalServerError({ error: 'Internal server error' });
        }
    }

    async createModelItemWithFiles(ctx: HttpContext) {
        try {
            const { model } = ctx.params;
            const __data = ctx.request.input('__data');
            const __files = ctx.request.input('__files');
            const data = JSON.parse(__data);
            const filesMap = JSON.parse(__files);
            
            const files = ctx.request.allFiles();
            const filesData: Record<string, MultipartFile> = {};
            
            Object.keys(filesMap).forEach(key => {
                const index = filesMap[key];
                const fileKey = `files[${index}]`;
                if (files[fileKey]) {
                    const file = files[fileKey];
                    filesData[key] = Array.isArray(file) ? file[0] : file;
                }
            });
            
            if (!this.checkPermission(ctx, 'create_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'create_item')) return;
            
            const result = await this.adminService.createModelItem(ctx, model, data, filesData);
            return this.getPostResult(ctx, result);
        } catch (error) {
            console.error('Error creating model item with files:', error);
            return this.getPostResult(ctx, null, error);
        }
    }

    async createModelItem(ctx: HttpContext) {
        try {
            const { model } = ctx.params;
            const itemData = ctx.request.body();
            
            if (!this.checkPermission(ctx, 'create_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'create_item')) return;
            
            const result = await this.adminService.createModelItem(ctx, model, itemData);
            return this.getPostResult(ctx, result);
        } catch (error) {
            console.error('Error creating model item:', error);
            return this.getPostResult(ctx, null, error);
        }
    }

    async updateModelItemWithFiles(ctx: HttpContext) {
        try {
            const { model, idItem } = ctx.params;
            const __data = ctx.request.input('__data');
            const __files = ctx.request.input('__files');
            const data = JSON.parse(__data);
            const filesMap = JSON.parse(__files);
            
            const files = ctx.request.allFiles();
            const filesData: Record<string, MultipartFile> = {};
            
            Object.keys(filesMap).forEach(key => {
                const index = filesMap[key];
                const fileKey = `files[${index}]`;
                if (files[fileKey]) {
                    const file = files[fileKey];
                    filesData[key] = Array.isArray(file) ? file[0] : file;
                }
            });
            
            if (!this.checkPermission(ctx, 'update_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'update_item')) return;
            if (!this.checkModelItemPermission(ctx, model, idItem, 'update_item')) return;
            
            const item = await this.adminService.getModelItem(ctx, model, idItem);
            if (!item || !item.item || !item.item.$pk) {
                return ctx.response.notFound({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            const result = await this.adminService.updateModelItem(ctx, model, idItem, data, filesData);
            return this.getPostResult(ctx, result);
        } catch (error) {
            console.error('Error updating model item with files:', error);
            return this.getPostResult(ctx, null, error);
        }
    }

    async updateModelItem(ctx: HttpContext) {
        try {
            const { model, idItem } = ctx.params;
            const itemData = ctx.request.body();
            
            if (!this.checkPermission(ctx, 'update_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'update_item')) return;
            if (!this.checkModelItemPermission(ctx, model, idItem, 'update_item')) return;
            
            const item = await this.adminService.getModelItem(ctx, model, idItem);
            if (!item || !item.item || !item.item.$pk) {
                return ctx.response.notFound({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            const result = await this.adminService.updateModelItem(ctx, model, idItem, itemData);
            return this.getPostResult(ctx, result);
        } catch (error) {
            console.error('Error updating model item:', error);
            return this.getPostResult(ctx, null, error);
        }
    }

    async saveInlinesWithFiles(ctx: HttpContext) {
        try {
            const { model, idItem } = ctx.params;
            const __data = ctx.request.input('__data');
            const __files = ctx.request.input('__files');
            const inlineData = JSON.parse(__data) as InlineItemsData;
            const filesMap = JSON.parse(__files) as FilesMapFormat;
            
            const files = ctx.request.allFiles();
            const filesList: any[] = [];
            Object.keys(files).forEach(key => {
                filesList.push(files[key]);
            });
            
            const filesData: InlineFileDataType = reformatInlineFilesData(inlineData, filesMap, filesList);
            
            if (!this.checkPermission(ctx, 'update_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'update_item')) return;
            if (!this.checkModelItemPermission(ctx, model, idItem, 'update_item')) return;
            
            const item = await this.adminService.getModelItem(ctx, model, idItem);
            if (!item || !item.item || !item.item.$pk) {
                return ctx.response.notFound({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            const result = await this.adminService.saveInlines(ctx, model, idItem, inlineData.existingItems, inlineData.newItems, filesData);
            return this.getPostResult(ctx, result);
        } catch (error) {
            console.error('Error saving inlines with files:', error);
            return this.getPostResult(ctx, null, error);
        }
    }

    async saveInlines(ctx: HttpContext) {
        try {
            const { model, idItem } = ctx.params;
            const { existingItems, newItems } = ctx.request.body();
            
            if (!this.checkPermission(ctx, 'update_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'update_item')) return;
            if (!this.checkModelItemPermission(ctx, model, idItem, 'update_item')) return;
            
            const item = await this.adminService.getModelItem(ctx, model, idItem);
            if (!item || !item.item || !item.item.$pk) {
                return ctx.response.notFound({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            const result = await this.adminService.saveInlines(ctx, model, idItem, existingItems, newItems);
            return this.getPostResult(ctx, result);
        } catch (error) {
            console.error('Error saving inlines:', error);
            return this.getPostResult(ctx, null, error);
        }
    }

    async deleteModelItemPost(ctx: HttpContext) {
        const { model, idItem } = ctx.params;
        
        if (!this.checkPermission(ctx, 'delete_model_item')) return;
        if (!this.checkModelPermission(ctx, model, 'delete_item')) return;
        if (!this.checkModelItemPermission(ctx, model, idItem, 'delete_item')) return;
        
        const data = await this.adminService.getModelItems(ctx, model, 0, { id: idItem });
        if (data.items.length === 0) {
            return ctx.response.notFound({ error: `Item with id ${idItem} not found in model ${model}` });
        }
        
        await this.adminService.deleteObject(ctx, model, idItem);
        return { success: true };
    }

    async getAutocompleteOptions(ctx: HttpContext) {
        try {
            const { model } = ctx.params;
            const { targetModel, depData, keyField, query } = ctx.request.body();
            
            if (!this.checkPermission(ctx, 'autocomplete_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'autocomplete_items')) return;
            
            return await this.adminService.getAutocompleteItems(ctx, model, targetModel, keyField, query, depData);
        } catch (error) {
            console.error('Error getting autocomplete options:', error);
            ctx.response.internalServerError({ error: 'Internal server error' });
        }
    }

    async deleteObject(ctx: HttpContext) {
        try {
            const { model, idItem } = ctx.params;
            
            if (!this.checkPermission(ctx, 'delete_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'delete_item')) return;
            if (!this.checkModelItemPermission(ctx, model, idItem, 'delete_item')) return;
            
            const item = await this.adminService.getModelItem(ctx, model, idItem);
            if (!item || !item.item || !item.item.$pk) {
                return ctx.response.notFound({ error: `Item with id ${idItem} not found in model ${model}` });
            }
            
            await this.adminService.deleteObject(ctx, model, idItem);
            return { success: true };
        } catch (error) {
            console.error('Error deleting model item:', error);
            ctx.response.internalServerError({ error: 'Internal server error' });
        }
    }

    async getIdByUniqueField(ctx: HttpContext) {
        try {
            const { model } = ctx.params;
            const { field, value } = ctx.request.qs();
            
            if (!this.checkPermission(ctx, 'view_model_item')) return;
            if (!this.checkModelPermission(ctx, model, 'view_item')) return;
            
            const id = await this.adminService.getModelItemIdByUniqueField(model, field, value);
            return { id };
        } catch (error) {
            console.error('Error getting model item ID by unique field:', error);
            ctx.response.internalServerError({ error: 'Internal server error' });
        }
    }
}

/**
 * Create admin controller instance
 * @param prisma PrismaService instance
 * @param adminServiceFactory Optional factory function to create custom admin service
 * @returns AdminController instance
 */
export function createAdminController(
    prisma: PrismaService,
    adminServiceFactory?: (prisma: PrismaService) => BaseAdminService
): AdminController {
    return new AdminController(prisma, adminServiceFactory);
}
