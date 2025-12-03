import {
    AdminService as AdminLogicService,
    ExistingFormData, 
    NewFormData,
    AdminDefinitionMap,
    InlineFileDataType,
    restructureFileData
} from '../../core/src/index.js';
import { PrismaService } from './prisma.service.js';
import { HttpContext } from '@adonisjs/core/http';
import { MultipartFile } from '@adonisjs/core/bodyparser';

export class BaseAdminService {
    private adminLogicService: AdminLogicService;
    
    constructor(protected prisma: PrismaService) {
        const adminDefinitions: AdminDefinitionMap = this.getAdminDefinitions();
        this.adminLogicService = new AdminLogicService(this.prisma, adminDefinitions);
    }

    checkPermissions(ctx: HttpContext, user: any, action: string): boolean {
        // Implement permission checks based on your application's requirements
        return true;
    }

    checkModelPermissions(ctx: HttpContext, user: any, model: string, action: string): boolean {
        // Implement permission checks based on your application's requirements
        return true;
    }

    checkModelItemPermissions(ctx: HttpContext, user: any, model: string, pk: string, action: string): boolean {
        // Implement permission checks based on your application's requirements
        return true;
    }

    getAdminDefinitions(): AdminDefinitionMap {
        throw new Error('Method not implemented.');
    }

    getModels(): Record<string, string> {
        return this.adminLogicService.getModels();
    }

    async getModelItems(ctx: HttpContext, model: string, page: number, filters: Record<string, any> = {}): Promise<any> {
        const result = await this.adminLogicService.getModelItems(ctx.request as any, model, page, filters);
        const imageOrFileFields = result.fieldsAndTypes.filter((field: any) => ['image', 'file'].includes(field.data_type)).map((field: any) => field.column_name);
        const imageFields = result.fieldsAndTypes.filter((field: any) => field.data_type === 'image').map((field: any) => field.column_name);
        const hasImageOrFileFields = result.listDisplayFields.some((field: string) => imageOrFileFields.includes(field));
        
        if (hasImageOrFileFields) {
            for (const item of result.items) {
                for (const field of imageOrFileFields) {
                    if (item[field]) {
                        const fileUrl = await this.getFileUrl(item[field], model, item['id']);
                        item[`$${field}__url`] = fileUrl;
                        if (imageFields.includes(field)) {
                            const thumbnailUrl = await this.getThumbnailUrl(item[field], model, item['id']);
                            item[`$${field}__thumbnail`] = thumbnailUrl;
                        }
                    }
                }
            }
        }
        return result;
    }

    async processFile(model: string, file: MultipartFile, id?: string | number | null): Promise<string | null> {
        // Implement your file processing logic here
        return null;
    }

    async processThumbnail(model: string, filePath: string, id?: string | number | null): Promise<string | null> {
        // Implement your file processing logic here
        return null;
    }
    
