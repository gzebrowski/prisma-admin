import { PrismaClient } from "@prisma/client";
import {
    BaseAdminModel,
    GetActionsType,
    GetOrderingFieldsType,
    GetSearchFieldsType,
    GetListFilterFieldsType,
    GetListDisplayFieldsType,
    FindByIdType,
    FilterItemsType,
    GetPrismaModelFieldsAndTypes,
    GetOneToOneRelationsFromDMMF,
    GetRelationToLabelMapType,
    RelationModelsToAdminInstanceMap,
    FieldRelationConf,
    GetInlineItemsType,

} from "./baseAdmin";
import {
    InlineDefinition,
    NewFormData,
    ExistingFormData,
    FieldDependencies,
    ExtraFieldDefinition,
    FieldDefinition,
    FieldConfig,
    InlineFileDataType,
    NotFoundException,
    ForbiddenException,
    ListViewFilterType,
} from "./models";

// Custom exceptions to avoid NestJS dependencies

export type CommonReturnModelItemType = {
    title?: string;
    pkFieldName: string;
    item: FindByIdType | null;
    fieldsAndTypes: GetPrismaModelFieldsAndTypes;
    filterTypes: Record<string, ListViewFilterType>;
    relations: GetOneToOneRelationsFromDMMF;
    relationToLabelMap?: Record<string, string>;
    readonlyFields: string[];
    fieldToLabelMap: Record<string, any>;
    fieldsConfig: FieldConfig;
    fieldDependencies?: FieldDependencies;
    inlines?: InlineDefinition[];
    inlineItems?: GetInlineItemsType;
    canDeleteItem?: boolean;
    extraFields?: ExtraFieldDefinition[];
};

export class AdminService {
    protected prisma: PrismaClient;
    public modelMap: any;

    constructor(prismaClient: PrismaClient, modelMap: any) {
        this.prisma = prismaClient;
        this.modelMap = modelMap;
    }

    public getModels(): Record<string, string> {
        const models: Record<string, string> = {};
        for (const key in this.modelMap) {
            const itm = this.modelMap[key];
            if (itm.managed || itm.managed === undefined) {
                models[key] = itm.name;
            }
        }
        return models;
    }

