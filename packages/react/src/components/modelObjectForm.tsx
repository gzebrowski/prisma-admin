import React, { useState, useEffect, useCallback } from 'react';
import { EditIcon as PencilIcon, PlusIcon, X, ExternalLink } from './ui/icons';
import { v4 as uuidv4 } from 'uuid';
import { getDate } from '../utils/utils';
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
	TableHeader,
	TableHead,
	Textarea,
	Checkbox,
	Input,
	Button,
	Card,
	CardContent,
	CardTitle,
} from './ui/simpleComponents';

import { Calendar } from './calendar';
import { DatetimePicker } from './datetimePicker';

import { AutoComplete, AutoCompleteOption } from './autocomplete';

import { DateTime } from 'luxon';

import { AdminService } from '../services/admin.services';
import {
	splitCamelCaseWords,
	CommonReturnModelItemType,
	CommonPostResult,
	FieldConfig,
	FieldDefinition,
	FieldDependencies,
	InlineDefinition,
} from '../../../core/src';

import { useAdminAlert } from '../context/adminAlerts';

import { LoadingSpinner } from './loadingSpinner';

export type SaveVariant = 'save' | 'saveAndAddNew' | 'saveAndStay';

type CommonObjectProps = {
	model: string;
	idx?: number;
	onSave?: (
		data: Record<string, any>,
		saveVariant: SaveVariant,
		id?: string,
	) => void;
	onDelete?: (model: string, itemId: string, idx?: number) => void;
	onInlineUpdate?: (
		itemId: string | undefined | null,
		idx: number | undefined | null,
		isValid: boolean,
		data: Record<string, any>,
		typesMap?: Record<string, string>,
	) => void;
	onCancel?: () => void;
	onError?: (error: Error) => void;
	onSaveError?: (error: CommonPostResult) => void;
	onModelRetrieve?: (data: CommonReturnModelItemType) => void;
	onRedirect?: (newModel: string, itemId: string) => void;
	inlineMode?: boolean; // Optional prop to indicate if the form is in inline mode
	childrenValid?: boolean; // Optional prop to indicate if the children are valid
	extraApiParams?: Record<string, any>;
	extraConfig?: InlineDefinition; // Optional extra configuration for the form
	layoutType?: 'stacked' | 'inline' | 'auto';
	customUpdate?: (
		model: string,
		itemId: string | undefined | null,
		data: Record<string, any>,
	) => Promise<CommonPostResult>; // Custom update function for the form
	customCreate?: (
		model: string,
		data: Record<string, any>,
	) => Promise<CommonPostResult>; // Custom create function for the form
	canAddItem?: boolean; // Optional prop to indicate if the form can add items
	errorMap?: Record<string, string> | null; // Optional prop to map field names to error messages
	showTopButtons?: boolean;
    canDelete?: boolean;
	revRelationData?: {field: string, value: any} | null;
	onInlineFileUpload?: (
		inlIdx: string | undefined | null,
		field: string,
		file: File,
	) => void;

	children?: React.ReactNode; // Optional children prop for additional content
};
type AddObjectProps = CommonObjectProps & {
	mode: 'create';
	itemId?: undefined;
};

type EditObjectProps = CommonObjectProps & {
	mode: 'edit';
	itemId: string;
};

type AddObjectOrEditProps = AddObjectProps | EditObjectProps;

type LabelForFieldProps = {
	field: string;
	fieldDef: FieldDefinition | undefined;
	isFieldRequired: (fieldDef: FieldDefinition | undefined) => boolean;
	labelMaps?: Record<string, string>;
};

const LabelForField: React.FC<LabelForFieldProps> = ({
	field,
	fieldDef,
	isFieldRequired,
	labelMaps,
}) => {
	return (
		<>
			<label>
				{labelMaps?.[field] || splitCamelCaseWords(field, true)}
				{isFieldRequired(fieldDef) && (
					<span className="admin-text-red-600 admin-pl-2">*</span>
				)}
			</label>
			{fieldDef?.help_text && (
				<div>
					<em className="admin-text-sm admin-text-muted-foreground admin-ml-2">
						{fieldDef.help_text}
					</em>
				</div>
			)}
		</>
	);
};

type ControlForFieldProps = {
	field: string;
	fieldDef: FieldDefinition | undefined;
	getFieldType: (field: string) => string;
	setFormValue: (field: string, value: any) => void;
	formatCellValue: (
		columnDefinition: FieldDefinition | undefined,
		value: any,
	) => any;
	getFieldDefaultValue: (field: string) => string | boolean;
	isFieldRequired: (fieldDef: FieldDefinition | undefined) => boolean;
	getSelectFieldOptions: (field: string) => AutoCompleteOption[];
	formData: Record<string, any>;
	filesData?: Record<string, File>;
	fieldsConfig: Record<string, FieldConfig>;
	updateAutocompleteInput: (field: string, value: string) => void;
	relationToLabelMap: Record<string, string | null>;
	fieldDependencies: FieldDependencies;
	setAutocompleteOption: (field: string, option: AutoCompleteOption) => void;
	currentOptions: Record<string, AutoCompleteOption[]>;
	clearAutocompleteField: (field: string) => void;
	redirectToRelative?: (newModel: string, itemId: string, relationField: string) => Promise<void>;
	relationsDefinition?: CommonReturnModelItemType['relations']['relations'];
	revRelationData?: {field: string, value: any} | null;
	uploadFile?: (field: string, file: File) => Promise<string | null>;
};

