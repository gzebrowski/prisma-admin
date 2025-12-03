import { Injectable } from '@nestjs/common';
import {
    AdminService as AdminLogicService,
    ExistingFormData, 
    NewFormData,
    AdminDefinitionMap,
    InlineFileDataType,
    restructureFileData
} from '../../core/src';
import { PrismaService } from './prisma.service';

@Injectable()
export class BaseAdminService {
    private adminLogicService: AdminLogicService;
    constructor(private prisma: PrismaService) {
        const adminDefinitions: AdminDefinitionMap = this.getAdminDefinitions();
        this.adminLogicService = new AdminLogicService(this.prisma, adminDefinitions);
    }

    checkPermissions(req: Request, user: any, action: string) {
        // Implement permission checks based on your application's requirements
        // if (!user || !user.isAdmin) {
        //     throw new ForbiddenException('You do not have permission to perform this action.');
        // }
        return true;
    }
    checkModelPermissions(req: Request, user: any, model: string, action: string) {
        // Implement permission checks based on your application's requirements
        // if (!user || !user.isAdmin) {
        //     throw new ForbiddenException('You do not have permission to perform this action on this model.');
        // }
        return true;
    }
    checkModelItemPermissions(req: Request, user: any, model: string, pk: string, action: string) {
        // Implement permission checks based on your application's requirements
        // if (!user || !user.isAdmin) {
        //     throw new ForbiddenException('You do not have permission to perform this action on this model.');
        // }
        return true;
    }
    getAdminDefinitions(): any { // TODO FIXME AdminDefinitionMap
        throw new Error('Method not implemented.');
    }

    getModels(): Record<string, string> {
        return this.adminLogicService.getModels();
    }

