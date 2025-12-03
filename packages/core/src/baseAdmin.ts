// Lets create a generic base class for admin models inspired by django's base model
import { Prisma, PrismaClient } from '@prisma/client';
import * as PrismaMod from '@prisma/client';
import { DateTime } from 'luxon';
import {
	ArrayElement,
} from './adminUtils';
import { parseFieldName } from './adminUtils';
import { TreeManager } from './utils/tree';
import {
    ActionIdsType,
    ActionType,
    ApiResponseError,
    ExtraFieldDefinition,
    FieldConfig,
    FieldDefinition,
    FieldDependencies,
    InlineDefinition,
    ValidationError,
    DMMMFieldType,
    DMMFModelRelationsType,
    DMMFRelationType,
    ExistingFormData,
    NewFormData,
    InlineFileDataType,
    InlineItemTypeMap,
    OneToOneRelationsResultType,
    ValidationErrorDetail,
} from './models';

// const usrMod = PrismaMod['User'];

// Custom types to avoid Prisma DMMF type export issues


type TSelectClauseType = {
  [key: string]: boolean | { select: TSelectClauseType };
};

function flatItemMap(item: any, prefix: string = ''): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in item) {
        if (item[key]) {
            const value = item[key];
            const newKey = prefix ? `${prefix}__${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(result, flatItemMap(value, newKey));
            }
            else {
                result[newKey] = value;
            }
        }
    }
    return result;
}

function mapQuerysetResultWithSelectClause(
    queryset: any[],
    selectClause: TSelectClauseType
): Record<string, any>[] {
    return queryset.map(item => {
        let result: Record<string, any> = {};
        for (const key in selectClause) {
            const value = item ? item[key] : null;
            if (selectClause[key] === true) {
                result[key] = value;
            } else if (typeof selectClause[key] === 'object' && 'select' in selectClause[key]) {
                if (value) {
                    result = {...result,  ...(flatItemMap(mapQuerysetResultWithSelectClause([value], selectClause[key].select)[0], key) || {})};
                } else {
                    result[key] = null;
                }
            }
        }
        if (item['$pk'] === undefined) {
        }
        return result;
    });
}



// function getValueFromQsetObject(item: any, field: string): any {
//     const fieldParts = field.split('__');
//     let value = item;
//     for (const part of fieldParts) {
//         value = value?.[part];
//     }
//     return value;
// }

export class BaseAdminModel {
    protected prismaClient: any;

    constructor(private readonly prisma: PrismaClient) {
        this.prismaClient = this.prisma;
    }
    protected prismaModel: string | undefined;
    protected listDisplayFields: string[] = [];
    protected listFilterFields: string[] = [];
    protected searchFields: string[] = [];
    protected orderingFields: string[] = [];
    protected excludeFields: string[] = [];
    protected readonlyFields: string[] = [];
    protected actions: ActionType[] = [];
    protected inlines: InlineDefinition[] = []
    protected fieldDependencies: FieldDependencies = {};
    protected fieldsHelpText: Record<string, string> = {};
    protected fieldToLabelMap: Record<string, string> = {};
    protected widgets: Record<string, string> = {};
    protected fieldsConfig: Record<string, FieldConfig> = {};
    protected autoCompleteSearchFields: string[] = [];
    protected prefetchRelations: string[] = [];
    protected extraFields: ExtraFieldDefinition[] = [];

    protected static prismaModelName: string | undefined;
    protected static prismaModelPlural: string | undefined;
    protected getPrismaModel(forPrisma: boolean = true) {
        if (!this.prismaModel) {
            throw new Error('Prisma model is not defined');
        }
        return forPrisma ? this.prismaModel[0].toLocaleLowerCase() + this.prismaModel.slice(1) : this.prismaModel;
    }

    ensureListDisplayFields() {
        if (!this.listDisplayFields.length) {
            this.listDisplayFields = [this.findPkField()];
        }
        return this.listDisplayFields;
    }

    public static getPrismaModelPlural() {
        if (!this.prismaModelPlural && !this.prismaModelName) {
            throw new Error('Prisma model plural or name is not defined');
        }
        return this.prismaModelPlural || this.prismaModelName + 's';
    }
    
    public getBaseQset() {
        const model = this.getPrismaModel();
        return this.prismaClient[model];
    }
    public getObjectPk(object: Record<string, any>): string | number | null {
        const pkFieldName = this.findPkField();
        return object?.[pkFieldName] || null;
    }
    public async getLabelFromObject(object: Record<string, any>): Promise<string> {
        return (object?.['name'] || object?.['title'] || object?.['label'] || this.getObjectPk(object) || '<unnamed>').toString();
    }
    async filterItems(page: number | undefined, filters: Record<string, any> = {}, extraFields?: Record<string, any>, take: number = 100) {
        const perPage = (page === undefined) ? undefined : take; // Default items per page
        const skip = (page === undefined) ? 0 : page * (perPage || take);
        const selectClause = this.getSelectClause(this.ensureListDisplayFields());
        const filtersData = this.getFiltersClause(filters, this.searchFields);
        const orderingClause = await this.getOrderingClause(filters, this.ensureListDisplayFields());
        const pkFieldName = this.findPkField();
        const queryset = await this.getBaseQset().findMany({
            where: filtersData,
            skip,
            take: perPage,
            select: {...selectClause, ...(extraFields || {})},
            orderBy: orderingClause,
        });
        const result = mapQuerysetResultWithSelectClause(queryset, selectClause);
        // add $pk field to every item
        result.forEach(item => {
            if (item['$pk'] === undefined) {
                item['$pk'] = item[pkFieldName];
            }
        });
        return result;
    }
    protected getSelectClause(fields: string[] = []) {
        const fieldNames = fields.map(fieldDef => {
            const { field } = parseFieldName(fieldDef);
            return field;
        });
        const select: TSelectClauseType = {};
        const pkFieldName = this.findPkField();
        if (!fieldNames.includes(pkFieldName)) {
            select[pkFieldName] = true;
        }
        fieldNames.forEach(field => {
            const fieldParts = field.split('__');
            if (fieldParts.length === 1) {
                select[fieldParts[0]] = true;
                return;
            } else if (fieldParts.length > 1) {
                const prevSelect: any = select[fieldParts[0]] || {};
                select[fieldParts[0]] = { select: {...(prevSelect?.select || {}), ...this.getSelectClause([fieldParts.slice(1).join('__')])} };
            }
        });
        return select;
    } 
    protected getFilterItem(field: string, value: any) {

        // split by __ and create nested object. Ie: timesheet__reporter__name should become { timesheet: { reporter: { name: value } } }
        let finalValue = undefined;
        if (field[0] === '=') { // exact match
            finalValue = value;
            field = field.slice(1); // Remove the '=' prefix
        } else if (field[0] === '&') { // integer
            if (value && !isNaN(Number(value))) {
                finalValue = Number(value);
                field = field.slice(1); // Remove the '&' prefix
            } else {
                return {} as Record<string, any>;
            }
        } else if (field[0] === '#') { // uuid

            if (value && value.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
                finalValue = value;
                field = field.slice(1); // Remove the '^' prefix
            }
        } else if (field[0] === '~') { // regex
            finalValue = { matches: value, options: 'i' };
            field = field.slice(1); // Remove the '~' prefix
        } else if (field[0] === '^') { // startswith
            finalValue = { startsWith: value };
            field = field.slice(1); // Remove the '^' prefix
        } else if (field[0] === '$') { // endswith
            finalValue = { endsWith: value };
            field = field.slice(1); // Remove the '$' prefix
        } else if (field[0] === '!') { // case sensitive match
            finalValue = { contains: value, mode: 'exact' };
            field = field.slice(1); // Remove the '!' prefix
        } else {
            finalValue = { contains: value, mode: 'insensitive' }; // by default it is "contains"
        }
        const fieldParts = field.split('__');
        const result: Record<string, any> = {};
        if (value !== undefined) {
            let current = result;
            for (let i = 0; i < fieldParts.length - 1; i++) {
                current[fieldParts[i]] = {};
                current = current[fieldParts[i]];
            }
            current[fieldParts[fieldParts.length - 1]] = finalValue;
        }
        return result;
    }
    protected getFiltersClause(filters: Record<string, any> = {}, definedSearchFields: string[] | undefined): Record<string, any> {
        const where: Record<string, any> = {};
        // let fieldDefinition = await this.getPrismaModelFieldsAndTypes();
        const fieldDefs = this.getFieldsFromDMMF();
        for (const key in filters) {
            if (key === '_q') {
                // Handle search query
                if (filters[key] && definedSearchFields && definedSearchFields.length > 0) {
                    where['OR'] = definedSearchFields.map(field => {
                        return this.getFilterItem(field, filters[key]);
                    });
                } 
                continue;
            }
            if (key === 'p' || key === '_o') {
                // Skip pagination/ordering parameter
                continue;
            }
            const [key2, operator] = key.split('__$');
            if (filters[key]) {
                let value = filters[key];
                const fieldDef = fieldDefs.find(f => f.name === key2);
                if (fieldDef?.type === 'DateTime' || fieldDef?.type === 'Date') {
                    value = DateTime.fromISO(value).toJSDate();
                }
                if (operator) {
                    if (['lt', 'gt', 'lte', 'gte'].includes(operator)) {
                        if (where[key2] && typeof where[key2] === 'object') {
                            where[key2] = { ...(where[key2] || {}), [operator]: value };
                        } else {
                            where[key2] = { [operator]: value };
                        }
                    } else if (operator === 'isnull' && value) {
                        where[key2] = null;
                    } else if (operator === '$not') {
                        where[key2] = { not: (value === 'null') ? null : value };
                    }
                    continue;
                }
                if (Array.isArray(value)) {
                    where[key2] = { in: value };
                } else if (typeof value === 'object' && value !== null) {
                    where[key2] = { ...value };
                } else if ((value === 'true' || value === 'false') && fieldDef?.type === 'Boolean') {
                    where[key2] = { equals: value === 'true' };
                } else {
                    where[key2] = value;
                }
            }
        }
        return where;
    }
    protected async getRelationItemsForModel(otherModel: string, field: string, extraFields?: Record<string, any>) {
        // can be overwritten and personalised per otherModel and field
        return this.filterItems(undefined, {}, extraFields);
    }
    protected async getPrefetchedRelations(fields: string[], fieldRelationMap: Record<string, FieldRelationConf>): Promise<Record<string, {label: string, value: string}[]>> {
        const result: Record<string, {label: string, value: string}[]> = {};
        const myModel = this.getPrismaModel();
        for (const field of fields) {
            const relation = fieldRelationMap[field];
            const relAdminModel = relation?.adminInstance;
            if (relAdminModel) {
                const items = await relAdminModel.getRelationItemsForModel(myModel, relation.field, {[relation.idField]: true});
                result[relation.dbField] = await Promise.all(items.map(async item => {
                    return { label: await relAdminModel.getLabelFromObject(item), value: item[relation.idField] };
                }));
            }
        }
        return result;
    }
    protected async defaultOrderingClause(orderList?: string[]): Promise<Record<string, any> | Record<string, any>[] | undefined> {
        orderList = orderList || await this.getOrderingFields();
        if (!orderList || orderList.length === 0) {
            return undefined;
        }
        let orderResult: Record<string, any>[] = [];
        orderList.forEach(field => {
            const f2 = field.replace(/^-/, '')
            orderResult.push(this.getFilterItem(`=${f2}`, (field[0] === '-') ? 'desc' : 'asc'));
        });
        return orderResult.length === 1 ? orderResult[0] : orderResult;
    }
    protected async getOrderingClause(filters: Record<string, any> = {}, fields: string[] = []): Promise<Record<string, any> | Record<string, any>[] | undefined> {
        const fieldNames = fields.map(fieldDef => {
            const { field } = parseFieldName(fieldDef);
            return field;
        });
        const orderingIdx = parseInt(filters['_o'] || '0', 10);
        if (!orderingIdx) {
            return await this.defaultOrderingClause();
        }

        const orderingField = fieldNames[Math.abs(orderingIdx) - 1];
        if (!orderingField) {
            throw new Error(`Invalid ordering index: ${orderingIdx}`);
        }
        const val = orderingIdx < 0 ? 'desc' : 'asc';
        return this.getFilterItem(`=${orderingField}`, val);
    }

    async getPrismaModelFieldsAndTypes() {
        const model = this.getPrismaModel(false);
        const fields = this.getFieldsFromDMMF();
        //const f = fields[0];
        // const aa = [f.default, f.isId, f.type, f.isRequired, f.name, f.isUnique, f.isList, f.relationName, f.hasDefaultValue, f.isUpdatedAt];
        const result: FieldDefinition[] = []; // await this.prismaClient.$queryRaw`SELECT column_name, is_nullable, column_default, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = ${model}`;
        const getDataType = (field: DMMMFieldType) => {
            if (field.kind === 'enum') {
                return 'enum';
            }
            return field.type.toLowerCase();
        };
        const getDefaultValue = (field: DMMMFieldType) => {
            if (field.hasDefaultValue) {
                if (typeof field.default === 'string') {
                    return field.default;
                } else if (typeof field.default === 'number' || typeof field.default === 'boolean') {
                    return field.default.toString();
                } else if (field.default === null) {
                    return 'NULL';
                } else if (typeof field.default === 'object') {
                    if (field.default.kind === 'now') {
                        return 'now()';
                    }
                }
            }
            return null;
        };
        const isRealField = (field: DMMMFieldType) => {
            return ['scalar', 'enum'].includes(field.kind);
        };
        fields.forEach((field) => {
            if (!isRealField(field)) {
                return;
            }
            const fDef = {
                column_name: field.name,
                is_nullable: field.isRequired ? 'NO' : 'YES',
                column_default: getDefaultValue(field),
                isPk: field.isId,
                data_type: getDataType(field),
                raw_type: field.type,
                character_maximum_length: null,
                help_text: this.fieldsHelpText[field.name] || ''
            };
            // fDef.help_text = this.fieldsHelpText[field.column_name] || '';
            result.push(fDef);
        });
        return result;
    }
    async getUserDefinedTypes(udtName: string) {
        const enumTp = (PrismaMod as any)[udtName];
        if (enumTp) {
            return Object.values(enumTp).map((value: any) => {
                return { label: value, value };
            });
        }
        return null;
    }

    async getTotalCount(filters: Record<string, any> = {}) {
        const model = this.getPrismaModel();
        const filtersData = this.getFiltersClause(filters, this.searchFields);
        return await this.prismaClient[model].count({
            where: filtersData,
        });
    }
    parseIdValue(id: string): [string, string | number] {
        const fields = this.getFieldsFromDMMF();
        const idField = fields.find(f => f.isId);
        if (!idField) {
            throw new Error('No ID field found for model ' + this.getPrismaModel());
        }
        if ((idField.type || '').toLowerCase() === 'int') {
            return [idField.name, parseInt(id, 10) as number];
        }
        return [idField.name, id];
    }
    async findById(id: string | number) {
        const model = this.getPrismaModel();
        const [pkName, pkVal] = this.parseIdValue(id.toString());
        return await this.prismaClient[model].findUnique({
            where: { [pkName]: pkVal },
        });
    }
    async findByUniqueField(value: any, field: string, getFields?: string[]) {
        const model = this.getPrismaModel();
        return await this.prismaClient[model].findUnique({
            where: { [field]: value },
            select: getFields ? this.getSelectClause(getFields) : undefined,
        });
    }

    async processCreateData(data: Record<string, any>) {
        // Process and transform the data as needed before creation
        const newData: Record<string, any> = {};
        const fieldsAndTypes = await this.getPrismaModelFieldsAndTypes();
        const fieldToMetadata: Record<string, FieldDefinition> = {};
        fieldsAndTypes.forEach(field => {
            fieldToMetadata[field.column_name] = field;
        });
        const extraFields = await this.getExtraFields();
        const allExtraFieldNames = extraFields.map(field => field.field);
        for (const key in data) {
            const item = data[key];
            const itemMetadata = fieldToMetadata[key];
            if (allExtraFieldNames.includes(key)) {
                newData[key] = item;
                continue;
            }
            if (itemMetadata.is_nullable === 'YES' && (item === '' || item === undefined)) {
                newData[key] = null;
                continue;
            }
            if (itemMetadata.data_type === 'date' || itemMetadata.data_type === 'datetime') {
                if (typeof item === 'string') {
                    newData[key] = DateTime.fromISO(item.toString()).toJSDate();
                }
            }
            else if (itemMetadata.data_type === 'timestamp with time zone') {
                if (typeof item === 'string') {
                    newData[key] = DateTime.fromISO(item.toString()).toJSDate();
                }
            }
            else if (itemMetadata.data_type === 'boolean') {
                newData[key] = item === 'true' || item === true;
            }
            else if (itemMetadata.data_type === 'uuid' && !itemMetadata.column_default && itemMetadata.is_nullable !== 'NO') {
                newData[key] = item || undefined; // Allow UUID to be empty if not required
            } else {
                newData[key] = item;
            }
        }
        return newData;
    }
    async validateExtraField(field: ExtraFieldDefinition, value: any) {
        if (field.required && (value === null || value === undefined || value === '')) {
            throw new ValidationError(`Field ${field.field} is required`, [{ field: field.field, message: `Field ${field.field} is required`, code: 'required' }]);
        }
        if (!field.required && !value) {
            return null;
        }
        if (field.type === 'choice' && !field?.choices?.map(v => v.value).includes(value)) {
            throw new ValidationError(`Field ${field.field} must be one of the predefined choices`, [{ field: field.field, message: `Field ${field.field} must be one of the predefined choices`, code: 'invalid_choice', value }]);
        }
        if (field.type === 'date') {
            try {
                value = DateTime.fromISO(value.toString(), {zone: 'utc'}).toJSDate();
            } catch (error) {
                throw new ValidationError(`Field ${field.field} must be a valid date`, [{ field: field.field, message: `Field ${field.field} must be a valid date`, code: 'invalid_date', value }]);
            }
        } else if (field.type === 'number') {
            try {
                value = Number(value);
            } catch (error) {
                throw new ValidationError(`Field ${field.field} must be a valid number`, [{ field: field.field, message: `Field ${field.field} must be a valid number`, code: 'invalid_number', value }]);
            }
        } else if (field.type === 'boolean') {
            value = value === 'true' || value === true;
        } else if (field.type === 'json') {
            try {
                value = JSON.parse(value);
            } catch (error) {
                throw new ValidationError(`Field ${field.field} must be a valid JSON`, [{ field: field.field, message: `Field ${field.field} must be a valid JSON`, code: 'invalid_json', value }]);
            }
        } else if (field.type === 'string') {
            value = value.toString();
        }
        return value;
    }
    async validateCreateData(data: Record<string, any>, fields?: string[] | null, exclude?: string[] | null, filesData?: Record<string, File> | null): Promise<Record<string, any>> {
        const fieldsAndTypes = await this.getPrismaModelFieldsAndTypes();
        const extraFields = await this.getExtraFields();
        const allExtraFieldNames = extraFields.map(field => field.field);
        const fieldToMetadata: Record<string, FieldDefinition> = {};
        const newData: Record<string, any> = {};
        const postgresIntegerTypes = ['smallint', 'integer', 'bigint'];
        const postgresFloatTypes = ['real', 'double precision', 'numeric'];

        fieldsAndTypes.forEach(field => {
            fieldToMetadata[field.column_name] = field;
        });
        const pkFieldName = this.findPkField();
        const errors: ValidationErrorDetail[] = [];
        for (const key in data) {
            if (key === pkFieldName) {
                continue; // Skip ID field
            }
            if (exclude && exclude.includes(key)) {
                continue; // Skip excluded fields
            }
            if (fields && !fields.includes(key)) {
                continue; // Skip fields not in the specified fields list
            }
            if (allExtraFieldNames.includes(key)) {
                const fldDef = extraFields.find(field => field.field === key)!;
                const newVal = await this.validateExtraField(fldDef, data[key]);
                newData[key] = newVal;
                continue;
            }
            const itemMetadata = fieldToMetadata[key];
            if (!itemMetadata) {
                continue; // Skip unknown fields
            }
            if (itemMetadata.is_nullable === 'NO' && (data[key] === null || data[key] === undefined || data[key] === '')) {
                if (itemMetadata.column_default) {
                    continue; // let it be set to default value by the database
                }
                errors.push({ field: key, message: `${key} is required`, code: 'required' });
                continue;
            }
            if (itemMetadata.is_nullable === 'YES' && (data[key] === null || data[key] === undefined || data[key] === '')) {
                newData[key] = null; // Allow nullable fields to be set to null
                continue;
            }
            if (itemMetadata.data_type === 'date' || itemMetadata.data_type === 'datetime' || itemMetadata.data_type.startsWith('timestamp')) {
                if (typeof data[key] === 'string') {
                    try {
                        if (itemMetadata.data_type === 'date' || this.widgets[key] === 'date') {
                            newData[key] = DateTime.fromISO(data[key].toString(), {zone: 'utc'}).toJSDate();
                        } else {
                            newData[key] = DateTime.fromISO(data[key].toString()).toJSDate();
                        }
                    } catch (e) {
                        console.error(`Error: Invalid date format for field ${key}`, data[key], e, typeof data[key]);
                        errors.push({ field: key, message: `${key} must be a valid date`, code: 'invalid_date', value: data[key] });
                        continue;
                    }
                } else {
                    newData[key] = data[key];
                }

                if (newData[key] && !(newData[key] instanceof Date)) {
                    console.error(`Error: Invalid date format for field ${key}`, newData[key], typeof newData[key]);
                    errors.push({ field: key, message: `${key} must be a valid date`, code: 'invalid_date', value: newData[key] });
                }
            } else if (itemMetadata.data_type === 'boolean') {
                newData[key] = data[key] === 'true' || data[key] === true;
            } else if (postgresIntegerTypes.includes(itemMetadata.data_type)) {
                if (typeof data[key] === 'string') {
                    newData[key] = parseInt(data[key], 10);
                } else {
                    newData[key] = data[key];
                }
            } else if (postgresFloatTypes.includes(itemMetadata.data_type)) {
                if (typeof data[key] === 'string') {
                    newData[key] = parseFloat(data[key]);
                } else {
                    newData[key] = data[key];
                }
            } else if (itemMetadata.data_type === 'uuid' && itemMetadata.is_nullable !== 'NO' && !data[key]) {
                // Allow UUID to be empty if not required
                continue;
            } else if (itemMetadata.data_type === 'character varying' && itemMetadata.character_maximum_length && data[key]?.length > itemMetadata.character_maximum_length) {
                errors.push({ field: key, message: `${key} exceeds maximum length of ${itemMetadata.character_maximum_length}`, code: 'max_length_exceeded', value: data[key] });
            } else if (itemMetadata.data_type === 'int' && typeof data[key] === 'string') {
                if (!data[key].trim() && itemMetadata.is_nullable === 'YES') {
                    continue;
                }
                const intVal = parseInt(data[key], 10);
                if (isNaN(intVal)) {
                    errors.push({ field: key, message: `${key} must be a valid integer`, code: 'invalid_integer', value: data[key] });
                    continue;
                }
                newData[key] = intVal;
            } else if (itemMetadata.data_type === 'float' && typeof data[key] === 'string') {
                if (!data[key].trim() && itemMetadata.is_nullable === 'YES') {
                    continue;
                }
                const floatVal = parseFloat(data[key]);
                if (isNaN(floatVal)) {
                    errors.push({ field: key, message: `${key} must be a valid float`, code: 'invalid_float', value: data[key] });
                    continue;
                }
                newData[key] = floatVal;
            } else {
                newData[key] = data[key];
            }
        }
        if (errors.length > 0) {
            throw new ValidationError('Validation errors occurred', errors);
        }
        return newData;
    }
    async getExcludeFields(): Promise<string[]> {
        return this.excludeFields;
    }
    applyPkToData(data: Record<string, any>): Record<string, any> {
        const pkFieldName = this.findPkField();
        if (data[pkFieldName] !== undefined) {
            data.$pk = data[pkFieldName];
        }
        return data;
    }
    async _do_create(data: Record<string, any>) {
        const model = this.getPrismaModel();
        const result = await this.prismaClient[model].create({
            data,
        });
        return this.applyPkToData(result);
    }
    async preProcessFiles(pk: string | number | null, data: Record<string, any>, filesData: Record<string, File> | null): Promise<Record<string, any> | null | undefined> {
        // Handle file uploads here if necessary
        return {};
    }
    async postProcessFiles(pk: string | number | null, data: Record<string, any>, filesData: Record<string, File> | null) {
        // Handle file uploads here if necessary
    }
    async create(data: Record<string, any>, exclude?: string[] | null, fields?: string[] | null, filesData?: Record<string, File> | null) {
        const excludeFields = await this.getExcludeFields();
        const allExcludeFields = excludeFields.concat(exclude || []);
        if (!await this.canAddObject(null)) {
            return null;
        }
        let validatedData = await this.prepareCreateData(await this._validateData(await this.validateCreateData(data, fields, allExcludeFields)));
        if (filesData && Object.keys(filesData).length > 0) {
            const preProcessedData = await this.preProcessFiles(null, validatedData, filesData || null);
            if (preProcessedData) {
                validatedData = { ...validatedData, ...preProcessedData };
            }
        }
        const result = await this._do_create(validatedData);
        if (filesData && Object.keys(filesData).length > 0) {
            await this.postProcessFiles(this.getObjectPk(result), validatedData, filesData || null);
        }
        await this.onUpdatedModel(result, true);
        return result;
    }
    async fieldValidation(key: string, value: any, fieldDefinition?: {isUnique: boolean, isRequired: boolean, type: string, isUpdatedAt?: boolean}, id?: string) {
        // {isUnique: boolean, isRequired: boolean, isId?: boolean, isList?: boolean, hasDefaultValue?: boolean, type: string, isUpdatedAt?: boolean, default?: any}
        if (!fieldDefinition) {
            return value;
        }
        if (fieldDefinition.isUnique) {
            let idCond = {};
            if (id) {
                const [pkName, pkVal] = this.parseIdValue(id);
                idCond = { [pkName]: { not: pkVal } };
            }
            const alreadyExists = await this.getBaseQset().findFirst({
                where: {
                    ...idCond,
                    [key]: value
                }
            });
            if (alreadyExists) {
                throw new ValidationError(`Field ${key} must be unique`, [{ field: key, message: 'must be unique', code: 'unique_violation', value }]);
            }
        }
        if (fieldDefinition.isRequired && (value === null || value === undefined || value === '')) {
            throw new ValidationError(`Field ${key} is required`, [{ field: key, message: 'is required', code: 'required', value }]);
        }
        return value;
    }
    async _validateData(data: Record<string, any>, id?: string) {
        const errors: ValidationErrorDetail[] = [];
        const model = this.getPrismaModel(false);
        const dmmf = Prisma.dmmf;
        
        const modelDef = dmmf.datamodel.models.find(m => m.name === model);

        const fieldDefinitions = modelDef?.fields || [];
        const fieldDefMap = fieldDefinitions.reduce((acc, field) => {
            acc[field.name] = field;
            return acc;
        }, {} as Record<string, typeof fieldDefinitions[number]>);
        const allDataKeys = Object.keys(data);
        const missingKeys = fieldDefinitions.filter(field => !allDataKeys.includes(field.name));

        await Promise.all(allDataKeys.map(async key => {
            // Perform per-field validation
            const validateFieldFn = (this as any)[`validate_${key}`];
            if (validateFieldFn && typeof validateFieldFn === 'function' && data[key] !== undefined && data[key] !== null && data[key] !== '') {
                try {
                    const customFieldValue: any = await validateFieldFn.call(this, data[key], id);
                    if (customFieldValue !== undefined) {
                        data[key] = customFieldValue;
                    }
                } catch (error) {
                    if (error instanceof ValidationError) {
                        errors.push({ field: key, message: error.message });
                    } else {
                        throw error;
                    }
                }
            }
            try {
                await this.fieldValidation(key, data[key], fieldDefMap?.[key], id);
            } catch (error) {
                if (error instanceof ValidationError) {
                    errors.push({ field: key, message: error.message });
                } else {
                    throw error;
                }
            }
        }));
        if (errors.length > 0) {
            throw new ValidationError('Validation errors occurred', errors);
        }
        return this.validateData(data, id);
    }
    async validateData(data: Record<string, any>, id?: string) {
        // Can be overwritten, perform validation logic in subclasses
        // if error, should throw ValidationError
        return data;
    }
    
    protected async onUpdatedModel(data: Record<string, any>, create: boolean = false) {
        // Handle model updates here
    }
    protected async onDeletedModel(data: Record<string, any>) {
        // Handle model deletions here
    }
    protected async prepareCreateData(data: Record<string, any>): Promise<Record<string, any>> {
        // Prepare data for creation
        return data;
    }
    protected async prepareUpdateData(data: Record<string, any>, id: string) {
        // Prepare data for update
        return data;
    }
    protected updateFilteredFieldAndType(filteredFieldAndType: FieldDefinition): FieldDefinition {
        // Can be overridden to modify filtered fields and types
        if (this.widgets[filteredFieldAndType.column_name]) {
            filteredFieldAndType.data_type = this.widgets[filteredFieldAndType.column_name];
        }
        return filteredFieldAndType;
    }
    
    protected updateFilteredFieldAndTypes(filteredFieldAndTypes: FieldDefinition[]): FieldDefinition[] {
        // Can be overridden to modify filtered fields and types
        return filteredFieldAndTypes.map(f => this.updateFilteredFieldAndType(f));
    }
    async _do_update(id: string | number, data: Record<string, any>) {
        const model = this.getPrismaModel();
        const [pkName, pkVal] = this.parseIdValue(id.toString());
        const result = await this.prismaClient[model].update({
            where: { [pkName]: pkVal },
            data,
        });
        return this.applyPkToData(result);
    }
    async update(id: string, data: Record<string, any>, exclude?: string[] | null, fields?: string[] | null, filesData?: Record<string, File> | null) {
        const excludeFields = await this.getExcludeFields();
        const allExcludeFields = excludeFields.concat(exclude || []);
        if (!await this.canUpdateObject(null, { pk: id })) {
            return null;
        }
        let validatedData = await this.prepareUpdateData(await this._validateData(await this.validateCreateData(data, fields, allExcludeFields, filesData), id), id);
        if (filesData && Object.keys(filesData).length > 0) {
            const preProcessedData = await this.preProcessFiles(id, validatedData, filesData || null);
            if (preProcessedData) {
                validatedData = { ...validatedData, ...preProcessedData };
            }
        }
        const result = await this._do_update(id, validatedData);
        if (filesData && Object.keys(filesData).length > 0) {
            await this.postProcessFiles(id, validatedData, filesData || null);
        }
        await this.onUpdatedModel(result, false);
        return result;
    }
    async _do_delete(id: string | number) {
        const model = this.getPrismaModel();
        const [pkName, pkVal] = this.parseIdValue(id.toString());
        return await this.prismaClient[model].delete({
            where: { [pkName]: pkVal },
        });
    }
    async delete(id: string) {
        const model = this.getPrismaModel();
        if (!await this.canDeleteObject(null, { id })) {
            return false;
        }
        const result = await this._do_delete(id);
        this.onDeletedModel(result);
        return true;
    }
    async count(filters: Record<string, any> = {}) {
        const model = this.getPrismaModel();
        const filtersData = this.getFiltersClause(filters, this.searchFields);
        return await this.prismaClient[model].count({
            where: filtersData,
        });
    }
    async exists(id: string) {
        const model = this.getPrismaModel();
        const count = await this.prismaClient[model].count({
            where: { id },
        });
        return count > 0;
    }
    async findOne(filters: Record<string, any> = {}) {
        const model = this.getPrismaModel();
        const filtersData = this.getFiltersClause(filters, this.searchFields);
        return await this.prismaClient[model].findFirst({
            where: filtersData,
        });
    }
    async findMany(filters: Record<string, any> = {},
        options: Record<string, any> = {}) {
        const model = this.getPrismaModel();
        const filtersData = this.getFiltersClause(filters, this.searchFields);
        return await this.prismaClient[model].findMany({
            where: filtersData,
            ...options,
        });
    }
    async getListDisplayFields() {
        return this.ensureListDisplayFields();
    }
    async getFieldDependencies() {
        return this.fieldDependencies;
    }
    async getInlines() {
        return this.inlines;
    }
    async getListFilterFields() {
        return this.listFilterFields;
    }
    async getSearchFields() {
        return this.searchFields;
    }
    async getOrderingFields() {
        return this.orderingFields;
    }
    async getActions() {
        return this.actions;
    }
    async canDeleteObject(request: any, item: Record<string, any> | null) {
        // This method should be overridden in the derived class to check if the object can be deleted
        return true;
    }
    async canAddObject(request: any) {
        // This method should be overridden in the derived class to check if the object can be added
        return true;
    }
    async canUpdateObject(request: any, item: any) {
        // This method should be overridden in the derived class to check if the object can be updated
        return true;
    }
    async canViewItem(req: any, item: any) {
        // This method should be overridden in the derived class to check if the item can be viewed
        return true;
    }
    async performAction(request: any, user: any, action: string, ids: string[]) {
        // This method should be overridden in the derived class to perform the action
        const fn = (this as any)[action];
        if (!this.actions.map((a) => a.key).includes(action)) {
            throw new Error(`Action ${action} is not allowed for model ${this.prismaModel}`);
        }
        if (typeof fn !== 'function') {
            throw new Error(`Action ${action} is not implemented in ${this.prismaModel}`);
        }
        try {
            return await fn.call(this, request, user, ids);
        } catch (error) {
            throw new ApiResponseError(`Error performing action ${action} on model ${this.prismaModel}: ${error}`, 500);
        }
    }
    parseIdValues(ids: string[]): [string, (string | number)[]] {
        const fields = this.getFieldsFromDMMF();
        const idField = fields.find(f => f.isId);
        if (!idField) {
            throw new Error('No ID field found for model ' + this.getPrismaModel());
        }
        if ((idField.type || '').toLowerCase() === 'int') {
            return [idField.name, ids.map(id => parseInt(id, 10) as number)];
        }
        return [idField.name, ids];
    }
    fixFieldValue(fieldName: string, value: any) {
        const fieldDef = this.getFieldDefFromDMMF(fieldName);
        if (!fieldDef) {
            return value;
        }
        if ((fieldDef.type || '').toLowerCase() === 'int') {
            return parseInt(value.toString(), 10);
        }
        return value;
    }

    protected getActionWhereClause(ids: ActionIdsType) {
        if (ids === 'all') {
            return {};
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error('Invalid or empty ids array');
        }
        const [idName, newIds] = this.parseIdValues(ids);
        return { [idName]: { in: newIds } };
    }
    async deleteSelected(request: any, user: any, ids: ActionIdsType) {
        const model = this.getPrismaModel();
        const whereClause = this.getActionWhereClause(ids);
        try {
            return await this.prismaClient[model].deleteMany({
                where: whereClause,
            });
        } catch (error: any) {
            console.error(`Error deleting items from model ${model}:`, error);
            throw new ApiResponseError(`Failed to delete items from model ${model}. Original message: ${error.message}`, 500);
        }
    }
    async getExtraFields(request?: any, item?: any) {
        return this.extraFields;
    }
    async getAutocompleteItems(targetModelInstance: BaseAdminModel, keyField: string, query: string, depData: Record<string, any>) {
        const model = this.getPrismaModel();
        const rels = await this.getOneToOneRelationsFromDMMF();
        const relation = rels.relations.find((rel: any) => rel.from.dbField === keyField);
        if (!relation) {
            throw new Error(`Relation for key field ${keyField} not found in model ${model}`);
        }
        const selectMainKey = relation.to.dbField;
        // const qset = targetModelInstance.getBaseQset();
        const preserveSearchFields = this.searchFields;
        this.searchFields = this.autoCompleteSearchFields || this.searchFields;
        const items = await targetModelInstance.filterItems(0, {_q: query, ...depData}, {[selectMainKey]: true}, 50);
        this.searchFields = preserveSearchFields;
        
        // const items = await qset.findMany({
        //     select: {
        //         [selectMainKey]: true,
        //         ...this.getSelectClause(autocompleteConf.displayFields),
        //     },
        //     where: this.getFiltersClause({_q: query, ...depData}, this.autoCompleteSearchFields || this.searchFields),
        //     take: 50, // Limit the number of results
        // });
        const result: Record<'value' | 'label', string>[] = [];
        await Promise.all(items.map(async (item: any) => {
            const value = item[selectMainKey];
            if (value) {
                // const labelParts = autocompleteConf.displayFields.map((field) => getValueFromQsetObject(item, field));
                // const label = labelParts.join(' ');
                const label = await targetModelInstance.getLabelFromObject(item);
                result.push({ value, label });
            }
        }));
        return result;
    }

    getFieldsFromDMMF(): DMMMFieldType[] {
        const model = this.getPrismaModel(false);
        const dmmf = Prisma.dmmf;
        
        const modelDef = dmmf.datamodel.models.find(m => m.name === model);
        
        if (!modelDef) {
            throw new Error(`Model ${model} not found in DMMF`);
        }
        return modelDef.fields.map(field => {
            return {
                name: field.name,
                type: field.type,
                kind: field.kind,
                isRequired: !!field.isRequired,
                isList: !!field.isList,
                isUnique: !!field.isUnique,
                isId: !!field.isId,
                hasDefaultValue: !!field.hasDefaultValue,
                default: field.default,
                relationName: field.relationName || undefined,
                relationFromFields: field.relationFromFields || undefined,
                relationToFields: field.relationToFields || undefined,
                isUpdatedAt: !!field.isUpdatedAt,
            }});
    }
    getFieldDefFromDMMF(fieldName: string): DMMMFieldType | undefined {
        const fieldDef = this.getFieldsFromDMMF().find(f => f.name === fieldName);
        return fieldDef;
    }
    async getOneToOneRelationsFromDMMF(): Promise<OneToOneRelationsResultType> {
        const model = this.getPrismaModel(false);
        const dmmf = Prisma.dmmf;
        
        const modelDef = dmmf.datamodel.models.find(m => m.name === model);
        
        if (!modelDef) {
            throw new Error(`Model ${model} not found in DMMF`);
        }

        const allFields = this.getFieldsFromDMMF();
        const relationFields = allFields.filter(field => field.relationName);
        const relations = relationFields.filter(field => !field.isList && field.relationName);
        
        return {
            model: modelDef.name,
            relations: relations.map(rel => ({
                from: {
                    field: rel.name,
                    dbField: rel.relationFromFields?.[0] || '',
                },
                to: {
                    model: rel.type,
                    relationName: rel.relationName,
                    field: rel.relationToFields?.[0] || '',
                    dbField: rel.relationToFields?.[0] || '',
                },
                isRequired: rel.isRequired,
                isId: rel.isId,
            })),
        };
    }

    async getRelationToLabelMap(
        item: FindByIdType | null,
        relations: GetOneToOneRelationsFromDMMF,
        relationModelsToAdminInstanceMap: RelationModelsToAdminInstanceMap
    ): Promise<Record<string, string>> {
        const relationToLabelMap: Record<string, string> = {};
        await Promise.all(relations.relations.map(async (relation) => {
            const relationModel = relation.to.model;
            const relationAdminInstance = relationModelsToAdminInstanceMap[relationModel]?.adminModel;
            if (!relationAdminInstance) {
                return; // Skip if no admin instance found for the relation model
            }
            const relationField = relation.to.field;
            const destKey = relation.from.dbField;
            const relatedItemId = item ? item[destKey] : null;
            if (relatedItemId) {
                // const displayFields = relationModelsToAdminInstanceMap[relationModel]?.adminModel.;
                const relatedItem = await relationAdminInstance.findByUniqueField(relatedItemId, relationField, relationAdminInstance.ensureListDisplayFields());
                if (relatedItem) {
                    const label = await relationAdminInstance.getLabelFromObject(relatedItem);
                    relationToLabelMap[destKey] = label;
                } else {
                    relationToLabelMap[destKey] = '';
                }
            } else {
                relationToLabelMap[destKey] = '';
            }
        }));
        return relationToLabelMap;
    }
    async formatItem(item: any) {
        // Format the item for display, can be overridden in derived classes

        const excludeFields = await this.getExcludeFields();
        const pkField = this.findPkField();
        if (item[pkField] !== undefined) {
            item['$pk'] = item[pkField];
        }
        if (excludeFields.length > 0) {
            excludeFields.forEach((field) => {
                delete item[field];
            });
        }
        return item;
    }

    async getPrismaModelRelationsFromDMMF(): Promise<DMMFModelRelationsType> {
        const model = this.getPrismaModel(false);
        const dmmf = Prisma.dmmf;
        
        const modelDef = dmmf.datamodel.models.find(m => m.name === model);
        
        if (!modelDef) {
            throw new Error(`Model ${model} not found in DMMF`);
        }

        const allFields = this.getFieldsFromDMMF();
        const relationFields = allFields.filter(field => field.relationName);
        
        const relations: DMMFRelationType = {
            oneToOne: relationFields.filter(field => !field.isList && field.relationName),
            oneToMany: relationFields.filter(field => field.isList),
            manyToOne: relationFields.filter(field => !field.isList && (field.relationFromFields?.length || 0) > 0)
        };

        return {
            model: modelDef.name,
            relations,
            allRelationFields: relationFields
        };
    }
    findPkField(): string {
        const fields = this.getFieldsFromDMMF();
        const pkField = fields.find(f => f.isId);
        if (!pkField) {
            throw new Error(`No primary key field found for model ${this.getPrismaModel()}`);
        }
        return pkField.name;
    }
    async getRelationFilters(relModelInstance: BaseAdminModel, foundRelation: GetOneToOneRelationsFromDMMFElement): Promise<{ label: string, value: any }[]> {
        /*
          to be used for filtering by related items in the sidebar filters on the list items page
        */
        // const model = relModelInstance.getPrismaModel();
        const pkField = relModelInstance.findPkField();
        const items = await relModelInstance.filterItems(undefined, {}, {
            [pkField]: true,
            [foundRelation.to.dbField]: true,
        });
        return await Promise.all(items.map(async (item: any) => {
            return {
                value: item[foundRelation.to.dbField],
                label: await relModelInstance.getLabelFromObject(item)
            };
        }));
    }
    async getInlineItems(inlines: InlineDefinition[], idItem: string, relationModelsToAdminInstanceMap: RelationModelsToAdminInstanceMap) {
        const myModel = this.getPrismaModel(false);
        const revRelations = (await this.getPrismaModelRelationsFromDMMF());
        const possibleModelsForInlines = revRelations.relations.oneToMany.map(rel => rel.type);
        const relationsToInline = inlines.filter(inline => (!inline.model.startsWith('$')) && possibleModelsForInlines.includes(inline.model));
        if (relationsToInline.length === 0) {
            return {} as InlineItemTypeMap;
        }
        const modelToIdListMap: InlineItemTypeMap = {};
        await Promise.all(relationsToInline.map(async (inline) => {
            if (inline.model.startsWith('$')) {
                modelToIdListMap[inline.model] = { items: [], exclude: '' };
                return;
            }
            const relAdminInstance = relationModelsToAdminInstanceMap[inline.model.toLowerCase()]?.adminModel;
            if (relAdminInstance) {
                const relModel = relAdminInstance.getPrismaModel();
                const relRelations = await relAdminInstance.getOneToOneRelationsFromDMMF();
                const relRetationsConf = relRelations.relations.find((rel: any) => {
                    if (inline.toField && rel.from.dbField !== inline.toField) {
                        return false; // Skip if the relation does not match the inline's toField
                    }
                    return rel.to.model === myModel;
                });
                const whereField = relRetationsConf?.from.dbField;
                // const whereFieldTp = relRetationsConf?.from.
                const extraParams: any = {};
                if (inline.orderBy && inline.orderBy.length > 0) {
                    extraParams.orderBy = await relAdminInstance.defaultOrderingClause(inline.orderBy);
                }
                if (whereField) {
                    const relModelDef = relAdminInstance.getFieldDefFromDMMF(whereField);
                    let idRel: string | number = idItem;
                    if (relModelDef?.type.toLowerCase() === 'int') {
                        // Fix the idItem type
                        idRel = parseInt(`${idItem}`, 10);
                    }
                    const pkField = relAdminInstance.findPkField();
                    const items = await relAdminInstance.prismaClient[relModel].findMany({
                        select: {
                            [pkField]: true,
                        },
                        where: {
                            [whereField]: idRel,
                        },
                        ...extraParams,
                    });
                    const excludeFieldsSet = new Set(inline.excludeFields || []);
                    excludeFieldsSet.add(whereField);
                    modelToIdListMap[inline.model] = {
                        items: items.map((item: any) => item[pkField]),
                        exclude: Array.from(excludeFieldsSet).join(','),
                        revRelation: {field: whereField, value: idItem},
                    };
                }
            }
        }));
        return modelToIdListMap;
    }
    async saveInlines(idItem: string, existingItems: Record<string, ExistingFormData[]>, newItems: Record<string, NewFormData[]>, adminMap: RelationModelsToAdminInstanceMap, filesDataMap?: InlineFileDataType ) {
        const myModel = this.getPrismaModel(false);
        await Promise.all(Object.keys(existingItems).map(async (model) => {
            if (!adminMap[model]) {
                throw new Error(`Model ${model} not found in admin map`);
            }
            const relAdminInstance = adminMap[model].adminModel;
            const filesDataForModel = filesDataMap?.[model]?.existingItems;
            await Promise.all(existingItems[model].map(async (existingItem, index) => {
                const data = existingItem.formData;
                if (existingItem.id) {
                    const filesObjects = filesDataForModel?.[index] || null;
                    // filesDataMap?.existingItems
                    await relAdminInstance.update(existingItem.id, data, null, null, filesObjects);
                }
            }));
        }));
        await Promise.all(Object.keys(newItems).map(async (model) => {
            if (!adminMap[model]) {
                throw new Error(`Model ${model} not found in admin map`);
            }
            const relAdminInstance = adminMap[model].adminModel;
            const filesDataForModel = filesDataMap?.[model]?.newItems;
            await Promise.all(newItems[model].map(async (newItem, index) => {
                const data = newItem.formData;
                // FIXME
                const myRelations = await this.getOneToOneRelationsFromDMMF();
                const relRelations = await relAdminInstance.getOneToOneRelationsFromDMMF();
                const relation = relRelations.relations.find(rel => rel.to.model === myModel);
                if (relation) {
                    relAdminInstance.fixFieldValue(relation.from.dbField, idItem)
                    data[relation.from.dbField] = idItem; // Set the relation field to the current item ID
                    const filesObjects = filesDataForModel?.[index] || null;
                    await relAdminInstance.create(data, null, null, filesObjects);
                }
            }));
        }));
    }
}

export type GetPrismaModelFieldsAndTypes = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getPrismaModelFieldsAndTypes
>>;
export type GetTotalCountType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getTotalCount
>>;
export type FilterItemsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.filterItems
>>;
export type FindByIdType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.findById
>>;
export type CreateType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.create
>>;
export type UpdateType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.update
>>;
export type DeleteType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.delete
>>;
export type CountType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.count
>>;
export type ExistsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.exists
>>;
export type FindOneType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.findOne
>>;
export type FindManyType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.findMany
>>;
export type GetListDisplayFieldsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getListDisplayFields
>>;
export type GetListFilterFieldsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getListFilterFields
>>;
export type GetSearchFieldsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getSearchFields
>>;
export type GetOrderingFieldsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getOrderingFields
>>;
export type GetActionsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getActions
>>;
export type GetOneToOneRelationsFromDMMF = OneToOneRelationsResultType;

export type GetOneToOneRelationsFromDMMFElement = ArrayElement<GetOneToOneRelationsFromDMMF['relations']>;

export type GetPrismaModelRelationsFromDMMF = DMMFModelRelationsType;
export type GetRelationToLabelMapType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getRelationToLabelMap
>>;
export type GetInlineItemsType = Awaited<ReturnType<
    typeof BaseAdminModel.prototype.getInlineItems
>>;

export class TreeAdminBase extends BaseAdminModel {
    protected manager: TreeManager<any> | null = null;
    constructor(prisma: PrismaClient) {
        super(prisma);
    }

    override async getExcludeFields(): Promise<string[]> {
        const parentExcludeFields = await super.getExcludeFields();
        return Array.from(new Set([...parentExcludeFields, 'path', 'depth']));
    }
    
    override async getOrderingFields() {
        return ['path'];
    }
    async getRelativeObjects(request: any, item?: any) {
        const pkField = this.findPkField();
        const filters = (item) ? {[`${pkField}__$not`]: item?.[pkField]} : {};
        return await this.filterItems(undefined, filters);
    }
    override async getExtraFields(request: any, item?: any) {
        const model = this.getPrismaModel();
        const items =  await this.getRelativeObjects(request, item);
        const pkField = this.findPkField();

        return [
            {
                field: 'relative_object',
                label: 'Relative Object',
                required: false,
                type: 'choice',
                choices: await Promise.all(items.map(async (it: any) => ({
                    label: await this.getLabelFromObject(it),
                    value: it[pkField],
                }))),
            },
            {
                field: 'position',
                label: 'Position',
                type: 'choice',
                choices: [
                    {
                        label: 'first child',
                        value: 'first_child',
                    },
                    {
                        label: 'after',
                        value: 'after',
                    },
                    {
                        label: 'before',
                        value: 'before',
                    }
                ]
            }
        ] as ExtraFieldDefinition[];
    }
    
    protected ensureManager() {
        this.manager = this.manager || new TreeManager(this.getBaseQset());
        return this.manager;
    }

    override async _do_create(data: Record<string, any>): Promise<any> {
        this.ensureManager();
        if (!this.manager) {
            throw new Error('Tree manager not initialized');
        }
        const { relativeObjectId, position, ...restData } = data;
        const relativeObject = (relativeObjectId) ? await this.findById(relativeObjectId) : null;
        const newNodeData = restData;
        let newNode;
        if (relativeObject) {
            if (position === 'first_child') {
                newNode = await this.manager.addChild(relativeObject, newNodeData);
            } else if (position === 'after') {
                newNode = await this.manager.addSibling(relativeObject, newNodeData, 'right');
            } else if (position === 'before') {
                newNode = await this.manager.addSibling(relativeObject, newNodeData, 'left');
            } else {
                throw new ValidationError('Invalid position value', [
                    { field: 'position', message: 'must be one of first_child, after, before', code: 'invalid_value' },
                ]);
            }
        } else {
            newNode = await this.manager.addRoot(newNodeData);
        }
        return newNode;
    }
    override async _do_update(id: string, data: Record<string, any>): Promise<any> {
        this.ensureManager();
        if (!this.manager) {
            throw new Error('Tree manager not initialized');
        }
        const { relativeObjectId, position, ...restData } = data;
        const node = await this.findById(id);
        if (!node) {
            throw new Error(`Node with id ${id} not found`);
        }
        const relativeObject = (relativeObjectId) ? await this.findById(relativeObjectId) : null;
        let updatedNode;
        if (relativeObject) {
            if (position === 'first_child') {
                updatedNode = await this.manager.move(node, relativeObject, 'first-child');
            } else if (position === 'after') {
                updatedNode = await this.manager.move(node, relativeObject, 'right');
            } else if (position === 'before') {
                updatedNode = await this.manager.move(node, relativeObject, 'left');
            } else {
                throw new ValidationError('Invalid position value', [
                    { field: 'position', message: 'must be one of first_child, after, before', code: 'invalid_value' },
                ]);
            }
            if (Object.keys(restData).length > 0) {
                // Update other fields if any
                updatedNode = await super._do_update(id, restData);
            }
        } else {
            // Just update other fields
            updatedNode = await super._do_update(id, restData);
        }
        return updatedNode;
    }
    override async _do_delete(id: string) {
        const manager = this.ensureManager()!;
        const obj = await this.findById(id);
        // const deleteMethod = this.delete.bind(this);
        manager.delete(obj);
    }
    override async performAction(request: any, user: any, action: string, ids: string[]) {
        this.ensureManager();
        return super.performAction(request, user, action, ids);
    }
    override async filterItems(page: number | undefined, filters: Record<string, any> = {}, extraFields?: Record<string, any>, take: number = 100) {
        const listDisplayFields = await this.getListDisplayFields();
        const idx = listDisplayFields.length > 1 ? 1 : 0;
        const fieldToGet = listDisplayFields[idx].split('|')[0];
        const items = await super.filterItems(page, filters, {...(extraFields || {}), ['depth']: true}, take);
        const newItems = items.map(item => {
            // we need to add spaces (the depth) at the beginning
            const depth = item['depth'] || 0;
            return {
                ...item,
                [fieldToGet]: ' '.repeat(depth) + (item[fieldToGet] || 'null').toString(),
            };
        });
        return newItems;
    }
}

export type AdminDefinition = {
    cls: typeof BaseAdminModel;
    name: string;
    managed?: boolean;  // we can switch this off if we want to use it only for autocomplete
}

export type AdminDefinitionMap = Record<string, AdminDefinition>;

export type RelationModelsToAdminInstanceMap = Record<string, {adminModel: BaseAdminModel}>;

export type FieldRelationConf = {
    field: string;
    dbField: string;
    idField: string;
    adminInstance: BaseAdminModel | undefined;
};

export type CommonReturnModelItemType = {
    title?: string;
    pkFieldName: string;
    item: FindByIdType | null;
    fieldsAndTypes: GetPrismaModelFieldsAndTypes;
    filterTypes: Record<string, {label: string, value: any}[]>;
    relations: GetOneToOneRelationsFromDMMF;
    relationToLabelMap?: Record<string, string>;
    readonlyFields: string[];
    fieldToLabelMap: Record<string, any>;
    fieldsConfig: Record<string, any>;
    fieldDependencies?: FieldDependencies;
    inlines?: InlineDefinition[];
    inlineItems?: GetInlineItemsType;
    canDeleteItem?: boolean;
    extraFields?: ExtraFieldDefinition[];
};
