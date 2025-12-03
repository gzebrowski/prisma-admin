import { ExistingFormData, InlineFileDataType, NewFormData } from "./models";

export async function restructureFileData(
    existingItems: Record<string, ExistingFormData[]>,
    newItems: Record<string, NewFormData[]>,
    filesData?: InlineFileDataType | null,
    processInlineFile?: (fieldName: string, model: string, file: File, idItem?: string | number | null) => Promise<string | null>,
) {
    if (filesData) {
        for (const inlineModel in filesData) {
            const inlineFilesData = filesData[inlineModel];
            for (const itemType of ['existingItems', 'newItems'] as const) {
                for (const index in inlineFilesData[itemType]) {
                    const fieldFiles = inlineFilesData[itemType][index];
                    const processedFilesData: Record<string, string> = {};
                    for (const fieldName in fieldFiles) {
                        const file = fieldFiles[fieldName];
                        const idForFile = itemType === 'existingItems' ? existingItems[inlineModel]?.[Number(index)]?.id : null;
                        
                        const filePath = processInlineFile ? await processInlineFile(fieldName, inlineModel, file, idForFile) : null;
                        if (filePath) {
                            processedFilesData[fieldName] = filePath;
                        }
                    }
                    // Merge processed file paths into the corresponding form data
                    if (itemType === 'existingItems' && existingItems[inlineModel]?.[Number(index)]) {
                        existingItems[inlineModel][Number(index)].formData = {
                            ...existingItems[inlineModel][Number(index)].formData,
                            ...processedFilesData,
                        };
                    } else if (itemType === 'newItems' && newItems[inlineModel]?.[Number(index)]) {
                        newItems[inlineModel][Number(index)].formData = {
                            ...newItems[inlineModel][Number(index)].formData,
                            ...processedFilesData,
                        };
                    }
                }
            }
        }
    }
    return { existingItems, newItems };
}