    async getModelItems(req: Request, model: string, page: number, filters: Record<string, any> = {}): Promise<any> {
        // This method should interact with the BaseAdminModel to fetch items
        // For simplicity, we will just return a mock response here
        const result = await this.adminLogicService.getModelItems(req, model, page, filters);
        const imageOrFileFields = result.fieldsAndTypes.filter((field => ['image', 'file'].includes(field.data_type))).map(field => field.column_name);
        const imageFields = result.fieldsAndTypes.filter((field => field.data_type === 'image')).map(field => field.column_name);
        // check if any of the fields are present in result.listDisplayFields
        const hasImageOrFileFields = result.listDisplayFields.some((field: string) => imageOrFileFields.includes(field));
        if (hasImageOrFileFields) {
            // iterate over result.items and for each item, for each imageOrFileField, if present, then call getFileUrl and set the field value to the returned url
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

    async processFile(model: string, file: File, id?: string | number | null): Promise<string | null> {
        // Implement your file processing logic here
        // For example, upload the file to cloud storage and return the file URL or path
        // return 'path/to/uploaded/file.ext';
        return null;
    }

    async processThumbnail(model: string, filePath: string, id?: string | number | null): Promise<string | null> {
        // Implement your file processing logic here
        // For example, upload the file to cloud storage and return the file URL or path
        // return 'path/to/uploaded/file.ext';
        return null;
    }
    
    async getFileUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        // Implement your logic to generate a file URL based on the file key, model, and item ID
        // For example, if using cloud storage, generate a signed URL
        return null;
    }
    async getThumbnailUrl(fileKey: string, model: string, idItem?: string | number | null): Promise<string | null> {
        // Implement your logic to generate a thumbnail URL based on the file key, model, and item ID
        // For example, if using cloud storage, generate a signed URL for the thumbnail
        return null;
    }
    async deleteFile(fileKey: string): Promise<void> {
        // Implement your file deletion logic here
        // For example, delete the file from cloud storage
    }

    async performAction(req: Request, user: any, model: string, action: string, ids: string[]) {
        try {
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                throw new Error('Invalid or empty ids array');
            }
            return await this.adminLogicService.performAction(req, user, model, action, ids);
        } catch (error) {
            console.error('Error performing action:', error);
            throw error;
        }
    }
    async getModelItem(req: Request, model: string, idItem: string, params: Record<string, any> = {}): Promise<any> {
        // This method should interact with the BaseAdminModel to fetch items
        // For simplicity, we will just return a mock response here
        const result = await this.adminLogicService.getModelItem(req, model, idItem, params);
        const imageOrFileFields = result.fieldsAndTypes.filter((field => ['image', 'file'].includes(field.data_type))).map(field => field.column_name);
        const imageFields = result.fieldsAndTypes.filter((field => field.data_type === 'image')).map(field => field.column_name);
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

    async processFilesData(filesData: Record<string, File> | null, idItem: string | number | null, model: string): Promise<Record<string, string | null>> {
        const processedData: Record<string, string | null> = {};
        if (filesData) {
            const fieldAndTypes = await this.adminLogicService.getModelFieldsAndTypes(model);
            const fieldToTypeMap: Record<string, string> = {};
            fieldAndTypes.forEach(field => {
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

    

    async updateModelItem(req: Request, model: string, idItem: string, itemData: Record<string, any> | null, filesData?: Record<string, File> | null) {
        if (filesData) {
            const processedFilesData = await this.processFilesData(filesData, idItem, model);
            itemData = {
                ...itemData,
                ...processedFilesData,
            };
        }
        try {
            return await this.adminLogicService.updateModelItem(req, model, idItem, itemData, filesData);
        } catch (error) {
            console.error('Error updating model item:', error);
            throw error;
        }
    }
    async processInlineFile(fieldName: string, model: string, file: File, idItem?: string | number | null): Promise<string | null> {
        const fieldAndTypes = await this.adminLogicService.getModelFieldsAndTypes(model);
        const imageFields = fieldAndTypes.filter((field => field.data_type === 'image')).map(field => field.column_name);
        const key = await this.processFile(model, file, idItem);
        if (imageFields.includes(fieldName) && key) {
            await this.processThumbnail(model, key, idItem);
        }
        return key;
    }
    async saveInlines(
        req: Request,
        model: string,
        idItem: string,
        existingItems: Record<string, ExistingFormData[]>,
        newItems: Record<string, NewFormData[]>,
        filesData?: InlineFileDataType | null,
    ) {
        const dt = await restructureFileData(existingItems, newItems, filesData, this.processInlineFile.bind(this));
        try {
            return await this.adminLogicService.saveInlines(req, model, idItem, dt.existingItems, dt.newItems, filesData);
        } catch (error) {
            console.error('Error saving inlines:', error);
            throw error;
        }
    }
    async createModelItem(req: Request, model: string, data: Record<string, any> | null, filesData?: Record<string, File> | null) {
        if (filesData) {
            const processedFilesData = await this.processFilesData(filesData, null, model);
            data = {
                ...data,
                ...processedFilesData,
            };
        }

        try {
            return await this.adminLogicService.createModelItem(req, model, data, filesData);
        } catch (error) {
            console.error('Error creating model item:', error);
            throw error;
        }
    }
    async getModelMetadata(req: Request, model: string, params: Record<string, any> = {}): Promise<any> {
        // This method should interact with the BaseAdminModel to fetch metadata
        // For simplicity, we will just return a mock response here
        return await this.adminLogicService.getModelMetadata(req, model, params);
    }
    async getAutocompleteItems(req: Request, model: string, targetModel: string, keyField: string, query: string, depData: Record<string, any>) {
        // This method should interact with the BaseAdminModel to fetch metadata
        // For simplicity, we will just return a mock response here
        return await this.adminLogicService.getAutocompleteItems(req, model, targetModel, keyField, query, depData);
    }
    async deleteObject(req: Request, model: string, idItem: string) {
        const fieldAndTypes = await this.adminLogicService.getModelFieldsAndTypes(model);
        const fileFields = fieldAndTypes.filter(fld => ['image', 'file'].includes(fld.data_type) ).map(fld => fld.column_name);
        if (fileFields.length > 0) {
            // Fetch the item to get file paths
            const itemResult = await this.adminLogicService.getModelItem(req, model, idItem);
            const item = itemResult.item;
            for (const field of fileFields) {
                if (item[field]) {
                    // Delete the file from storage
                    this.deleteFile(item[field]).catch(err => {
                        console.error(`Failed to delete file for field ${field}:`, err);
                    });
                }
            }
        }
        try {
            return await this.adminLogicService.deleteObject(req, model, idItem);
        } catch (error) {
            console.error('Error deleting object:', error);
            throw error;
        }
    }
    async getModelItemIdByUniqueField(model: string, field: string, value: string) {
        try {
            return await this.adminLogicService.getModelItemIdByUniqueField(model, field, value);
        } catch (error) {
            console.error('Error getting model item ID by unique field:', error);
            throw error;
        }
    }
}