type SaveButtonsProps = {
	mode: 'create' | 'edit';
	model: string;
	itemId?: string;
	data: Record<string, any>;
	filesData?: Record<string, File> | null;
	onSave?: (
		data: Record<string, any>,
		saveVariant: SaveVariant,
		id?: string,
	) => void;
	onCancel?: () => void;
    onDelete?: () => void;
	onError?: (error: CommonPostResult) => void;
	canSubmit: () => boolean;
	updateModelItem: (
		model: string,
		itemId: string,
		data: Record<string, any>,
		filesData?: Record<string, File> | null,
	) => Promise<CommonPostResult>;
	createModelItem: (
		model: string,
		data: Record<string, any>,
		filesData?: Record<string, File> | null,
	) => Promise<CommonPostResult>;
	canAddItem?: boolean; // Optional prop to indicate if the form can add items
    canDelete?: boolean; // Optional prop to indicate if the form can delete items
};

const SaveButtons: React.FC<SaveButtonsProps> = ({
	onSave,
	onCancel,
    onDelete,
	onError,
	canSubmit,
	updateModelItem,
	createModelItem,
	mode,
	itemId,
	model,
	canAddItem,
    canDelete,
	data,
	filesData,
}) => {
	async function performSave(saveVariant: SaveVariant) {
		let result: CommonPostResult | null = null;
		if (mode === 'create') {
			result = await createModelItem(model, data, filesData);
		} else if (mode === 'edit') {
			result = await updateModelItem(model, itemId || '', data, filesData);
		}
		if (result?.status === 'success' && onSave) {
			onSave(data, saveVariant, result.data?.$pk); // pkFieldName
		} else if (result?.status === 'error' && onError) {
			onError(result);
		}
		return result;
	}
	return (
		<div>
			<Button
				disabled={!canSubmit()}
				onClick={() => performSave('save')}
				className="admin-mr-2">
				Save
			</Button>
			{canAddItem && (
				<Button
					disabled={!canSubmit()}
					onClick={() => performSave('saveAndAddNew')}
					className="admin-mr-2">
					Save and Add New
				</Button>
			)}
			<Button
				disabled={!canSubmit()}
				onClick={() => performSave('saveAndStay')}
				className="admin-mr-2">
				Save and Stay Here
			</Button>
			<Button
				variant="secondary"
				className='admin-mr-2'
				onClick={() => {
					if (onCancel) {
						onCancel();
					}
				}}>
				Cancel
			</Button>
			{ mode === 'edit' && canDelete && (
            <Button
                variant="danger"
				className='admin-ml-4'
				onClick={() => {
					if (onDelete) {
						onDelete();
					}
				}}>
				Delete
			</Button>
            )}
		</div>
	);
};

