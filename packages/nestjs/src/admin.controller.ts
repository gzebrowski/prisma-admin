import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    Put,
    Request,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { BaseAdminService } from './admin.service';
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
import { PrismaService } from './prisma.service';
// import { NotFoundException } from "@nestjs/common/exceptions/not-found.exception";
import { ForbiddenException } from "@nestjs/common/exceptions/forbidden.exception";


@Controller('admin')
export class BaseAdminController<T extends BaseAdminService = BaseAdminService> {
	private adminService: T;
    constructor(private readonly prisma: PrismaService) {
        this.adminService = this.getAdminServiceInstance(this.prisma);
    }

	getAdminServiceInstance(prisma: PrismaService): T {
        throw new Error('Method not implemented.');
    }

    getPostResult(@Request() req: any, data: any, error?: any): CommonPostResult {
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

    @Get('models')
	getModels(@Request() req: any) {
		if (!this.adminService.checkPermissions(req, req.user, 'view_models')) {
            throw new ForbiddenException('You do not have permission to view models.');
        }
        return this.adminService.getModels();
	}

    @Get('models/:model')
  getModelMetadata(@Request() req: any, @Param('model') model: string, @Query() params: Record<string, any> = {}) {
        if (!this.adminService.checkPermissions(req, req.user, 'view_model_metadata')) {
            throw new ForbiddenException('You do not have permission to view model metadata.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'view_metadata')) {
            throw new ForbiddenException(`You do not have permission to view metadata for model ${model}.`);
        }
        return this.adminService.getModelMetadata(req, model, params);
	}

    @Get('items/:model')
    async getModelItems(@Request() req: any, @Param('model') model: string, @Query() filters: Record<string, any> = {}): Promise<GetModelItemsType> {
        if (!this.adminService.checkPermissions(req, req.user, 'view_model_items')) {
            throw new ForbiddenException('You do not have permission to view model items.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'view_items')) {
            throw new ForbiddenException(`You do not have permission to view items for model ${model}.`);
        }

        try {
            const page = Math.max(0, parseInt(filters.p, 10) || 0);
            delete filters.p;
            const data = await this.adminService.getModelItems(req, model, page, filters);
            return data;
        }
        catch (error) {
            console.error('Error fetching model items:', error);
            throw error;
        }
    }

    @Post('items/:model/actions/:action')
    async performAction(
        @Request() req: any,
        @Param('model') model: string,
        @Param('action') action: string,
        @Body('ids') ids: string[]
    ) {
        const user = req.user;
        try {
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                throw new Error('Invalid or empty ids array');
            }
            const result = await this.adminService.performAction(req, user, model, action, ids);
            return this.getPostResult(req, result);
        } catch (error) {
            console.error('Error performing action:', error);
            return this.getPostResult(req, null, error);
        }
    }

    @Get('items/:model/:idItem')
    async getModelItem(@Request() req: any, @Param('model') model: string, @Param('idItem') idItem: string, @Query() params: Record<string, any> = {}) {
        if (!this.adminService.checkPermissions(req, req.user, 'view_model_item')) {
            throw new ForbiddenException('You do not have permission to view model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'view_item')) {
            throw new ForbiddenException(`You do not have permission to view items for model ${model}.`);
        }
        if (!this.adminService.checkModelItemPermissions(req, req.user, model, idItem, 'view_item')) {
            throw new ForbiddenException(`You do not have permission to view item ${idItem} for model ${model}.`);
        }

        try {
            const data = await this.adminService.getModelItem(req, model, idItem, params);
            return data;
        } catch (error) {
            console.error('Error fetching model item:', error);
            throw error;
        }
    }
    @Post('items-with-files/:model')
    @UseInterceptors(FilesInterceptor('files[]'))
    async createModelItemWithFiles(
        @Request() req: any,
        @Param('model') model: string,
        @Body() itemData: Record<string, any>,
        @UploadedFiles() files?: any[],
    ) {
        const data = JSON.parse(itemData.__data);
        const filesMap = JSON.parse(itemData.__files);
        const filesData = {} as Record<string, File>;
        if (files) {
            Object.keys(filesMap).forEach(key => {
                const index = filesMap[key];
                filesData[key] = files[index];
            });
        }
        return await this.createModelItemFn(req, model, data, filesData);
    }

    @Post('items/:model')
    async createModelItem(@Request() req: any, @Param('model') model: string, @Body() itemData: Record<string, any>) {
        return await this.createModelItemFn(req, model, itemData);
    }
    async createModelItemFn(req: any, model: string, itemData: Record<string, any> | null, filesData?: Record<string, File> | null) {
        if (!this.adminService.checkPermissions(req, req.user, 'create_model_item')) {
            throw new ForbiddenException('You do not have permission to create model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'create_item')) {
            throw new ForbiddenException(`You do not have permission to create item for model ${model}.`);
        }
        
        try {
            const data = await this.adminService.createModelItem(req, model, itemData, filesData);
            return this.getPostResult(req, data);
        } catch (error) {
            console.error('Error creating model item:', error);
            return this.getPostResult(req, null, error);
        }
    }


    @Put('items-with-files/:model/:idItem')
    @UseInterceptors(FilesInterceptor('files[]'))
    async updateModelItemWithFiles(
        @Request() req: any,
        @Param('model') model: string,
        @Param('idItem') idItem: string,
        @Body() itemData: Record<string, any>,
        @UploadedFiles() files?: File[],
    ) {
        const data = JSON.parse(itemData.__data);
        const filesData = {} as Record<string, File>;
        const filesMap = JSON.parse(itemData.__files);
        if (files) {
            Object.keys(filesMap).forEach(key => {
                const index = filesMap[key];
                filesData[key] = files[index];
            });
        }
        return await this.updateModelItemFn(req, model, idItem, data, filesData);
    }

    @Put('items/:model/:idItem')
    async updateModelItem(
        @Request() req: any,
        @Param('model') model: string,
        @Param('idItem') idItem: string,
        @Body() itemData: Record<string, any>,
    ) {
        return await this.updateModelItemFn(req, model, idItem, itemData);
    }

    async updateModelItemFn(req: any, model: string, idItem: string, itemData: Record<string, any> | null, filesData?: Record<string, File> | null) {
        if (!this.adminService.checkPermissions(req, req.user, 'update_model_item')) {
            throw new ForbiddenException('You do not have permission to update model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'update_item')) {
            throw new ForbiddenException(`You do not have permission to update item for model ${model}.`);
        }
        if (!this.adminService.checkModelItemPermissions(req, req.user, model, idItem, 'update_item')) {
            throw new ForbiddenException(`You do not have permission to update item ${idItem} for model ${model}.`);
        }

        try {
            const data = await this.adminService.getModelItem(req, model, idItem);
            if (!data || !data.item || !data.item.$pk) {
                throw new Error(`Item with id ${idItem} not found in model ${model}`);
            }
            // Assuming the modelInstance has a method to update an item
            const updatedItem = await this.adminService.updateModelItem(req, model, idItem, itemData, filesData);
            return this.getPostResult(req, updatedItem);
        } catch (error) {
            console.error('Error updating model item:', error);
            return this.getPostResult(req, null, error);
        }
    }


    @Put('inlines-with-files/:model/:idItem')
    @UseInterceptors(FilesInterceptor('files[]'))
    async saveInlinesWithFiles(
        @Request() req: any,
        @Param('model') model: string,
        @Param('idItem') idItem: string,
        @Body() inlineData: Record<'__data' | '__files', string>,
        @UploadedFiles() files?: File[],
    ) {
        const data = JSON.parse(inlineData.__data) as InlineItemsData;
        // type FilesMapFormat = Record<string, // modelName
        //     Record<
        //         'existingItems' | 'newItems',
        //         Record<number, // existingItems|newItems array index
        //             Record<string, number> // fieldName to index in files array
        //             >
        //         >
        //     >
        const filesMap = JSON.parse(inlineData.__files) as FilesMapFormat;

        
        // type InlineFileDataType = Record<string, // modelName
        //                                  Record<'newItems' | 'existingItems',
        //                                         Record<number, // index in newItems|existingItems array
        //                                                Record<string, // fieldName
        //                                                       File>> // File object
        // >
        
        const filesData: InlineFileDataType = reformatInlineFilesData(data, filesMap, files);
        return await this.commonSaveInlines(req, model, idItem, data.existingItems, data.newItems, filesData);
    }


    @Put('inlines/:model/:idItem')
    async saveInlines(
        @Request() req: any,
        @Param('model') model: string,
        @Param('idItem') idItem: string,
        @Body() {existingItems, newItems}: {existingItems: Record<string, any>, newItems: Record<string, any>}
    ) {
        return await this.commonSaveInlines(req, model, idItem, existingItems, newItems);
    }
    
    async commonSaveInlines(req: any, model: string, idItem: string, existingItems: Record<string, any>, newItems: Record<string, any>, filesData?: InlineFileDataType | null) {
        
        if (!this.adminService.checkPermissions(req, req.user, 'update_model_item')) {
            throw new ForbiddenException('You do not have permission to update model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'update_item')) {
            throw new ForbiddenException(`You do not have permission to update item for model ${model}.`);
        }
        if (!this.adminService.checkModelItemPermissions(req, req.user, model, idItem, 'update_item')) {
            throw new ForbiddenException(`You do not have permission to update item ${idItem} for model ${model}.`);
        }
        try {
            const data = await this.adminService.getModelItem(req, model, idItem);
            if (!data || !data.item || !data.item.$pk) {
                throw new Error(`Item with id ${idItem} not found in model ${model}`);
            }
            // Assuming the modelInstance has a method to update an item
            const updatedItem = await this.adminService.saveInlines(req, model, idItem, existingItems, newItems, filesData);
            return this.getPostResult(req, updatedItem);
        } catch (error) {
            console.error('Error updating model item:', error);
            return this.getPostResult(req, null, error);
        }
    }

    @Post('items/:model/:idItem/delete')
    async deleteModelItem(@Request() req: any, @Param('model') model: string, @Param('idItem') idItem: string) {
        
        if (!this.adminService.checkPermissions(req, req.user, 'delete_model_item')) {
            throw new ForbiddenException('You do not have permission to delete model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'delete_item')) {
            throw new ForbiddenException(`You do not have permission to delete item for model ${model}.`);
        }
        if (!this.adminService.checkModelItemPermissions(req, req.user, model, idItem, 'delete_item')) {
            throw new ForbiddenException(`You do not have permission to delete item ${idItem} for model ${model}.`);
        }

        try {
            const data = await this.adminService.getModelItems(req, model, 0, { id: idItem });
            if (data.items.length === 0) {
                throw new Error(`Item with id ${idItem} not found in model ${model}`);
            }
            const modelInstance = data.items[0];
            // Assuming the modelInstance has a method to delete an item
            await modelInstance.delete(idItem);
            return { success: true };
        } catch (error) {
            console.error('Error deleting model item:', error);
            throw error;
        }
    }

    @Post('autocomplete/:model')
    async getAutocompleteOptions(
        @Request() req: any,
        @Param('model') model: string,
        @Body() { targetModel, depData, keyField, query }: { targetModel: string, depData: Record<string, any>, keyField: string, query: string }
    ) {
        
        if (!this.adminService.checkPermissions(req, req.user, 'autocomplete_model_item')) {
            throw new ForbiddenException('You do not have permission to autocomplete model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'autocomplete_items')) {
            throw new ForbiddenException(`You do not have permission to autocomplete items for model ${model}.`);
        }
        try {
            const data = await this.adminService.getAutocompleteItems(req, model, targetModel, keyField, query, depData);
            return data;
        } catch (error) {
            console.error('Error deleting model item:', error);
            throw error;
        }
    }
    @Delete('items/:model/:idItem')
    async deleteObject(@Request() req: any, @Param('model') model: string, @Param('idItem') idItem: string) {
        if (!this.adminService.checkPermissions(req, req.user, 'delete_model_item')) {
            throw new ForbiddenException('You do not have permission to delete model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'delete_item')) {
            throw new ForbiddenException(`You do not have permission to delete item for model ${model}.`);
        }
        if (!this.adminService.checkModelItemPermissions(req, req.user, model, idItem, 'delete_item')) {
            throw new ForbiddenException(`You do not have permission to delete item ${idItem} for model ${model}.`);
        }
        try {
            const data = await this.adminService.getModelItem(req, model, idItem);
            if (!data || !data.item || !data.item.$pk) {
                throw new Error(`Item with id ${idItem} not found in model ${model}`);
            }
            await this.adminService.deleteObject(req, model, idItem);
            return { success: true };
        } catch (error) {
            console.error('Error deleting model item:', error);
            throw error;
        }
    }
    @Get('get-id-by-unique/:model')
    async getIdByUniqueField(@Request() req: any, @Param('model') model: string, @Query() query: { field: string, value: string }) {
        if (!this.adminService.checkPermissions(req, req.user, 'view_model_item')) {
            throw new ForbiddenException('You do not have permission to view model item.');
        }
        if (!this.adminService.checkModelPermissions(req, req.user, model, 'view_item')) {
            throw new ForbiddenException(`You do not have permission to view items for model ${model}.`);
        }

        try {
            const id = await this.adminService.getModelItemIdByUniqueField(model, query.field, query.value);
            return { id };
        } catch (error) {
            console.error('Error getting model item ID by unique field:', error);
            throw error;
        }
    }

}
