import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { BaseAdminService } from './admin.service';
import { PrismaService } from './prisma.service';
import {
    ValidationError,
    ApiResponseError,
    CommonPostResult,
    InlineFileDataType,
    FilesMapFormat,
    InlineItemsData,
    reformatInlineFilesData,
} from '../../core/src';

export interface AdminPluginOptions {
    prisma: PrismaService;
    adminServiceFactory?: (prisma: PrismaService) => BaseAdminService;
    prefix?: string;
}

/**
 * Fastify plugin for Prisma Admin
 */
export const adminPlugin: FastifyPluginAsync<AdminPluginOptions> = async (
    fastify: FastifyInstance,
    options: AdminPluginOptions
) => {
    const { prisma, adminServiceFactory, prefix = '/admin' } = options;
    const adminService = adminServiceFactory ? adminServiceFactory(prisma) : new BaseAdminService(prisma);

    // Helper functions
    const getPostResult = (req: FastifyRequest, data: any, error?: any): CommonPostResult => {
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
    };

    const checkPermission = (req: FastifyRequest, reply: FastifyReply, action: string): boolean => {
        if (!adminService.checkPermissions(req, (req as any).user, action)) {
            reply.code(403).send({ error: `You do not have permission to ${action}.` });
            return false;
        }
        return true;
    };

    const checkModelPermission = (req: FastifyRequest, reply: FastifyReply, model: string, action: string): boolean => {
        if (!adminService.checkModelPermissions(req, (req as any).user, model, action)) {
            reply.code(403).send({ error: `You do not have permission to ${action} for model ${model}.` });
            return false;
        }
        return true;
    };

    const checkModelItemPermission = (req: FastifyRequest, reply: FastifyReply, model: string, idItem: string, action: string): boolean => {
        if (!adminService.checkModelItemPermissions(req, (req as any).user, model, idItem, action)) {
            reply.code(403).send({ error: `You do not have permission to ${action} item ${idItem} for model ${model}.` });
            return false;
        }
        return true;
    };

    // Parse multipart files helper
    const parseMultipartFiles = async (req: FastifyRequest): Promise<{
        data?: any;
        filesMap?: any;
        files?: MultipartFile[];
    }> => {
        const parts = req.parts();
        let data: any;
        let filesMap: any;
        const files: MultipartFile[] = [];

        for await (const part of parts) {
            if (part.type === 'file') {
                files.push(part as MultipartFile);
            } else if (part.fieldname === '__data') {
                data = JSON.parse(part.value as string);
            } else if (part.fieldname === '__files') {
                filesMap = JSON.parse(part.value as string);
            }
        }

        return { data, filesMap, files };
    };

    // Routes
    fastify.get(`${prefix}/models`, async (req, reply) => {
        if (!checkPermission(req, reply, 'view_models')) return;
        return adminService.getModels();
    });

    fastify.get<{ Params: { model: string }; Querystring: Record<string, any> }>(
        `${prefix}/models/:model`,
        async (req, reply) => {
            const { model } = req.params;
            const params = req.query;
            
            if (!checkPermission(req, reply, 'view_model_metadata')) return;
            if (!checkModelPermission(req, reply, model, 'view_metadata')) return;
            
            return await adminService.getModelMetadata(req, model, params);
        }
    );

    fastify.get<{ Params: { model: string }; Querystring: Record<string, any> }>(
        `${prefix}/items/:model`,
        async (req, reply) => {
            const { model } = req.params;
            const filters = req.query;
            
            if (!checkPermission(req, reply, 'view_model_items')) return;
            if (!checkModelPermission(req, reply, model, 'view_items')) return;
            
            const page = Math.max(0, parseInt((filters.p as string) || '0', 10));
            delete filters.p;
            
            return await adminService.getModelItems(req, model, page, filters);
        }
    );

    fastify.post<{ Params: { model: string; action: string }; Body: { ids: string[] } }>(
        `${prefix}/items/:model/actions/:action`,
        async (req, reply) => {
            const { model, action } = req.params;
            const { ids } = req.body;
            
            try {
                if (!ids || !Array.isArray(ids) || ids.length === 0) {
                    return getPostResult(req, null, new Error('Invalid or empty ids array'));
                }
                
                const result = await adminService.performAction(req, (req as any).user, model, action, ids);
                return getPostResult(req, result);
            } catch (error) {
                return getPostResult(req, null, error);
            }
        }
    );

    fastify.get<{ Params: { model: string; idItem: string }; Querystring: Record<string, any> }>(
        `${prefix}/items/:model/:idItem`,
        async (req, reply) => {
            const { model, idItem } = req.params;
            const params = req.query;
            
            if (!checkPermission(req, reply, 'view_model_item')) return;
            if (!checkModelPermission(req, reply, model, 'view_item')) return;
            if (!checkModelItemPermission(req, reply, model, idItem, 'view_item')) return;
            
            return await adminService.getModelItem(req, model, idItem, params);
        }
    );

    fastify.post<{ Params: { model: string } }>(
        `${prefix}/items-with-files/:model`,
        async (req, reply) => {
            try {
                const { model } = req.params;
                const { data, filesMap, files } = await parseMultipartFiles(req);
                const filesData: Record<string, MultipartFile> = {};
                
                if (files && filesMap) {
                    Object.keys(filesMap).forEach(key => {
                        const index = filesMap[key];
                        filesData[key] = files[index];
                    });
                }
                
                if (!checkPermission(req, reply, 'create_model_item')) return;
                if (!checkModelPermission(req, reply, model, 'create_item')) return;
                
                const result = await adminService.createModelItem(req, model, data, filesData);
                return getPostResult(req, result);
            } catch (error) {
                return getPostResult(req, null, error);
            }
        }
    );

    fastify.post<{ Params: { model: string }; Body: Record<string, any> }>(
        `${prefix}/items/:model`,
        async (req, reply) => {
            try {
                const { model } = req.params;
                const itemData = req.body;
                
                if (!checkPermission(req, reply, 'create_model_item')) return;
                if (!checkModelPermission(req, reply, model, 'create_item')) return;
                
                const result = await adminService.createModelItem(req, model, itemData);
                return getPostResult(req, result);
            } catch (error) {
                return getPostResult(req, null, error);
            }
        }
    );

    fastify.put<{ Params: { model: string; idItem: string } }>(
        `${prefix}/items-with-files/:model/:idItem`,
        async (req, reply) => {
            try {
                const { model, idItem } = req.params;
                const { data, filesMap, files } = await parseMultipartFiles(req);
                const filesData: Record<string, MultipartFile> = {};
                
                if (files && filesMap) {
                    Object.keys(filesMap).forEach(key => {
                        const index = filesMap[key];
                        filesData[key] = files[index];
                    });
                }
                
                if (!checkPermission(req, reply, 'update_model_item')) return;
                if (!checkModelPermission(req, reply, model, 'update_item')) return;
                if (!checkModelItemPermission(req, reply, model, idItem, 'update_item')) return;
                
                const item = await adminService.getModelItem(req, model, idItem);
                if (!item || !item.item || !item.item.$pk) {
                    reply.code(404).send({ error: `Item with id ${idItem} not found in model ${model}` });
                    return;
                }
                
                const result = await adminService.updateModelItem(req, model, idItem, data, filesData);
                return getPostResult(req, result);
            } catch (error) {
                return getPostResult(req, null, error);
            }
        }
    );

    fastify.put<{ Params: { model: string; idItem: string }; Body: Record<string, any> }>(
        `${prefix}/items/:model/:idItem`,
        async (req, reply) => {
            try {
                const { model, idItem } = req.params;
                const itemData = req.body;
                
                if (!checkPermission(req, reply, 'update_model_item')) return;
                if (!checkModelPermission(req, reply, model, 'update_item')) return;
                if (!checkModelItemPermission(req, reply, model, idItem, 'update_item')) return;
                
                const item = await adminService.getModelItem(req, model, idItem);
                if (!item || !item.item || !item.item.$pk) {
                    reply.code(404).send({ error: `Item with id ${idItem} not found in model ${model}` });
                    return;
                }
                
                const result = await adminService.updateModelItem(req, model, idItem, itemData);
                return getPostResult(req, result);
            } catch (error) {
                return getPostResult(req, null, error);
            }
        }
    );

    fastify.put<{ Params: { model: string; idItem: string } }>(
        `${prefix}/inlines-with-files/:model/:idItem`,
        async (req, reply) => {
            try {
                const { model, idItem } = req.params;
                const { data, filesMap, files } = await parseMultipartFiles(req);
                const inlineData = data as InlineItemsData;
                const filesData: InlineFileDataType = reformatInlineFilesData(inlineData, filesMap as FilesMapFormat, files as any);
                
                if (!checkPermission(req, reply, 'update_model_item')) return;
                if (!checkModelPermission(req, reply, model, 'update_item')) return;
                if (!checkModelItemPermission(req, reply, model, idItem, 'update_item')) return;
                
                const item = await adminService.getModelItem(req, model, idItem);
                if (!item || !item.item || !item.item.$pk) {
                    reply.code(404).send({ error: `Item with id ${idItem} not found in model ${model}` });
                    return;
                }
                
                const result = await adminService.saveInlines(req, model, idItem, inlineData.existingItems, inlineData.newItems, filesData);
                return getPostResult(req, result);
            } catch (error) {
                return getPostResult(req, null, error);
            }
        }
    );

    fastify.put<{ Params: { model: string; idItem: string }; Body: { existingItems: Record<string, any>; newItems: Record<string, any> } }>(
        `${prefix}/inlines/:model/:idItem`,
        async (req, reply) => {
            try {
                const { model, idItem } = req.params;
                const { existingItems, newItems } = req.body;
                
                if (!checkPermission(req, reply, 'update_model_item')) return;
                if (!checkModelPermission(req, reply, model, 'update_item')) return;
                if (!checkModelItemPermission(req, reply, model, idItem, 'update_item')) return;
                
                const item = await adminService.getModelItem(req, model, idItem);
                if (!item || !item.item || !item.item.$pk) {
                    reply.code(404).send({ error: `Item with id ${idItem} not found in model ${model}` });
                    return;
                }
                
                const result = await adminService.saveInlines(req, model, idItem, existingItems, newItems);
                return getPostResult(req, result);
            } catch (error) {
                return getPostResult(req, null, error);
            }
        }
    );

    fastify.post<{ Params: { model: string; idItem: string } }>(
        `${prefix}/items/:model/:idItem/delete`,
        async (req, reply) => {
            const { model, idItem } = req.params;
            
            if (!checkPermission(req, reply, 'delete_model_item')) return;
            if (!checkModelPermission(req, reply, model, 'delete_item')) return;
            if (!checkModelItemPermission(req, reply, model, idItem, 'delete_item')) return;
            
            const data = await adminService.getModelItems(req, model, 0, { id: idItem });
            if (data.items.length === 0) {
                reply.code(404).send({ error: `Item with id ${idItem} not found in model ${model}` });
                return;
            }
            
            await adminService.deleteObject(req, model, idItem);
            return { success: true };
        }
    );

    fastify.post<{ Params: { model: string }; Body: { targetModel: string; depData: Record<string, any>; keyField: string; query: string } }>(
        `${prefix}/autocomplete/:model`,
        async (req, reply) => {
            const { model } = req.params;
            const { targetModel, depData, keyField, query } = req.body;
            
            if (!checkPermission(req, reply, 'autocomplete_model_item')) return;
            if (!checkModelPermission(req, reply, model, 'autocomplete_items')) return;
            
            return await adminService.getAutocompleteItems(req, model, targetModel, keyField, query, depData);
        }
    );

    fastify.delete<{ Params: { model: string; idItem: string } }>(
        `${prefix}/items/:model/:idItem`,
        async (req, reply) => {
            const { model, idItem } = req.params;
            
            if (!checkPermission(req, reply, 'delete_model_item')) return;
            if (!checkModelPermission(req, reply, model, 'delete_item')) return;
            if (!checkModelItemPermission(req, reply, model, idItem, 'delete_item')) return;
            
            const item = await adminService.getModelItem(req, model, idItem);
            if (!item || !item.item || !item.item.$pk) {
                reply.code(404).send({ error: `Item with id ${idItem} not found in model ${model}` });
                return;
            }
            
            await adminService.deleteObject(req, model, idItem);
            return { success: true };
        }
    );

    fastify.get<{ Params: { model: string }; Querystring: { field: string; value: string } }>(
        `${prefix}/get-id-by-unique/:model`,
        async (req, reply) => {
            const { model } = req.params;
            const { field, value } = req.query;
            
            if (!checkPermission(req, reply, 'view_model_item')) return;
            if (!checkModelPermission(req, reply, model, 'view_item')) return;
            
            const id = await adminService.getModelItemIdByUniqueField(model, field, value);
            return { id };
        }
    );
};

export default adminPlugin;