    public async getModelFieldsAndTypes(model: string): Promise<GetPrismaModelFieldsAndTypes> {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model.toLowerCase()]?.cls;
        const modelInstance = new (adminModel as any)(this.prisma);
        return modelInstance.updateFilteredFieldAndTypes(await modelInstance.getPrismaModelFieldsAndTypes()) as GetPrismaModelFieldsAndTypes;
    }

    async getSchemaInfo(prisma: PrismaClient, adminModel: BaseAdminModel, modelInstance: any, withFilters: boolean): Promise<{
        fieldsAndTypes: GetPrismaModelFieldsAndTypes,
        filterTypes: Record<string, ListViewFilterType>,
        listFilterFields: GetListFilterFieldsType,
        inlines: any[] | undefined
    }> {
        const fieldsAndTypes = modelInstance.updateFilteredFieldAndTypes(await modelInstance.getPrismaModelFieldsAndTypes()) as GetPrismaModelFieldsAndTypes;
        const filterTypes: Record<string, ListViewFilterType> = {};
        let listFilterFields = [] as GetListFilterFieldsType;
        const relations = await modelInstance.getOneToOneRelationsFromDMMF() as GetOneToOneRelationsFromDMMF;
        /*
            The example of relation between TimeTracking and User:
            "relations": {
                "model": "TimeTracking",
                "relations": [
                    {
                        "from": {
                            "field": "user",
                            "dbField": "userId"
                        },
                        "to": {
                            "model": "User",
                            "field": "id",
                            "dbField": "id"
                        },
                        "isRequired": true,
                        "isId": false
                    }
                ]
            }    
        */
        
        const relFieldsToRetrieve = [] as string[];
        const inlines = await modelInstance.getInlines() as InlineDefinition[] | undefined;
        if (withFilters) {
            /*
                we need to rebuild listFilterFields for relations. For example: change list filter from 'reporter' to 'reporterEmail|reporter' if it is relation and the real field name is reporterEmail
                In case the list filter is 'reporter|The reporter'  then we want to change it to 'reporterEmail|The reporter' to preserve the original label
            */
            const relationsMap = relations.relations.reduce((acc, rel) => {
                acc[rel.from.field] = rel.from.dbField;
                return acc;
            }, {} as Record<string, string>);
            listFilterFields = await modelInstance.getListFilterFields() as GetListFilterFieldsType;
            const rebuiltListFilterFields = [] as GetListFilterFieldsType;
            if (listFilterFields.length) {
                listFilterFields.forEach((field) => {
                    const parts = field.split('|');
                    const renamedField = relationsMap[parts[0]];
                    relFieldsToRetrieve.push(renamedField || parts[0]);
                    if (renamedField) {
                        const newFieldParts = parts.length === 1 ? [renamedField, field] : [renamedField, ...parts.slice(1)];
                        rebuiltListFilterFields.push(newFieldParts.join('|'));
                    } else {
                        rebuiltListFilterFields.push(field);
                    }
                });
            }
            listFilterFields = rebuiltListFilterFields;
        }
        await Promise.all(fieldsAndTypes.map(async field => {
            if (field.data_type === 'enum') {
                filterTypes[field.column_name] = await modelInstance.getUserDefinedTypes(field.raw_type);
            } else if (withFilters) {
                const foundRelation = relations.relations.find(rel => rel.from.dbField === field.column_name);
                if (foundRelation && relFieldsToRetrieve.includes(foundRelation.from.dbField)) {
                    const relModel = foundRelation.to.model;
                    const relAdminModelCls: BaseAdminModel | undefined = (this.modelMap as any)[relModel.toLocaleLowerCase()]?.cls;
                    if (relAdminModelCls) {
                        const relModelInstance = new (relAdminModelCls as any)(prisma);
                        // filterTypes[foundRelation.from.field] = await modelInstance.getRelationFilters(relModelInstance, foundRelation, autocompleteConf);
                        filterTypes[field.column_name] = await modelInstance.getRelationFilters(relModelInstance, foundRelation);
                    }
                }
            }
        }));
        return { fieldsAndTypes, filterTypes, listFilterFields, inlines };
    }

    async getAdminInstancesMap(prisma: PrismaClient, modelList: string[]): Promise<RelationModelsToAdminInstanceMap> {
        const relationModelsToAdminInstanceMap: RelationModelsToAdminInstanceMap = {};
        await Promise.all(modelList.map(async (relationModel) => {
            const relationAdminModel: BaseAdminModel | undefined = (this.modelMap as any)[relationModel.toLocaleLowerCase()]?.cls;
            if (relationAdminModel) {
                relationModelsToAdminInstanceMap[relationModel] = {
                    adminModel: new (relationAdminModel as any)(prisma),
                };
            }
        }));
        return relationModelsToAdminInstanceMap;
    }

    async getPrefetchedRelationItems(prisma: PrismaClient, model: string, fields: string[]) {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;
        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }
        const modelInstance = new (adminModel as any)(prisma);
        const relationFields = await modelInstance.getOneToOneRelationsFromDMMF() as GetOneToOneRelationsFromDMMF;
        const fieldRelationMap: Record<string, FieldRelationConf> = {};
        const modelsToPrefetch = relationFields.relations.filter(rel => fields.includes(rel.from.field)).map(rel => rel.to.model);
        const adminInstancesMap = await this.getAdminInstancesMap(prisma, modelsToPrefetch);
        relationFields.relations.forEach(rel => {
            if (fields.includes(rel.from.field)) {
                fieldRelationMap[rel.from.field] = {
                    field: rel.from.field,
                    dbField: rel.from.dbField,
                    idField: rel.to.dbField,
                    adminInstance: adminInstancesMap[rel.to.model]?.adminModel,
                }
            }
        });
        return modelInstance.getPrefetchedRelations(fields, fieldRelationMap);
    }

    async getModelItems(req: any, model: string, page: number, filters: Record<string, any> = {}) {
        // This method should interact with the BaseAdminModel to fetch items
        // For simplicity, we will just return a mock response here
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }
        const modelInstance = new (adminModel as any)(this.prisma);
        const total: number = await modelInstance.getTotalCount(filters);
        const items = await modelInstance.filterItems(page, filters);
        const listDisplayFields = await modelInstance.getListDisplayFields();
        // const listFilterFields = await modelInstance.getListFilterFields();
        const searchFields = await modelInstance.getSearchFields();
        const orderingFields = await modelInstance.getOrderingFields();
        const canAddItem = await modelInstance.canAddObject(req);
        const actions = await modelInstance.getActions();
        const { fieldsAndTypes, filterTypes, listFilterFields } = await this.getSchemaInfo(this.prisma, adminModel, modelInstance, true);
        return {
            model,
            total,
            filters,
            pkFieldName: modelInstance.findPkField(),
            fieldsAndTypes: fieldsAndTypes as GetPrismaModelFieldsAndTypes,
            listDisplayFields: listDisplayFields as GetListDisplayFieldsType,
            listFilterFields: listFilterFields as GetListFilterFieldsType,
            searchFields: searchFields as GetSearchFieldsType,
            orderingFields: orderingFields as GetOrderingFieldsType,
            actions: actions as GetActionsType,
            page: page as number,
            perPage: 100, // Default items per page
            itemsCount: items.length,
            filterTypes,
            canAddItem: canAddItem as boolean,
            canDeleteItem: modelInstance.canDeleteObject(req, null) as boolean,
            items: items as FilterItemsType,
            extraFields: [],
        };
    }

    // export async function autocompleteGetItems(model: string, prisma: PrismaClient, query: string) {
    //     const modelConf = modelMap[model];
    //     const adminModel: BaseAdminModel | undefined = (modelConf as any)?.cls;
    //     if (!adminModel) {
    //         throw new NotFoundException(`Model ${model} not found`);
    //     }
    //     const modelInstance = new (adminModel as any)(prisma);
    //     const autocompleteConf = modelConf.autocomplete;
    //     if (!autocompleteConf) {
    //         throw new NotFoundException(`Autocomplete configuration not found for model ${model}`);
    //     }
    //     return modelInstance.getAutocompleteItems(autocompleteConf.searchFields, autocompleteConf.displayFields, query);
    // }

    async performAction(req: any, user: any, model: string, action: string, ids: string[]) {
        // This method should perform the action on the specified model
        // For simplicity, we will just return a mock response here
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);
        return modelInstance.performAction(req, user, action, ids);
    }


    async getModelItem(req: any, model: string, idItem: string, params: Record<string, any> = {}): Promise<CommonReturnModelItemType> {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);
        const item = await modelInstance.findById(idItem) as (FindByIdType | null);
        
        const canViewItem = await modelInstance.canViewItem(req, item);
        if (!canViewItem) {
            throw new ForbiddenException(`You do not have permission to view this item`);
        }

        if (!item) {
            throw new NotFoundException(`Item with id ${idItem} not found in model ${model}`);
        }
        const { fieldsAndTypes, filterTypes, inlines } = await this.getSchemaInfo(this.prisma, adminModel, modelInstance, false);
        const prefetchedRelations = await this.getPrefetchedRelationItems(this.prisma, model, modelInstance.prefetchRelations || []);

        const relations = await modelInstance.getOneToOneRelationsFromDMMF() as GetOneToOneRelationsFromDMMF;
        const inlineModels = inlines?.map(inline => inline.model.toLowerCase()) || [];

        const allRelationModels: string[] = relations.relations.map(relation => relation.to.model);
        const relationModelsToAdminInstanceMap = await this.getAdminInstancesMap(this.prisma, allRelationModels);
        const revRelationModelsToAdminInstanceMap = await this.getAdminInstancesMap(this.prisma, inlineModels);
        const inlineItems = await modelInstance.getInlineItems(inlines, idItem, revRelationModelsToAdminInstanceMap) as GetInlineItemsType;
        const relationToLabelMap = await modelInstance.getRelationToLabelMap(item, relations, relationModelsToAdminInstanceMap) as GetRelationToLabelMapType;
        const excludes = await modelInstance.getExcludeFields() || [];
        excludes.push(...((params?.['exclude'] as string | undefined) || '').split(',').map(field => field.trim()).filter(field => field !== ''));
        const onlyFields = (params?.['only']) ? ((params?.['only'] as string | undefined) || '').split(',').map(field => field.trim()).filter(field => field !== '') : undefined;
        const filteredFieldAndTypes = fieldsAndTypes.filter(field => !excludes.includes(field.column_name)).filter(field => (!onlyFields || onlyFields.includes(field.column_name)));
        const extraFields = await modelInstance.getExtraFields(req, item) as ExtraFieldDefinition[] | undefined;
        const { extraFieldAndTypes, extraFilterTypes } = this.extractFromExtraFields(extraFields);
        return {
            title: await modelInstance.getLabelFromObject(item),
            pkFieldName: modelInstance.findPkField(),
            item: await modelInstance.formatItem(item),
            fieldsAndTypes: [...filteredFieldAndTypes, ...extraFieldAndTypes] as GetPrismaModelFieldsAndTypes,
            filterTypes: {...filterTypes, ...prefetchedRelations, ...extraFilterTypes},
            relations,
            relationToLabelMap,
            readonlyFields: modelInstance.readonlyFields || [] as string[],
            fieldToLabelMap: modelInstance.fieldToLabelMap || {},
            fieldsConfig: modelInstance.fieldsConfig || {},
            fieldDependencies: (modelInstance.getFieldDependencies() || {}) as FieldDependencies,
            canDeleteItem: await modelInstance.canDeleteObject(req, item) || false,
            inlines: inlines || [],
            inlineItems: inlineItems || {},
            extraFields,
        };
    }
    async getModelMetadata(req: any, model: string, params: Record<string, any> = {}): Promise<CommonReturnModelItemType> {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);

        const canAddItem = await modelInstance.canAddObject(req);
        if (!canAddItem) {
            throw new ForbiddenException(`You do not have permission to add items to this model`);
        }

        const { fieldsAndTypes, filterTypes, inlines } = await this.getSchemaInfo(this.prisma, adminModel, modelInstance, false);
        const prefetchedRelations = await this.getPrefetchedRelationItems(this.prisma, model, modelInstance.prefetchRelations || []);
        const excludes = await modelInstance.getExcludeFields() || [];
        const onlyFields = modelInstance?.fields?.length ? modelInstance.fields : undefined;
        excludes.push(...((params?.['exclude'] as string | undefined) || '').split(',').map(field => field.trim()).filter(field => field !== ''));
        const filteredFieldAndTypes = modelInstance.updateFilteredFieldAndTypes(
            fieldsAndTypes.filter(field => !excludes.includes(field.column_name)).filter(field => (!onlyFields || onlyFields.includes(field.column_name)))
        );
        
        const extraFields = await modelInstance.getExtraFields(req) as ExtraFieldDefinition[] | undefined;
        const { extraFieldAndTypes, extraFilterTypes } = this.extractFromExtraFields(extraFields);
        return {
            pkFieldName: modelInstance.findPkField(),
            item: null as (FindByIdType | null),
            canDeleteItem: false,
            fieldsAndTypes: [...filteredFieldAndTypes, ...extraFieldAndTypes] as GetPrismaModelFieldsAndTypes,
            filterTypes: {...filterTypes, ...prefetchedRelations, ...extraFilterTypes},
            relations: await modelInstance.getOneToOneRelationsFromDMMF() as GetOneToOneRelationsFromDMMF,
            readonlyFields: modelInstance.readonlyFields || [] as string[],
            fieldToLabelMap: modelInstance.fieldToLabelMap || {},
            fieldsConfig: modelInstance.fieldsConfig || {},
            fieldDependencies: (await modelInstance.getFieldDependencies() || {}) as FieldDependencies,
            inlines: inlines || [],
            extraFields,
        };
    }
    async updateModelItem(req: any, model: string, idItem: string, itemData: Record<string, any> | null, filesData?: Record<string, File> | null) {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);
        const canEditItem = await modelInstance.canUpdateObject(req, idItem);
        if (!canEditItem) {
            throw new ForbiddenException(`You do not have permission to edit this item`);
        }

        return await modelInstance.update(idItem, itemData, null, null, filesData);
    }
    async createModelItem(req: any, model: string, data: Record<string, any> | null, filesData?: Record<string, File> | null) {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }
        
        const modelInstance = new (adminModel as any)(this.prisma);
        const canAddItem = await modelInstance.canAddObject(req);
        if (!canAddItem) {
            throw new ForbiddenException(`You do not have permission to add items to this model`);
        }

        return await modelInstance.create(data, null, null, filesData);
    }
    async getAutocompleteItems(req: any, model: string, targetModel: string, keyField: string, query: string, depData: Record<string, any>) {
        targetModel = targetModel.toLowerCase();
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;
        const adminTargetModel: BaseAdminModel | undefined = (this.modelMap as any)[targetModel]?.cls;
        if (!adminModel || !adminTargetModel) {
            throw new NotFoundException(`Model ${model} or target model ${targetModel} not found`);
        }

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);
        const adminModelInstance = new (adminTargetModel as any)(this.prisma);
        return await modelInstance.getAutocompleteItems(adminModelInstance, keyField, query, depData);
    }
    async saveInlines(req: any, model: string, idItem: string, existingItems: Record<string, ExistingFormData[]>, newItems: Record<string, NewFormData[]>, filesData?: InlineFileDataType | null) {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;
        const allModels = new Set(Object.keys(existingItems).concat(Object.keys(newItems)));
        const adminMap = await this.getAdminInstancesMap(this.prisma, Array.from(allModels));

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);
        const canEditItem = await modelInstance.canUpdateObject(req, idItem);
        if (!canEditItem) {
            throw new ForbiddenException(`You do not have permission to edit this item`);
        }

        return await modelInstance.saveInlines(idItem, existingItems, newItems, adminMap, filesData);
    }

    async deleteObject(req: any, model: string, idItem: string) {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);
        const canDeleteItem = await modelInstance.canDeleteObject(req, idItem);
        if (!canDeleteItem) {
            throw new ForbiddenException(`You do not have permission to delete this item`);
        }

        return await modelInstance.delete(idItem);
    }
    extractFromExtraFields(extraFields: ExtraFieldDefinition[] | undefined) {
        const extraFieldAndTypes: GetPrismaModelFieldsAndTypes = [];
        const extraFilterTypes: Record<string, ListViewFilterType> = {};
        const dataTypeMap: Record<string, string> = {json: 'jsonb', choice: 'enum', 'string': 'text'};
        if (extraFields) {
            extraFields.forEach(field => {
                const item: FieldDefinition = {
                    column_name: field.field,
                    data_type: dataTypeMap[field.type] || field.type,
                    is_nullable: field.required ? 'NO' : 'YES',
                    column_default: field.default,
                    raw_type: field.type,
                    help_text: field.helpText,
                    isPk: false,
                    character_maximum_length: null,
                };
                if (field.choices) {
                    extraFilterTypes[field.field] = field.choices as ListViewFilterType;
                    item.data_type = 'enum';
                }
                extraFieldAndTypes.push(item);
            });

        }
        return { extraFieldAndTypes, extraFilterTypes };
    }

    async getModelItemIdByUniqueField(model: string, field: string, value: string) {
        const adminModel: BaseAdminModel | undefined = (this.modelMap as any)[model.toLowerCase()]?.cls;

        if (!adminModel) {
            throw new NotFoundException(`Model ${model} not found`);
        }

        const modelInstance = new (adminModel as any)(this.prisma);
        const pkFieldName = modelInstance.findPkField();
        const result = await modelInstance.findByUniqueField(value, field, [pkFieldName]);
        return result?.[pkFieldName];
    }
}
export type GetModelItemType = Awaited<ReturnType<
    typeof AdminService.prototype.getModelItem
>>;

export type GetModelMetadataType = Awaited<ReturnType<
    typeof AdminService.prototype.getModelMetadata
>>;

export type UpdateModelItemType = Awaited<ReturnType<
    typeof AdminService.prototype.updateModelItem
>>;

export type CreateModelItemType = Awaited<ReturnType<
    typeof AdminService.prototype.createModelItem
>>;
export type GetAutocompleteItemsType = Awaited<ReturnType<
    typeof AdminService.prototype.getAutocompleteItems
>>;

export type SaveInlinesType = Awaited<ReturnType<
    typeof AdminService.prototype.saveInlines
>>;
export type DeleteObjectType = Awaited<ReturnType<
    typeof AdminService.prototype.deleteObject
>>;
export type GetModelItemsType = Awaited<ReturnType<
    typeof AdminService.prototype.getModelItems
>>;
export type PerformActionType = Awaited<ReturnType<
    typeof AdminService.prototype.performAction
>>;
export type GetModelsType = ReturnType<
    typeof AdminService.prototype.getModels
>;