    async getFileUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        // Implement your logic to generate a file URL
        return null;
    }

    async getThumbnailUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        // Implement your logic to generate a thumbnail URL
        return null;
    }

    async deleteFile(fileKey: string): Promise<void> {
        // Implement your file deletion logic here
    }

    async performAction(ctx: HttpContext, user: any, model: string, action: string, ids: string[]) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new Error('Invalid or empty ids array');
        }
        return await this.adminLogicService.performAction(ctx.request as any, user, model, action, ids);
    }

    async getModelItem(ctx: HttpContext, model: string, idItem: string, params: Record<string, any> = {}): Promise<any> {
        const result = await this.adminLogicService.getModelItem(ctx.request as any, model, idItem, params);
        const imageOrFileFields = result.fieldsAndTypes.filter((field: any) => ['image', 'file'].includes(field.data_type)).map((field: any) => field.column_name);
        const imageFields = result.fieldsAndTypes.filter((field: any) => field.data_type === 'image').map((field: any) => field.column_name);
        
        for (const field of imageOrFileFields) {
            if (result.item[field]) {
                const fileUrl = await this.getFileUrl(result.item[field], model, result.item['id']);
                result.item[`$${field}__url`] = fileUrl;
                if (imageFields.includes(field)) {
                    const thumbnailUrl = await this.getThumbnailUrl(result.item[field], model, result.item['id']);
                    result.item[`$${field}__thumbnail`] = thumbnailUrl;
                }
            }
        }
        return result;
    }

    async processFilesData(filesData: Record<string, MultipartFile> | null, idItem: string | number | null, model: string): Promise<Record<string, string | null>> {
        const processedData: Record<string, string | null> = {};
        if (filesData) {
            const fieldAndTypes = await this.adminLogicService.getModelFieldsAndTypes(model);
            const fieldToTypeMap: Record<string, string> = {};
            fieldAndTypes.forEach((field: any) => {
                fieldToTypeMap[field.column_name] = field.data_type;
            });
            for (const fieldName in filesData) {
                const file = filesData[fieldName];
                const filePath = await this.processFile(model, file, idItem);
                if (filePath) {
                    processedData[fieldName] = filePath;
                    if (fieldToTypeMap[fieldName] === 'image') {
                        await this.processThumbnail(model, filePath, idItem);
                    }
                }
            }
        }
        return processedData;
    }

    async updateModelItem(ctx: HttpContext, model: string, idItem: string, itemData: Record<string, any> | null, filesData?: Record<string, MultipartFile> | null) {
        if (filesData) {
            const processedFilesData = await this.processFilesData(filesData, idItem, model);
            itemData = {
                ...itemData,
                ...processedFilesData,
            };
        }
        return await this.adminLogicService.updateModelItem(ctx.request as any, model, idItem, itemData, filesData as any);
    }

    async processInlineFile(fieldName: string, model: string, file: MultipartFile, idItem?: string | number | null): Promise<string | null> {
        const fieldAndTypes = await this.adminLogicService.getModelFieldsAndTypes(model);
        const imageFields = fieldAndTypes.filter((field: any) => field.data_type === 'image').map((field: any) => field.column_name);
        const key = await this.processFile(model, file, idItem);
        if (imageFields.includes(fieldName) && key) {
            await this.processThumbnail(model, key, idItem);
        }
        return key;
    }

    async saveInlines(
        ctx: HttpContext,
        model: string,
        idItem: string,
        existingItems: Record<string, ExistingFormData[]>,
        newItems: Record<string, NewFormData[]>,
        filesData?: InlineFileDataType | null,
    ) {
        const dt = await restructureFileData(existingItems, newItems, filesData, this.processInlineFile.bind(this) as any);
        return await this.adminLogicService.saveInlines(ctx.request as any, model, idItem, dt.existingItems, dt.newItems, filesData);
    }

    async createModelItem(ctx: HttpContext, model: string, data: Record<string, any> | null, filesData?: Record<string, MultipartFile> | null) {
        if (filesData) {
            const processedFilesData = await this.processFilesData(filesData, null, model);
            data = {
                ...data,
                ...processedFilesData,
            };
        }
        return await this.adminLogicService.createModelItem(ctx.request as any, model, data, filesData as any);
    }

    async getModelMetadata(ctx: HttpContext, model: string, params: Record<string, any> = {}): Promise<any> {
        return await this.adminLogicService.getModelMetadata(ctx.request as any, model, params);
    }

    async getAutocompleteItems(ctx: HttpContext, model: string, targetModel: string, keyField: string, query: string, depData: Record<string, any>) {
        return await this.adminLogicService.getAutocompleteItems(ctx.request as any, model, targetModel, keyField, query, depData);
    }

    async deleteObject(ctx: HttpContext, model: string, idItem: string) {
        const fieldAndTypes = await this.adminLogicService.getModelFieldsAndTypes(model);
        const fileFields = fieldAndTypes.filter((fld: any) => ['image', 'file'].includes(fld.data_type)).map((fld: any) => fld.column_name);
        
        if (fileFields.length > 0) {
            const itemResult = await this.adminLogicService.getModelItem(ctx.request as any, model, idItem);
            const item = itemResult.item;
            for (const field of fileFields) {
                if (item[field]) {
                    this.deleteFile(item[field]).catch(err => {
                        console.error(`Failed to delete file for field ${field}:`, err);
                    });
                }
            }
        }
        return await this.adminLogicService.deleteObject(ctx.request as any, model, idItem);
    }

    async getModelItemIdByUniqueField(model: string, field: string, value: string) {
        return await this.adminLogicService.getModelItemIdByUniqueField(model, field, value);
    }
}
