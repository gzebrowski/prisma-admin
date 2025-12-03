import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ModelObjectForm, SaveVariant } from './modelObjectForm';
import {
	CommonReturnModelItemType,
	NewFormData,
	ExistingFormData,
	CommonPostResult,
} from '../../../core/src';
import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
	Separator,
	Card,
	CardTitle,
	Badge,
	Button,
} from './ui/simpleComponents';
import { AdminService, InlineFilesDataType } from '../services/admin.services';
import { ChevronDown, PlusIcon, AlertTriangle } from './ui/icons';
import { ErrorData } from '../models';
import { cn } from '../utils/utils';

type EditObjectProps = {
	model: string;
	itemId: string;
	onSave?: (data: Record<string, any>, saveVariant: SaveVariant) => void;
	onCancel?: () => void;
    onDelete?: (id?: string) => void;
	onError?: (error: Error) => void;
	onRedirect?: (newModel: string, itemId: string) => void;
	canAddItem?: boolean;
	canDeleteItem?: boolean;
};

// type ErrorData = {
//     message: string | null | undefined;
//     main: Record<string, string> | null | undefined;
//     inlines: Record<string, Record<string, string>> | null | undefined;
// }

const EditObject: React.FC<EditObjectProps> = ({
	model,
	itemId,
	onSave,
	onCancel,
	onError,
    onDelete,
	canAddItem: _canAddItem,
	onRedirect,
    canDeleteItem,
}) => {
	const [modelData, setModelData] = useState<CommonReturnModelItemType | null>(
		null,
	);
	const [newInlinesData, setNewInlinesData] = useState<
		Record<string, NewFormData[]>
	>({});
	const [inlinesOpenMap, setInlinesOpenMap] = useState<Record<string, boolean>>(
		{},
	);
	const [existingInlinesData, setExistingInlinesData] = useState<
		Record<string, ExistingFormData[]>
	>({});
	const [inlFilesToUpload, setInlFilesToUpload] = useState<InlineFilesDataType>(
		{'existingItems': {}, 'newItems': {}}
	);

	const [errorData, setErrorData] = useState<ErrorData>({
		message: null,
		main: {},
		inlines: {},
	});
	const [preparingStep, setPreparingStep] = useState<number>(1);
	const currentIdx = useRef(0);
	const apiService = new AdminService();

	const retrievedData = async (data: CommonReturnModelItemType) => {
		setModelData(data);
		const newInlines: Record<string, NewFormData[]> = {};
		data.inlines?.forEach((inline) => {
			newInlines[inline.model] = [];
			changeOpenState(inline.model, inline.expanded || false);
		});
		setNewInlinesData(newInlines);
		setPreparingStep(2);
	};
	const changeNewInlinesData = (
		newInlines: Record<string, NewFormData[]>,
		reload = false,
	) => {
		setNewInlinesData(newInlines);
		if (reload) {
			// setPreparingStep(-1);
		}
	};
	useEffect(() => {
		if (preparingStep < 0) {
			setPreparingStep(preparingStep * -1);
		}
	}, [preparingStep]);
	const getInlineIdsByModel = useCallback(
		(model: string, data?: CommonReturnModelItemType): string[] => {
			const mData = data || modelData;
			if (!mData || !mData?.inlineItems?.[model].items.length) {
				return [];
			}
			return mData.inlineItems[model].items;
		},
		[modelData],
	);
	const getInlineConfByModel = useCallback(
		(model: string) => {
			if (!modelData || !modelData?.inlineItems?.[model].exclude) {
				return {};
			}
			return { exclude: modelData.inlineItems[model].exclude };
		},
		[modelData],
	);
	const getRevRelationByModel = useCallback(
		(model: string) => {
			if (!modelData || !modelData?.inlineItems?.[model].revRelation) {
				return null;
			}
			return modelData.inlineItems[model].revRelation;
		},
		[modelData],
	);
	const updateAllData = async (
		model: string,
		itemId: string | undefined | null,
		formData: Record<string, any>,
		filesData?: Record<string, File> | null,
	) => {
		setErrorData({ message: null, main: {}, inlines: {} });
		const mainObjResult = await apiService.updateModelItem(
			model,
			itemId || '',
			formData,
			filesData,
		);
		if (mainObjResult.status === 'error') {
			return mainObjResult;
		}
		const dt = {existingInlinesData, newInlinesData};
		for (const key in dt) {
			const key2 = key as keyof typeof dt;
			for (const modelName in dt[key2]) {
				dt[key2][modelName].forEach((item) => {
					if (item.formData && item.typesMap) {
						const fileFields = Object.keys(item.typesMap).filter((fld => {
							if (item.typesMap) {
								return item.typesMap[fld] === 'file' || item.typesMap[fld] === 'image';
							}
							return false;
						}));
						fileFields.forEach((fField) => {
							if (item.formData && item.formData[fField] && typeof item.formData[fField] === 'string' && item.formData[fField].startsWith('*REMOVE_FILE*__')) {
								item.formData[fField] = null;
							}
						});
					}
				});
			}

		}
		const inlineResults = await apiService.saveInlines(
			model,
			itemId || '',
			existingInlinesData,
			newInlinesData,
			inlFilesToUpload,
		);
		if (inlineResults.status === 'error') {
			return inlineResults;
		}
		return mainObjResult;
	};

	const changeOpenState = (model: string, open: boolean) => {
		setInlinesOpenMap((prev) => ({
			...prev,
			[model]: open,
		}));
	};
	const cancelEdit = async () => {
		if (onCancel) {
			onCancel();
		}
	};

	function onSaveError(error: CommonPostResult): void {
		if (error.errors) {
			setErrorData((prev) => ({
				...prev,
				main: error.errors?.reduce(
					(acc, err) => {
						acc[err.field] = err.message;
						return acc;
					},
					{} as Record<string, string>,
				),
			}));
		}
		if (error.errorMap) {
			const inlines: Record<string, Record<string, string>> = {};
			Object.keys(error.errorMap).forEach((k) => {
				inlines[k] = (error.errorMap?.[k] || []).reduce(
					(acc, err) => {
						acc[err.field] = err.message;
						return acc;
					},
					{} as Record<string, string>,
				);
			});
			setErrorData((prev) => ({
				...prev,
				inlines,
			}));
		}
		if (error.message) {
			setErrorData((prev) => ({
				...prev,
				message: error.message,
			}));
		}
	}
	async function removeExistingInlineItem(model: string, itemId: string, _idx: number | undefined) {
		await apiService.deleteObject(
			model,
			itemId,
		);
		const newExistingData = (
			existingInlinesData[model] || []
		).filter((item) => item.id !== itemId);
		setExistingInlinesData((prev) => ({
			...prev,
			[model]: newExistingData,
		}));
		setPreparingStep(-1);
		// changeNewInlinesData(newInlinesData, true);
	}
	const inlineUpdateFn = (
		model: string,
		inlitemId: string | null | undefined,
		_inlIdx: number | null | undefined,
		isValid: boolean,
		inlData: Record<string, any>,
		typesMap?: Record<string, string>,
	) => {
		const newExistingData = (
			existingInlinesData[model] || []
		).filter((item) => item.id !== inlitemId);
		newExistingData.push({
			id: inlitemId || '',
			formData: inlData,
			isValid,
			typesMap: typesMap,
		});
		setExistingInlinesData((prev) => ({
			...prev,
			[model]: newExistingData,
		}));
	};

	return (
		<>
			{preparingStep < 1 ? null : (
				<>
					{errorData.message && (
						<div className="text-center border border-red-500 p-2 mb-2">
							<div className="text-red-500 inline-flex items-center mt-2 font-bold">
								<AlertTriangle className="mr-2" />
								<span className="">{errorData.message}</span>
							</div>
						</div>
					)}
					<ModelObjectForm
						mode="edit"
						model={model}
						itemId={itemId}
						onSave={(data, saveVariant) => onSave?.(data, saveVariant)}
                        onDelete={() => onDelete?.(itemId)}
                        canDelete={canDeleteItem}
						customUpdate={updateAllData}
						errorMap={errorData.main}
						onRedirect={onRedirect}
						onSaveError={onSaveError}
						showTopButtons={!!modelData?.inlines?.length}
						onCancel={async () => await cancelEdit()}
						childrenValid={
							Object.values(existingInlinesData).every((items) =>
								items.every((item) => item.isValid),
							) &&
							Object.values(newInlinesData).every((items) =>
								items.every((item) => item.isValid),
							)
						}
						onError={onError}
						onModelRetrieve={retrievedData}>
						{preparingStep < 2 || !modelData || !modelData.inlines?.length ? (
							<></>
						) : (
							<div>
								<div className="admin-flex admin-flex-row admin-items-center admin-justify-center">
									<Separator className="admin-my-3" />
									<h3 className="admin-scroll-m-20 admin-text-2xl admin-font-semibold admin-tracking-tight first:admin-mt-0 admin-text-nowrap admin-my-4">
										Related objects
									</h3>
									<Separator className="admin-my-3" />
								</div>
								{modelData.inlines.map((inline) => (
									<div key={inline.model} className="admin-mb-4">
										<Card>
											<Collapsible
												defaultOpen={inline.expanded}
												onOpenChange={(open) =>
													changeOpenState(inline.model, open)
												}>
												<CollapsibleTrigger>
													<CardTitle className="admin-flex admin-flex-row admin-items-center admin-justify-between cursor-pointer select-none p-4">
														<div className="admin-flex admin-flex-row admin-items-center">
															<div>{inline.label}</div>
															<Badge variant={'secondary'} className="mx-2">
																{getInlineIdsByModel(inline.model).length} items
															</Badge>
														</div>
														<div>
															<ChevronDown
																className={` -4 admin-w-4 admin-transition-transform ${inlinesOpenMap[inline.model] ? 'admin-rotate-180' : ''}`}
															/>
														</div>
													</CardTitle>
												</CollapsibleTrigger>
												<CollapsibleContent className="admin-p-4">
													{getInlineIdsByModel(inline.model).map((id, nr) => {
														const isError =
															existingInlinesData[inline.model]?.find(
																(item) => item.id === id,
															)?.isValid === false;

														return (
															<div
																className={cn('', {
																	'admin-border-red-500': isError,
																})}
																key={inline.model + '_cnt_' + id}>
																{isError && (
																	<div className="admin-text-red-500 admin-mb-2 admin-flex admin-items-center">
																		<AlertTriangle className="admin-mr-2" />
																		<span>Invalid inline data</span>
																	</div>
																)}
																<ModelObjectForm
																	key={inline.model + '__' + id}
																	mode="edit"
																	model={inline.model.toLowerCase()}
																	idx={nr}
																	extraApiParams={getInlineConfByModel(
																		inline.model,
																	)}
																	extraConfig={{ ...inline }}
																	revRelationData={getRevRelationByModel(inline.model)}
																	onRedirect={onRedirect}
																	errorMap={
																		errorData.inlines?.[inline.model] || {}
																	}
																	layoutType={inline.mode || 'auto'}
																	itemId={id}
																	inlineMode={true}
																	onDelete={async (model, itemId, _idx) => {
																		await removeExistingInlineItem(
																			model,
																			itemId,
																			_idx,
																		);
																	}}
																	onInlineFileUpload={(
																		inlIdx,
																		field,
																		file,
																	) => {
																		setInlFilesToUpload((prev) => {
																			const updated = { ...prev };
																			if (!updated['existingItems'][inline.model]) {
																				updated['existingItems'][inline.model] = {};
																			}
																			if (inlIdx) {
																				if (!updated['existingItems'][inline.model][inlIdx]) {
																					updated['existingItems'][inline.model][inlIdx] = {};
																				}
																				updated['existingItems'][inline.model][inlIdx][field] = file;
																			}
																			return updated;
																		});
																	}}
																	
																	onInlineUpdate={(inlitemId, _inlIdx, isValid, inlData, inlTypesMap) => {
																		inlineUpdateFn(inline.model, inlitemId, _inlIdx, isValid, inlData, inlTypesMap);
																	}}
																/>
															</div>
														);
													})}
													{newInlinesData[inline.model] &&
														newInlinesData[inline.model].map((newData) => (
															<div
																className=""
																key={inline.model + '_new_' + newData.idx}>
																<ModelObjectForm
																	mode="create"
																	model={inline.model.toLowerCase()}
																	idx={newData.idx}
																	onRedirect={onRedirect}
																	extraApiParams={getInlineConfByModel(
																		inline.model,
																	)}
																	revRelationData={getRevRelationByModel(inline.model)}
																	extraConfig={{ ...inline }}
																	layoutType={inline.mode || 'auto'}
																	inlineMode={true}
																	onDelete={(_model, _itemId, idx) => {
																		const replaceNewInlinesData = {
																			...newInlinesData,
																			[inline.model]: newInlinesData[
																				inline.model
																			].filter((d) => d.idx !== idx),
																		};
																		changeNewInlinesData(
																			replaceNewInlinesData,
																			true,
																		);
																	}}
																	onInlineFileUpload={(
																		inlIdx,
																		field,
																		file,
																	) => {
																		setInlFilesToUpload((prev) => {
																			const updated = { ...prev };
																			if (!updated['newItems'][inline.model]) {
																				updated['newItems'][inline.model] = {};
																			}
																			if (inlIdx !== undefined && inlIdx !== null) {
																				if (!updated['newItems'][inline.model][inlIdx.toString()]) {
																					updated['newItems'][inline.model][inlIdx.toString()] = {};
																				}
																				updated['newItems'][inline.model][inlIdx.toString()][field] = file;
																			}
																			return updated;
																		});
																	}}
																	onInlineUpdate={(
																		_inlitemId,
																		inlIdx,
																		isValid,
																		inlData,
																		inlTypesMap,
																	) => {
																		const replaceNewInlinesData = {
																			...newInlinesData,
																			[inline.model]: newInlinesData[
																				inline.model
																			].map((item) =>
																				item.idx === inlIdx
																					? {
																							...item,
																							formData: inlData,
																							isValid,
																							typesMap: inlTypesMap,
																						}
																					: item,
																			),
																		};
																		changeNewInlinesData(
																			replaceNewInlinesData,
																			false,
																		);
																	}}
																/>
															</div>
														))}
													{inline.canAdd !== false &&
														(inline.maxItems === undefined ||
															newInlinesData[inline.model].length <
																inline.maxItems) && (
															<Button
																variant={'secondary'}
																onClick={() => {
																	const newData: NewFormData = {
																		idx: currentIdx.current++,
																		isValid: false,
																		formData: {},
																	};
																	const replaceNewInlinesData = {
																		...newInlinesData,
																		[inline.model]: [
																			...(newInlinesData[inline.model] || []),
																			newData,
																		],
																	};
																	changeNewInlinesData(
																		replaceNewInlinesData,
																		false,
																	);
																}}>
																Add Item <PlusIcon />
															</Button>
														)}
												</CollapsibleContent>
											</Collapsible>
										</Card>
									</div>
								))}
							</div>
						)}
					</ModelObjectForm>
				</>
			)}
		</>
	);
};

export { EditObject };
