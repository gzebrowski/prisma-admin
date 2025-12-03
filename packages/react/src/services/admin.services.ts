import { ApiClient, ListOfFFiles } from '../api/client';
import { 
    CommonReturnModelItemType,
    InlineExistingItemsData,
    InlineNewItemsData,
    CommonPostResult, 
    ActionIdsType, 
    GetModelsType,
    GetModelItemsType,
    InlineFileDataType,
    FilesMapFormat
} from '../../../core/src';
import { AutoCompleteOption } from '../components/ui';


export type UserData = {
	id: string;
	name: string;
	email: string;
};

export type InlineFilesDataType = Record<
    'existingItems' | 'newItems',
    Record<
        string, // modelName
        Record<
            string, // array key (id for existingItems, idx for newItems)
            Record<
                string, // fieldName
                File
                >
            >
        >
    >

export class AdminService {
    private apiService: ApiClient;

    constructor() {

        this.apiService = new ApiClient('/api/admin/');
    }
    async getAllModels() {
        return await this.apiService.get<GetModelsType>('models');
    }
    async getModelItems(model: string, page: number = 0, filters: Record<string, any> = {}) {
        const result = await this.apiService.get<GetModelItemsType>(`items/${model}`, {
            p: page,
            ...filters,
        });
        return result;
        // console.log(result.data);
    }
    async getModelItem(model: string, idItem: string, extraApiParams?: Record<string, any>) {
        return await this.apiService.get<CommonReturnModelItemType>(`items/${model}/${idItem}`, extraApiParams);
    }
    async performAction(model: string, action: string, idList: ActionIdsType) {
        const response = await this.apiService.post(`items/${model}/actions/${action}`, {
            ids: idList,
        });
        return response;
    }
    async updateModelItem(model: string, idItem: string, data: Record<string, any>, filesData?: Record<string, File> | null): Promise<CommonPostResult> {
        const url = (filesData && Object.keys(filesData).length > 0) ? `items-with-files/${model}/${idItem}` : `items/${model}/${idItem}`;
        const response = await this.apiService.put(url, data, null, filesData);
        return response;
    }
    async saveInlines(model: string, idItem: string, existingItems: InlineExistingItemsData, newItems: InlineNewItemsData, filesData?: InlineFilesDataType | null): Promise<CommonPostResult> {
        const dt = { existingItems, newItems } as any;
        const filesMap: FilesMapFormat = {};
        let fileIdx = 0;
        const fileList: ListOfFFiles = [];
        if (filesData) {
            ['existingItems', 'newItems'].forEach((itemTp) => {
                const itemType = itemTp as 'existingItems' | 'newItems';
                const itemsOfFileData = filesData[itemType];
                const idKey = (itemType === 'existingItems') ? 'id' : 'idx';

                for (const inlineModel in itemsOfFileData) {
                    if (filesMap[inlineModel] === undefined) {
                        filesMap[inlineModel] = { existingItems: {}, newItems: {} };
                    }
                    const idKeyFromDtToIndexMap = dt[itemType][inlineModel].reduce((acc: Record<string, number>, curr: any, index: number) => {
                        acc[curr[idKey].toString()] = index;
                        return acc;
                    }, {});


                    const fieldFiles = itemsOfFileData[inlineModel];
                    for (const itemKey in fieldFiles) {
                        const fileFieldData = fieldFiles[itemKey];
                        const indexInDtArray = idKeyFromDtToIndexMap[itemKey];
                        if (indexInDtArray === undefined) {
                            continue;
                        }
                        if (filesMap[inlineModel][itemType][indexInDtArray] === undefined) {
                            filesMap[inlineModel][itemType][indexInDtArray] = {};
                        }
                        for (const fieldName in fileFieldData) {
                            const fileObj = fileFieldData[fieldName];
                            fileList.push(fileObj);
                            filesMap[inlineModel][itemType][indexInDtArray][fieldName] = fileIdx;
                            fileIdx++;
                        }
                    }
                }

            });
        }
        if (fileIdx > 0) {
            dt['__files'] = filesMap;
            return await this.apiService.put(`inlines-with-files/${model}/${idItem}`, dt, null, fileList);
        }
        return await this.apiService.put(`inlines/${model}/${idItem}`, dt, null);
    }

    async getModelMetadata(model: string, extraApiParams?: Record<string, any>): Promise<CommonReturnModelItemType> {
        const response = await this.apiService.get(`models/${model}`, extraApiParams);
        return response;
    }
    async createModelItem(model: string, data: Record<string, any>, filesData?: Record<string, File> | null): Promise<CommonPostResult> {
        const url = (filesData && Object.keys(filesData).length > 0) ? `items-with-files/${model}` : `items/${model}`;
        const response = await this.apiService.post(url, data, null, filesData);
        return response;
    }
    async getAutocompleteOptions(model: string, targetModel: string, keyField: string, query: string, depData: Record<string, any>): Promise<AutoCompleteOption[]> {
        const response = await this.apiService.post(`autocomplete/${model}`, { keyField, query, targetModel, depData });
        return response;
    }
    async deleteObject(model: string, idItem: string) {
        const response = await this.apiService.delete(`items/${model}/${idItem}`);
        return response;
    }
    async getModelItemIdByUniqueField(newModel: string, relationField: string, itemId: string): Promise<string> {
        const response = await this.apiService.get(`get-id-by-unique/${newModel}`, {
            params: {
                field: relationField,
                value: itemId,
            },
        });
        return response.data;
    }
}