const ControlForField: React.FC<ControlForFieldProps> = ({
	field,
	fieldDef,
	getFieldType,
	setFormValue,
	formatCellValue,
	getFieldDefaultValue,
	isFieldRequired,
	getSelectFieldOptions,
	formData,
	filesData,
	fieldsConfig,
	updateAutocompleteInput,
	relationToLabelMap,
	fieldDependencies,
	setAutocompleteOption,
	currentOptions,
	clearAutocompleteField,
	redirectToRelative,
	relationsDefinition,
	revRelationData,
	uploadFile,
}) => {
	const checkDependency = (field: string): boolean => {
		if (!fieldDependencies || !fieldDependencies[field]) return false;
		return fieldDependencies[field].some((dep) => (!formData[dep] && (!revRelationData || revRelationData.field !== dep)));
	};
	const getWidget = (
		field: string,
		defaultWidget: any,
		params: Record<string, any>,
	) => {
		const fieldConf = fieldsConfig[field];
		let Result = defaultWidget;
		if (fieldConf?.widget) {
			if (fieldConf.widget === 'textarea') {
				Result = Textarea;
			} else if (fieldConf.widget === 'input') {
				Result = Input;
			} else if (fieldConf.widget === 'date') {
				Result = Calendar;
			} else if (fieldConf.widget === 'datetime') {
				Result = DatetimePicker;
			}
		}
		const extraAttrs = fieldConf?.attrs || {};
		const clsName = params?.className ? params.className + ' ' + (fieldConf?.className || '') : (fieldConf?.className || '');
		return <Result {...params} {...extraAttrs} className={clsName} />;
	};
	async function redirectToRelObject(field: string) {
		if (redirectToRelative && formData[field]) {
			// fieldDef?.column_name
			const toRelModel = relationsDefinition?.find(
				(rel) => rel.from.dbField === field,
			)?.to;
			// /const { , id } = relationToLabelMap[field];
			if (toRelModel) {
				await redirectToRelative(toRelModel.model, formData[field], toRelModel.dbField);
			}
		}
	}
	async function doUploadFile(field: string, file: File): Promise<string | null> {
		if (uploadFile) {
			return await uploadFile(field, file);
		}
		return null;
	}
	const fieldType = getFieldType(field);
	return (
		<>
			{fieldType === 'static' &&
				getWidget(field, Input, {
					type: 'text',
					value: formData[field] || '',
					readOnly: true,
				})}
			{fieldType === 'text' &&
				getWidget(field, Input, {
					type: 'text',
					value: formData[field] || '',
					onChange: (e: any) => {
						setFormValue(field, e.target.value);
					},
				})}
			{fieldType === 'textarea' &&
				getWidget(field, Textarea, {
					value:
						formatCellValue(fieldDef, formData[field]) ||
						getFieldDefaultValue(field),
					onChange: (e: any) => {
						setFormValue(field, e.target.value);
					},
					placeholder: `Enter ${field}`,
				})}
			{fieldType === 'datetime' && (
				<DatetimePicker
					value={
						formData[field]
							? getDate(formData[field])
							: undefined
					}
					onChange={(date) => {
						if (date) {
							setFormValue(field, DateTime.fromJSDate(date).toJSDate());
						}
					}}
				/>
			)}
			{fieldType === 'date' && (
				<Calendar
					placeholder='Select date'
					value={formData[field] ? new Date(formData[field]) : undefined}
					onChange={(selectedDate) => {
						if (selectedDate) {
							setFormValue(
								field,
								DateTime.fromJSDate(selectedDate).toISODate(),
							);
						}
					}}
				/>
			)}
			{fieldType === 'checkbox' && (
				<>
					{isFieldRequired(fieldDef) ? (
						<Checkbox
							checked={formData[field] ?? getFieldDefaultValue(field)}
							onCheckedChange={(checked) => {
								setFormValue(field, checked);
							}}
						/>
					) : (
						<>
							<select
								value={formData[field] ?? getFieldDefaultValue(field)}
								required={false}
								onChange={(e) => {
									setFormValue(field, e.target.value);

								}}>
								<option value="">----</option>
								<option value="true">Yes</option>
								<option value="false">No</option>
							</select>
						</>
					)}
				</>
			)}
			{fieldType === 'select' && (
				<select
					value={formData[field] || getFieldDefaultValue(field)}
					required={isFieldRequired(fieldDef)}
					onChange={(e) => {
						setFormValue(field, e.target.value);
					}}>
					<option value="">----</option>
					{getSelectFieldOptions(field).map((option) => (
						<option key={option.value} value={option.value}>
							{splitCamelCaseWords(option.label, true)}
						</option>
					))}
				</select>
			)}
			{fieldType === 'array' && (
				<Textarea
					value={
						formatCellValue(fieldDef, formData[field]) ||
						getFieldDefaultValue(field)
					}
					onChange={(e) => {
						setFormValue(
							field,
							e.target.value.split('\n').map((item) => item.trim()),
						);
					}}
					placeholder={`Enter ${field} (one value per line)`}
				/>
			)}
			{['number', 'float', 'int'].indexOf(fieldType) >= 0 && (
				<Input
					type="number"
					value={formData[field] || getFieldDefaultValue(field)}
					onChange={(e) => {
						setFormValue(field, (fieldType === 'int') ? parseInt(e.target.value, 10) : parseFloat(e.target.value));
					}}
					placeholder={`Enter ${field}`}
				/>
			)}
			{fieldType === 'relation' && (
				<>
					<div>
						<AutoComplete
							onInputChange={(value) => updateAutocompleteInput(field, value)}
							disabled={checkDependency(field)}
							showAllOptions={true}
							options={currentOptions[field] || []}
							emptyMessage="No options available"
							value={{
								value: (formData[field] === undefined
									? getFieldDefaultValue(field)
									: formData[field]) as string | null,
								label: relationToLabelMap[field],
							}}
							onValueChange={(value, label) => {
								if (value !== null && value !== undefined) {
									setAutocompleteOption(field, {value, label: label || ''});
								} else {
									clearAutocompleteField(field);
								}
							}}
						/>
					</div>
					{relationToLabelMap[field] && (
						<div>
							<em className="admin-text-sm admin-text-muted-foreground admin-inline-block">
								{relationToLabelMap[field]}
								<Button
									variant="ghost"
									className="admin-ml-2 admin-p-0"
									onClick={() => {
										clearAutocompleteField(field);
									}}>
									<X className="admin-h-4 admin-w-4" />
								</Button>
							</em>
							<span className="admin-text-sm admin-text-muted-foreground admin-inline-block admin-ml-1">
								<Button
									variant="ghost"
									className="admin-ml-2 admin-p-0"
									onClick={async () => {
										await redirectToRelObject(field);
									}}>
									<ExternalLink />
								</Button>
							</span>
						</div>
					)}
				</>
			)}
			{['file', 'files', 'image'].indexOf(fieldType) >= 0 && (
				<>
					{(formData[field] && !formData[field].startsWith('*REMOVE_FILE*__')) ? (
						<a href={formData['$' + field + '__url'] || formData[field]} target="_blank" rel="noreferrer" className={fieldType === 'image' ? 'image-content-link' : ''}>
							{fieldType === 'image' ? (
								<img src={formData['$' + field + '__thumbnail'] || formData['$' + field + '__url']} alt={field} />
							) : (
								formData[field]
							)}
						</a>
					) : (
						<span>No file uploaded</span>
					)}
					<input
						type="file"
						onChange={async (e) => {
							const file = e.target.files?.[0];
							if (file) {
								// Implement file upload logic here
								// For example, upload to server and get the URL
								await doUploadFile(field, file);
							}
						}}
					/>
					{ fieldDef?.is_nullable && formData[field] && (
						<label>
						<Checkbox 
							checked={formData[field] ? true : false}
							onCheckedChange={(checked) => {
								if (checked) {
									const newValue = formData[field].startsWith('*REMOVE_FILE*__') ? formData[field] : `*REMOVE_FILE*__${formData[field]}`;
									setFormValue(field, newValue);
								} else {
									// Restore previous value by removing the marker
									const restoredValue = formData[field].replace('*REMOVE_FILE*__', '');
									setFormValue(field, restoredValue);
								}
							}} />
						Remove existing file
						</label>
					)}

				</>
			)}
		</>
	);
};

