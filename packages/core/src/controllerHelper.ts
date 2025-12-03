import { FilesMapFormat, InlineFileDataType, InlineItemsData } from "./models";

export function reformatInlineFilesData(
    data: InlineItemsData,
    filesMap: FilesMapFormat,
    files?: File[],
): InlineFileDataType {
    const filesData = {} as InlineFileDataType;
    if (files) {
        ['newItems', 'existingItems'].forEach(key => {
            if (key === 'newItems' || key === 'existingItems') { // just to satisfy TS checker
                Object.keys(data[key]).forEach(modelName => {
                    if (!filesData[modelName]) {
                        filesData[modelName] = {existingItems: {}, newItems: {}};
                    }
                    //filesData[modelName][key] = {} as Record<string, Record<number, File>>;
                    const filesModelKeyObj = filesMap?.[modelName]?.[key];
                    if (!filesModelKeyObj) {
                        return;
                    }
                    Object.keys(filesModelKeyObj).forEach(arrayIdx => {
                        const arrIdx = parseInt(arrayIdx, 10);
                        filesData[modelName][key][arrIdx] = {};
                        if (!filesModelKeyObj[arrayIdx]) {
                            return;
                        }
                        Object.keys(filesModelKeyObj[arrayIdx]).forEach((fieldName) => {
                            const fileIndex = filesModelKeyObj[arrayIdx][fieldName];
                            filesData[modelName][key][arrIdx][fieldName] = files[fileIndex];
                        });
                    });
                });
            }
        });
    }
    return filesData;
}