type ErrorBoxProps = {
	errorMap?: Record<string, string> | null;
	field: string;
};

const ErrorBox: React.FC<ErrorBoxProps> = ({ errorMap, field }) => {
	const errorMessage = errorMap?.[field];
	if (!errorMessage) return null;

	return (
		<div className="error-box">
			<p className="error-message admin-p-1 admin-text-white admin-bg-red-600 admin-inline-block admin-my-1">
				{errorMessage}
			</p>
		</div>
	);
};

const ModelObjectForm: React.FC<AddObjectOrEditProps> = ({
	mode,
	idx,
	model,
	itemId,
	onSave,
	onCancel,
	onError,
	onSaveError,
	onModelRetrieve,
	onInlineUpdate,
	onDelete,
	onRedirect,
	inlineMode,
	extraApiParams,
	extraConfig,
	customUpdate,
	customCreate,
	layoutType,
	childrenValid = true,
	errorMap,
	canAddItem = true,
    canDelete = false,
	showTopButtons = false,
	revRelationData,
	onInlineFileUpload,
	children,
}) => {
	const [formData, setFormData] = useState<Record<string, any>>({});
	const [fieldTypesMap, setFieldTypesMap] = useState<Record<string, string>>({});
	const [filesToUpload, setFilesToUpload] = useState<Record<string, File>>({});
	const [currentOptions, setCurrentOptions] = useState<
		Record<string, AutoCompleteOption[]>
	>({});
	const [relationToLabelMap, setRelationToLabelMap] = useState<
		Record<string, string | null>
	>({});
	const [readonlyFields, setReadonlyFields] = useState<string[]>([]);
	const [layoutTp, setLayoutTp] = useState<'stacked' | 'inline' | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);
	const [objectData, setObjectData] =
		useState<CommonReturnModelItemType | null>(null);

	const apiService = new AdminService();
	
	const { confirmBox } = useAdminAlert();
	useEffect(() => {
		const result = objectData;
		if (!result) return;
		if (result.relationToLabelMap) {
			setRelationToLabelMap(result.relationToLabelMap);
		}
		const roFields = result.readonlyFields || [];
		// extend readonlyFieds with extraConfig?.readonlyFields if it exists
		roFields.push(...(extraConfig?.readonlyFields || []));

		setReadonlyFields(roFields);
		if (layoutType === 'auto' && layoutTp === null && inlineMode) {
			setLayoutTp(
				(objectData?.fieldsAndTypes.length || 0) > 5 ? 'stacked' : 'inline',
			);
		} else if (layoutType) {
			setLayoutTp(layoutType === 'inline' ? 'inline' : 'stacked');
		}
		if (onModelRetrieve) {
			onModelRetrieve(result);
		}
		objectData.fieldsAndTypes.forEach((fieldDef) => {
			const field = fieldDef.column_name;
			getFieldType(field, true);
		});
	}, [objectData]);

	const formatCellValue = (
		columnDefinition: FieldDefinition | undefined,
		value: any,
	) => {
		if (!columnDefinition) {
			return value; // Return raw value if no column definition is provided
		}
		if (value === null || value === undefined) {
			return '-';
		}
		if (columnDefinition) {
			const columnType = columnDefinition.data_type;
			if (columnType === 'date') {
				return DateTime.fromJSDate(new Date(value)).toISODate();
			}
			if (columnType === 'datetime') {
				return DateTime.fromJSDate(new Date(value)).toISO();
			}
			if (columnType === 'ARRAY' && typeof value === 'string') {
				// If the value is a string, split it by newlines
				return value
					.split(',')
					.map((item) => item.trim())
					.join('\n');
			}
		}
		if (Array.isArray(value)) {
			return value.join('\n');
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return value;
	};

	const setFormValue = (
		field: string,
		value: any,
		useData?: Record<string, any>,
	) => {
		const prevData = useData || formData;
		const newFormData = {
			...prevData,
			[field]: value,
		};
		setFormData(newFormData);
		if (onInlineUpdate && inlineMode) {
			onInlineUpdate(itemId, idx, checkCansubmit(newFormData), newFormData, fieldTypesMap );
		}
		Object.keys(objectData?.fieldDependencies || {}).forEach((f) => {
			objectData?.fieldDependencies?.[f].forEach((dependentField) => {
				if (dependentField === field) {
					// If the dependent field is the one being updated, update its value
					clearAutocompleteField(f, newFormData);
				}
			});
		});
	};
	const relationData = (field: string) => {
		const relation = objectData?.relations?.relations?.find(
			(rel) => rel.from.dbField === field,
		);
		const relTo = relation ? relation : null;
        if (relTo) {
            if (objectData && objectData.filterTypes[relTo.from.dbField]) {
                return '_PREFETCH';
            }
            return relTo.to;
        }
        return relTo;
	};
	const getFieldType = (field: string, setCache: boolean=false): string => {
		const fieldType = fieldTypesMap[field];
		if (fieldType) {
			return fieldType;
		}
		const determinedType = findFieldType(field);
		if (setCache) {
			setFieldTypesMap((prev) => ({
				...prev,
				[field]: determinedType,
			}));
		}
		return determinedType;
	};
	const findFieldType = (field: string): string => {
		// Determine the field type based on naming conventions or predefined rules

		if ((readonlyFields?.length || 0) > 0) {
			if (readonlyFields.includes(field)) {
				return 'static';
			}
		} else if (
			field === 'id' ||
			field === 'createdAt' ||
			field === 'updatedAt' ||
			extraConfig?.canUpdate === false
		) {
			return 'static';
		}
		const relType = relationData(field);
        if (!!relType) { 
			if (relType === '_PREFETCH') {
                return 'select'
            }
            if (!currentOptions[field]) {
				setCurrentOptions((prev) => ({
					...prev,
					[field]: [],
				}));
			}
			return 'relation';
		}
		const fieldDefinition = objectData?.fieldsAndTypes.find(
			(f) => f.column_name === field,
		);
		if (fieldDefinition) {
			if (fieldDefinition.data_type === 'enum') {
				return 'select';
			}
			if (fieldDefinition.data_type === 'varchar') {
				return 'text';
			}
			if (['date', 'int', 'float', 'datetime', 'text', 'image', 'file'].indexOf(fieldDefinition.data_type) >= 0) {
				return fieldDefinition.data_type;
			}
			if (fieldDefinition.data_type.startsWith('timestamp')) {
				return 'datetime';
			}
			if (fieldDefinition.data_type === 'boolean') {
				return 'checkbox';
			}
			if (fieldDefinition.data_type === 'json' || fieldDefinition.data_type === 'jsonb') {
				return 'textarea';
			}
			if (fieldDefinition.data_type === 'ARRAY') {
				console.warn('array detected', field);
				return 'array'; // Assuming array fields are array fields
			}
		}
		return 'text'; // Default to text if type is unknown
	};
	useEffect(() => {
		const doRetrieveData = async () => {
			let result: CommonReturnModelItemType;
			if (mode === 'edit') {
				result = await apiService.getModelItem(model, itemId, extraApiParams);
			} else {
				result = await apiService.getModelMetadata(model, extraApiParams);
			}
			setObjectData(result);
			setIsLoading(false);
		};
		doRetrieveData().catch((err) => {
			console.error('Error retrieving data:', err);
			setError(err);
			setIsLoading(false);
			if (onError) {
				onError(err);
			}
		});
		const defaultVal = inlineMode ? 'inline' : 'stacked';
		setLayoutTp(
			layoutType === 'auto' || layoutType === undefined
				? defaultVal
				: layoutType,
		);
	}, []);
	useEffect(() => {
		// Initialize formData with default values from objectData
		if (objectData) {
			const initialData: Record<string, any> = {};
			if (mode === 'create') {
				for (const field of objectData.fieldsAndTypes.map(
					(f) => f.column_name,
				)) {
					if (field === 'id') {
						continue; // Skip id field
					}
					initialData[field] = getFieldDefaultValue(field);
				}
			} else if (mode === 'edit' && objectData.item) {
				for (const field of Object.keys(objectData.item)) {
					initialData[field] = objectData.item[field];
				}
			}
			setFormData(initialData);
		}
	}, [objectData]);
	const getFieldDefaultValue = (field: string): string | boolean => {
		// Get the default value for the field based on its type
		const fieldDefinition = objectData?.fieldsAndTypes.find(
			(f) => f.column_name === field,
		);
		if (fieldDefinition) {
			if (fieldDefinition.data_type === 'enum') {
				// extract value from column_default: ie "'daily'::\"TimesheetFrequency\"" => "daily"
				return fieldDefinition.column_default || '';
			}
			if (
				fieldDefinition.data_type === 'date' &&
				fieldDefinition.column_default === 'CURRENT_TIMESTAMP'
			) {
				return DateTime.now().toISO().split('T')[0];
			}
			if (
				fieldDefinition.data_type === 'datetime' &&
				fieldDefinition.column_default === 'CURRENT_TIMESTAMP'
			) {
				return DateTime.now().toISO();
			}
			if (fieldDefinition.data_type === 'ARRAY') {
				// extract values from "ARRAY[]::text[]" and join with \n
				const match = fieldDefinition.column_default?.match(
					/ARRAY\[(.*)\]::text\[\]/,
				);
				return match
					? match[1]
							.split(',')
							.map((item) => item.trim())
							.join('\n')
					: '';
			}
			if (fieldDefinition.data_type === 'boolean') {
				return fieldDefinition.column_default === 'true';
			}
			if (
				fieldDefinition.data_type === 'uuid' &&
				!fieldDefinition.column_default &&
				fieldDefinition.is_nullable !== 'NO' &&
				!relationData(field)
			) {
				return uuidv4(); // Generate a new UUID for new items
			}
			return fieldDefinition.column_default || '';
		}
		return '';
	};
	const getSelectFieldOptions = (field: string) => {
		// Get the options for select fields from filterTypes
		return objectData?.filterTypes[field] || [];
	};
	async function updateAutocompleteInput(
		columnName: any,
		value: string,
	): Promise<void> {
		const relDefinition = objectData?.relations?.relations?.find(
			(rel) => rel.from.dbField === columnName,
		);
		const dependingFields = objectData?.fieldDependencies?.[columnName] || [];
		const depData = dependingFields.reduce(
			(acc, depField) => {
				if (
					formData[depField] !== undefined &&
					formData[depField] !== null &&
					formData[depField] !== ''
				) {
					acc[depField] = formData[depField];
				} else if (revRelationData && revRelationData.field === depField) {
					acc[depField] = revRelationData.value;
				}
				return acc;
			},
			{} as Record<string, any>,
		);
		if (!relDefinition) {
			console.error(`Field ${columnName} not found in model metadata`);
			return;
		}
		if (Object.keys(depData).length === 0 && value.length === 0) {
			setCurrentOptions((prev) => ({
				...prev,
				[columnName]: [],
			}));
			return;
		}
		try {
			const options = await apiService.getAutocompleteOptions(
				model,
				relDefinition.to.model,
				columnName,
				value,
				depData,
			);
			setCurrentOptions((prev) => ({
				...prev,
				[columnName]: options,
			}));
		} catch (error) {
			console.error('Error fetching autocomplete options:', error);
		}
	}
	const getAllFieldNames = () => {
		if (mode === 'edit' && objectData?.item) {
			return Object.keys(objectData.item);
		}
		return objectData?.fieldsAndTypes.map((f) => f.column_name) || [];
	};
	const clearAutocompleteField = (
		field: string,
		useData?: Record<string, any>,
	) => {
		const prevData = useData || formData;
		const newData = {
			...prevData,
			[field]: null,
		};
		setFormData(newData);
		setRelationToLabelMap((prev) => ({
			...prev,
			[field]: null,
		}));
		setCurrentOptions((prev) => ({
			...prev,
			[field]: [],
		}));
	};

	function setAutocompleteOption(field: string, value: AutoCompleteOption) {
		setFormValue(field, value.value);
		setRelationToLabelMap((prev) => ({
			...prev,
			[field]: value.label,
		}));
	}
	function isFieldRequired(
		fieldDef: { is_nullable: string } | undefined,
	): boolean {
		// Check if the field is required based on its definition
		return !!(fieldDef && fieldDef.is_nullable === 'NO');
	}

	const checkCansubmit = (dt?: Record<string, any>) => {
		// Check if all required fields are filled
		if (childrenValid === false) {
			return false; // If children are not valid, do not allow submission
		}
		const dataToCheck = dt || formData;
		return getAllFieldNames().every((field) => {
			const fieldDef = objectData?.fieldsAndTypes.find(
				(f) => f.column_name === field,
			);
			if (fieldDef?.isPk) {
				return true;
			}
			
			if (isFieldRequired(fieldDef)) {
				const dataType = getFieldType(field);
				
				const value = ['image', 'file'].includes(dataType || '') ? (filesToUpload?.[field] || dataToCheck[field]) : dataToCheck[field];
				if (dataType === 'checkbox') {
					return value !== undefined; // Checkbox can be true or false
				}
				const valTp = typeof value;
				if (valTp === 'number') {
					return !Number.isNaN(value); // Number fields must not be NaN !Number.isNaN(value)
				}
				return value !== undefined && value !== '' && value !== null; // Required fields must not be empty
			}
			return true; // Non-required fields can be empty
		});
	};
	const canSubmit = useCallback(
		(dt?: Record<string, any>) => {
			return checkCansubmit(dt);
		},
		[formData, objectData, childrenValid],
	);

	function performDelete() {
		if (onDelete && !itemId) {
			onDelete(model, '', idx);
		} else {
			confirmBox({
				title: `Delete ${splitCamelCaseWords(model, true)}?`,
				onConfirm: () => {
					if (onDelete) {
						onDelete(model, itemId || '', idx);
					}
				},
			});
		}
	}
	async function updateModelItem(
		model: string,
		idItem: string,
		data: Record<string, any>,
		filesData?: Record<string, File> | null,
	) {
		// check data if something starts with *REMOVE_FILE*__  - then check if this field is image of file type and set to null and make sure that filesData does not contain this field
		Object.keys(data).forEach((field) => {
			if (typeof data[field] === 'string' && data[field].startsWith('*REMOVE_FILE*__')) {
				const fieldDef = objectData?.fieldsAndTypes.find(
					(f) => f.column_name === field,
				);
				if (fieldDef && (fieldDef.data_type === 'file' || fieldDef.data_type === 'image')) {
					data[field] = null;
					if (filesData && filesData[field]) {
						delete filesData[field];
					}
				}
			}
		});
		return await apiService.updateModelItem(model, idItem, data, filesData);
	}
	if (!objectData) {
		return <LoadingSpinner />;
	}
	function processError(error: CommonPostResult) {
		if (onSaveError) {
			onSaveError(error);
		}
	}
	async function redirectToRelative(newModel: string, itemId: string, relationField: string) {
		if (onRedirect) {
			if (relationField === 'id') { // FIXME
				onRedirect(newModel.toLowerCase(), itemId);
			} else {
				const id = await apiService.getModelItemIdByUniqueField(newModel, relationField, itemId);
				onRedirect(newModel.toLowerCase(), id);
			}
		}
	}
	async function uploadFile(field: string, file: File): Promise<string | null> {
		// Implement file upload logic here
		// For example, upload to server and get the URL
		// const uploadedFileUrl = await apiService.uploadFile(model, field, file);
		if (onInlineFileUpload && inlineMode) {
			const idxUpl = (mode === 'edit') ? itemId.toString() || '' : (idx || '0').toString();
			onInlineFileUpload(idxUpl, field, file);
		} else {
			const newFiles = {...(filesToUpload || {}), [field]: file};
			setFilesToUpload(newFiles);
		}
		let fileName = null;
		if (file instanceof File) {
			fileName = file.name;
		}
		setFormValue(field, fileName);
		return fileName;
	}
	return (
		<div>
			{isLoading && <LoadingSpinner />}
			{error && <p>Error fetching object data</p>}
			{objectData && objectData.fieldsAndTypes && (
				<div>
					<Card>
						<CardTitle className="admin-p-4">
							<div className="admin-w-full admin-flex admin-flex-row admin-justify-between admin-items-center">
								{mode === 'edit' && (
									<div className="admin-flex admin-items-center admin-justify-start">
										<div className="admin-font-bold admin-text-xl admin-my-3 admin-text-nowrap">
											{splitCamelCaseWords(model, true)}: 
											{objectData.title ? (
												<>
												<span className="admin-ml-2">{objectData.title}</span>
												<div className="admin-text-xs admin-text-muted-foreground">ID: {itemId}</div>
												</>
											) : (
												<>
												{itemId}
												</>
											)}
											{ inlineMode && onRedirect && (
												<Button onClick={() => {
													onRedirect(model, itemId);
												}} variant="ghost">
													<ExternalLink />
												</Button>
											)}
										</div>
									</div>
								)}
								{mode === 'create' && (
									<div className="admin-font-bold admin-text-xl admin-my-3">
										{splitCamelCaseWords(model, true)}
									</div>
								)}
								{!inlineMode && showTopButtons && (
									<div className="admin-w-full admin-text-right admin-text-small admin-my-3">
										<SaveButtons
											mode={mode}
											model={model}
											itemId={itemId}
											data={formData}
											filesData={filesToUpload}
											onSave={onSave}
											onCancel={onCancel}
                                            onDelete={performDelete}
											onError={processError}
											canSubmit={canSubmit}
											canAddItem={canAddItem}
                                            canDelete={canDelete}
											updateModelItem={
												customUpdate ? customUpdate : updateModelItem
											}
											createModelItem={
												customCreate
													? customCreate
													: apiService.createModelItem.bind(apiService)
											}
										/>
									</div>
								)}
							</div>
						</CardTitle>
						<CardContent>
							<div className="admin-w-full">
								<Table>
									{layoutTp === 'inline' && (
										<TableHeader>
											<TableRow>
												{getAllFieldNames()
													.filter((f) => (f !== objectData.pkFieldName) && !f.startsWith('$'))
													.filter(
														(f) =>
															!extraConfig?.fields ||
															extraConfig.fields.includes(f),
													)
													.map((field) => {
														const fieldDef = objectData.fieldsAndTypes.find(
															(f) => f.column_name === field,
														);
														return (
															<TableHead key={'inl_head' + field}>
																<LabelForField
																	field={field}
																	fieldDef={fieldDef}
																	isFieldRequired={isFieldRequired}
																	labelMaps={objectData.fieldToLabelMap}
																/>
															</TableHead>
														);
													})}
											</TableRow>
										</TableHeader>
									)}
									<TableBody>
										{layoutTp === 'inline' && (
											<TableRow>
												{getAllFieldNames()
													.filter((f) => (f !== objectData.pkFieldName) && !f.startsWith('$'))
													.filter(
														(f) =>
															!extraConfig?.fields ||
															extraConfig.fields.includes(f),
													)
													.map((field) => {
														const fieldDef = objectData.fieldsAndTypes.find(
															(f) => f.column_name === field,
														);
														return (
															<TableCell key={'inl_ctr' + field}>
																<ControlForField
																	field={field}
																	fieldDef={fieldDef}
																	getFieldType={getFieldType}
																	revRelationData={revRelationData}
																	setFormValue={setFormValue}
																	formatCellValue={formatCellValue}
																	getFieldDefaultValue={getFieldDefaultValue}
																	isFieldRequired={isFieldRequired}
																	getSelectFieldOptions={getSelectFieldOptions}
																	formData={formData}
																	filesData={filesToUpload}
																	relationsDefinition={objectData.relations.relations}
																	fieldsConfig={objectData.fieldsConfig || {}}
																	redirectToRelative={redirectToRelative}
																	updateAutocompleteInput={
																		updateAutocompleteInput
																	}
																	relationToLabelMap={relationToLabelMap}
																	fieldDependencies={
																		objectData.fieldDependencies || {}
																	}
																	setAutocompleteOption={setAutocompleteOption}
																	uploadFile={uploadFile}
																	currentOptions={currentOptions}
																	clearAutocompleteField={
																		clearAutocompleteField
																	}
																/>
																<ErrorBox errorMap={errorMap} field={field} />
															</TableCell>
														);
													})}
											</TableRow>
										)}
										{layoutTp === 'stacked' &&
											getAllFieldNames()
												.filter((f) => f !== objectData.pkFieldName && !f.startsWith('$'))
												.filter(
													(f) =>
														!extraConfig?.fields ||
														extraConfig.fields.includes(f),
												)
												.map((field) => {
													const fieldDef = objectData.fieldsAndTypes.find(
														(f) => f.column_name === field,
													);
													return (
														<TableRow key={'stk' + field}>
															<TableCell>
																<LabelForField
																	field={field}
																	fieldDef={fieldDef}
																	isFieldRequired={isFieldRequired}
																	labelMaps={objectData.fieldToLabelMap}
																/>
															</TableCell>
															<TableCell>
																<ErrorBox errorMap={errorMap} field={field} />
																<ControlForField
																	field={field}
																	fieldDef={fieldDef}
																	getFieldType={getFieldType}
																	setFormValue={setFormValue}
																	formatCellValue={formatCellValue}
																	getFieldDefaultValue={getFieldDefaultValue}
																	isFieldRequired={isFieldRequired}
																	getSelectFieldOptions={getSelectFieldOptions}
																	relationsDefinition={objectData.relations.relations}
																	redirectToRelative={redirectToRelative}
																	formData={formData}
																	filesData={filesToUpload}
																	fieldsConfig={objectData.fieldsConfig || {}}
																	uploadFile={uploadFile}
																	updateAutocompleteInput={
																		updateAutocompleteInput
																	}
																	relationToLabelMap={relationToLabelMap}
																	fieldDependencies={
																		objectData.fieldDependencies || {}
																	}
																	setAutocompleteOption={setAutocompleteOption}
																	currentOptions={currentOptions}
																	clearAutocompleteField={
																		clearAutocompleteField
																	}
																/>
															</TableCell>
														</TableRow>
													);
												})}
									</TableBody>
								</Table>
							</div>
							{inlineMode && extraConfig?.canDelete !== false && (
								<div className="admin-mt-4 admin-flex admin-justify-end">
									<div className="admin-mt-4">
										<Button
											variant="danger"
											onClick={() => {
												performDelete();
											}}>
											Delete
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
					{children}
					{!inlineMode && (
						<>
							<div className="admin-mt-4 admin-text-sm admin-text-muted-foreground">
								<span className="admin-text-red-500">*</span> indicates required field
							</div>
							<SaveButtons
								mode={mode}
								model={model}
								itemId={itemId}
								data={formData}
								onSave={onSave}
                                onDelete={performDelete}
								onCancel={onCancel}
								onError={processError}
								canSubmit={canSubmit}
								canAddItem={canAddItem}
                                canDelete={canDelete}
								filesData={filesToUpload}
								updateModelItem={customUpdate ? customUpdate : updateModelItem}
								createModelItem={
									customCreate
										? customCreate
										: apiService.createModelItem.bind(apiService)
								}
							/>
						</>
					)}
				</div>
			)}
		</div>
	);
};
export default ModelObjectForm;
export { ModelObjectForm };
