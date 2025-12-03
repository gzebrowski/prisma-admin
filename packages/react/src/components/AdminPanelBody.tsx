import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Switch } from './ui/simpleComponents';
import { useToasts } from '../context/toasts';
import { DateTime } from 'luxon';
import {
	splitCamelCaseWords,
	splitSnakeCaseWords,
} from '../../../core/src';
import {
	ArrowUpZA,
	ArrowDownAZ,
} from './ui/icons';

import { DataFilters } from './dataFilters';
import Paginator from './paginator';
import { AdminService } from '../services/admin.services';
import { GetModelItemsType, GetModelsType, ActionType, parseFieldName } from '../../../core/src';

import { useAdminAlert } from '../context/adminAlerts';
import { AddObject } from './addObject';
import { EditObject } from './editObject';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from './ui/simpleComponents';
import { Checkbox } from './ui/simpleComponents';
import { Alert } from './ui/simpleComponents';

type CheckedState = boolean | 'indeterminate';


const AdminPanelBody: React.FC = () => {
	const navigate = useNavigate();
	// Get route params
	const { adminModel, modelId } = useParams();
	const { showSuccess } = useToasts();
	const [currentModel, setCurrentModel] = useState('');
	const [currentAction, setCurrentAction] = useState('');
	const [selectedAll, setSelectedAll] = useState<CheckedState>(false);
	const [selectedAny, setSelectedAny] = useState<CheckedState>(false);
	const [orderingIdx, setOrderingIdx] = useState<number | null>(null);
	const [fieldToFieldTypeMap, setFieldToFieldTypeMap] = useState<Record<string, string> | null>(null);
	const [selectedItemsMap, setSelectedItemsMap] = useState<
		Record<string, boolean>
	>({});
	const [searchQuery, setSearchQuery] = useState('');
	const [filterByField, setFilterByField] = useState<Record<
		string,
		any
	> | null>(null);
	const [reqSearchQuery, setReqSearchQuery] = useState('');
	const [selectEverything, setSelectEverything] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [mode, setMode] = useState<
		'view' | 'edit' | 'add' | 'reloadAdd' | 'reloadEdit'
	>('view');
	const [editItemId, setEditItemId] = useState<string | null>(null);

	// Sync route params to state
	useEffect(() => {
		if (adminModel && adminModel !== currentModel) {
			setCurrentModel(adminModel);
			setPage(0);
			setSearchQuery('');
			setCurrentAction('');
			setSelectedAll(false);
			setSelectedAny(false);
			setSelectedItemsMap({});
			setOrderingIdx(null);
			setSelectEverything(false);
		}
		if (modelId) {
			if (modelId === 'addnew') {
                navigate(`/admin/${adminModel}/add`);
            }
            if (modelId === 'add') {
			    setEditItemId(null);
                setMode('add');
            } else {
                setEditItemId(modelId);
                setMode('edit');
            }
		} else {
			setEditItemId(null);
			setMode('view');
		}
	}, [adminModel, modelId]);

	const [page, setPage] = useState(0);
	const { confirmBox } = useAdminAlert();
	
	// Data states
	const [adminModels, setAdminModels] = useState<GetModelsType | null>(null);
	const [modelItems, setModelItems] = useState<GetModelItemsType | null>(null);
	const [isLoadingModels, setIsLoadingModels] = useState(false);
	const [isLoadingItems, setIsLoadingItems] = useState(false);
	const [_modelsError, setModelsError] = useState<string | null>(null);
	const [_itemsError, setItemsError] = useState<string | null>(null);

	const apiService = useMemo(() => new AdminService(), []);

	// Load admin models
	const loadAdminModels = useCallback(async () => {
		if (isLoadingModels) return;
		
		setIsLoadingModels(true);
		setModelsError(null);
		try {
			const result = await apiService.getAllModels();
			setAdminModels(result);
		} catch (error) {
			setModelsError(error instanceof Error ? error.message : 'Failed to load models');
		} finally {
			setIsLoadingModels(false);
		}
	}, [apiService]);

	// Load model items
	const loadModelItems = useCallback(async () => {
		if (!currentModel || isLoadingItems) return;
		
		setIsLoadingItems(true);
		setItemsError(null);
		try {
			const filters: Record<string, any> = {};
			if (reqSearchQuery) {
				filters._q = reqSearchQuery;
			}
			if (orderingIdx !== null) {
				filters._o = orderingIdx;
			}
			if (filterByField) {
				Object.entries(filterByField).forEach(([key, value]) => {
					if (value || value === false) {
						filters[key] = value;
					}
				});
			}
			const result = await apiService.getModelItems(currentModel, page, filters);
			setModelItems(result);
		} catch (error) {
			setItemsError(error instanceof Error ? error.message : 'Failed to load items');
		} finally {
			setIsLoadingItems(false);
		}
	}, [apiService, currentModel, page, reqSearchQuery, orderingIdx, filterByField]);

	// Load models on mount
	useEffect(() => {
		loadAdminModels();
	}, [loadAdminModels]);
	useEffect(() => {
		if (modelItems && modelItems.fieldsAndTypes) {
			const fieldTypeMap: Record<string, string> = {};
			modelItems.fieldsAndTypes.forEach((field) => {
				fieldTypeMap[field.column_name] = field.data_type;
			});
			setFieldToFieldTypeMap(fieldTypeMap);
		}
	}, [modelItems?.fieldsAndTypes, currentModel]);

	// Load items when dependencies change
	useEffect(() => {
		if (currentModel) {
			loadModelItems();
		}
	}, [currentModel, page, reqSearchQuery, orderingIdx, filterByField, loadModelItems]);

	useEffect(() => {
		if (mode === 'reloadAdd' || mode === 'reloadEdit') {
			setMode(mode === 'reloadAdd' ? 'add' : 'edit');
		}
	}, [mode]);

	const deleteObject = useCallback(async (itemId?: string) => {
		if (itemId) {
			await apiService.deleteObject(currentModel, itemId);
			await loadModelItems();
			navigate(`/admin/${currentModel}`);
		}
	}, [apiService, currentModel, loadModelItems, navigate]);
	const selectModel = useCallback((model: string) => {
		setFilterByField(null);
        navigate(`/admin/${model}`);
		setCurrentModel(model);
	}, [navigate]);
	
	const changePage = useCallback((page: number) => {
		setPage(page);
	}, []);
	
	const checkboxChecked = useCallback((id: string) => {
		return selectedItemsMap[id] || false;
	}, [selectedItemsMap]);
	
	const setEditMode = useCallback((itemId: string | null, md?: 'edit' | 'reloadEdit') => {
		md = md || 'edit';
		if (itemId) {
			navigate(`/admin/${currentModel}/${itemId}`);
		} else {
			navigate(`/admin/${currentModel}`);
		}
	}, [navigate, currentModel]);
	const changeSelectedState = useCallback((id: string | null, checked: boolean) => {
		if (!id) {
			setSelectedAll(checked);
			setSelectedAny(checked);
			setSelectedItemsMap((prev) => {
				const newMap = { ...prev };
				modelItems?.items.forEach((item) => {
					newMap[item.$pk] = checked === true ? true : false;
				});
				return newMap;
			});
			return;
		}
		const currSelectedState = { ...selectedItemsMap };
		setSelectedItemsMap((prev) => ({
			...prev,
			[id]: checked,
		}));
		currSelectedState[id] = checked;
		setSelectedAll(
			modelItems?.items?.length &&
				Object.keys(currSelectedState).length === modelItems.items.length
				? Object.values(currSelectedState).every((value) => value)
				: false,
		);
		setSelectedAny(
			Object.keys(currSelectedState).length > 0 &&
				Object.values(currSelectedState).some((value) => value),
		);
		setSelectEverything(false);
	}, [modelItems?.items, selectedItemsMap]);
	const [isPerformingAction, setIsPerformingAction] = useState(false);

	const performActionMutation = useCallback(async () => {
		if (isPerformingAction) return;
		
		setIsPerformingAction(true);
		setActionError(null);
		
		try {
			if (!currentModel || !currentAction || !selectedAny) {
				throw new Error('Invalid action or model selected');
			}
			const ids =
				selectedAll && selectEverything
					? 'all'
					: Object.keys(selectedItemsMap).filter(
							(key) => selectedItemsMap[key],
						);
			if (ids.length === 0) {
				throw new Error('No items selected for action');
			}
			const response = await apiService.performAction(
				currentModel,
				currentAction,
				ids,
			);
			if (response.status === 'error') {
				setActionError(response.message);
				return response;
			}

			// Success handling
			const selectedIds = Object.keys(selectedItemsMap).filter(
				(key) => selectedItemsMap[key],
			);
			showSuccess(
				`Action ${currentAction} performed successfully on ${selectedIds.length} items.`,
				'Action Successful',
			);
			changeSelectedState(null, false);
			
			// Reload data
			await loadModelItems();
			
			return response;
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Action failed');
			throw error;
		} finally {
			setIsPerformingAction(false);
		}
	}, [currentModel, currentAction, selectedAny, selectedAll, selectEverything, selectedItemsMap, apiService, changeSelectedState, loadModelItems, isPerformingAction]);
	const performAction = useCallback(async () => {
		const action: ActionType | undefined = modelItems?.actions.find(
			(action) => action.key === currentAction,
		);
		const doPerformAction = async () => {
			await performActionMutation();
		};
		if (action) {
			if (action.requiresConfirmation) {
				const confirmationMessage =
					action.confirmationMessage ||
					`Are you sure you want to perform the action "${action.label}" on the selected items?`;
				confirmBox({
					title: `Confirm ${action.label}`,
					question: confirmationMessage,
					confirmText: 'Yes, perform action',
					cancelText: 'No, cancel',
					onConfirm: async () => {
						await doPerformAction();
						changeSelectedState(null, false);
					},
				});
			} else {
				await doPerformAction();
				changeSelectedState(null, false);
			}
		}
	}, [modelItems?.actions, currentAction, performActionMutation, confirmBox, changeSelectedState]);
	const changeOrdering = useCallback((_field: string, idx: number) => {
		if (orderingIdx === null) {
			setOrderingIdx(idx);
		} else if (orderingIdx === idx || orderingIdx === -idx) {
			setOrderingIdx(orderingIdx * -1);
		} else {
			setOrderingIdx(idx);
		}
	}, [orderingIdx]);
	const formatCellValue = useCallback((field: string, value: any) => {
		if (value === null || value === undefined) {
			return '-';
		}

		const columnDefinition = modelItems?.fieldsAndTypes.filter(
			(f) => f.column_name === field,
		);
		if (columnDefinition && columnDefinition.length > 0) {
			const columnType = columnDefinition[0].data_type;
			if (columnType === 'date' || columnType === 'datetime' || columnType.startsWith('timestamp')) {
				const retFormat = (columnType === 'date') ? DateTime.DATE_MED : DateTime.DATETIME_MED;
				if (typeof value === 'string') {
					return DateTime.fromISO(value).toLocaleString(
						retFormat,
					);
				}
				return DateTime.fromJSDate(new Date(value)).toLocaleString(
					retFormat,
				);
			}
			if (columnType === 'uuid') {
				return value.toString().split('-')[0] + '...';
			}
			if (columnType === 'boolean') {
				return value ? (
					<Checkbox disabled={true} checked={true} className="admin-inline-block" />
				) : (
					<Checkbox disabled={true} checked={false} className="admin-inline-block" />
				);
			}
		}
		if (typeof value === 'string') {
			return value;
		}
		if (Array.isArray(value)) {
			return value.join(', ');
		}
		if (typeof value === 'object') {
			return JSON.stringify(value);
		}
		return String(value);
	}, [modelItems?.fieldsAndTypes]);
	
	if (mode === 'view') {
		function getValueAndStyle(field: string, value: any): { fieldVal: any; valueStyle: any; } {
			let fieldVal = formatCellValue(field, value);
			let valueStyle = {};
			if (typeof value === 'string' && value.match(/^\s+/)) {
				const startPadding = value.match(/^\s+/)?.[0].length;
				valueStyle = { paddingLeft: `${startPadding || 0}em` };
			}

			return { fieldVal, valueStyle };
		}

		return (
			<div className="admin-py-2 admin-px-3">
				{actionError && (
					<div className="admin-my-3">
						<Alert variant="destructive">{actionError}</Alert>
					</div>
				)}
				<div>
					{adminModels && (
						<div className="admin-mb-4">
							<h2 className="admin-text-lg admin-font-semibold admin-mb-2">Admin Models</h2>
							<div className="admin-space-y-1">
								{Object.entries(adminModels).map(([key, model]) => (
									<div key={key} className="admin-mr-2 admin-inline-block">
										<Button variant="link" onClick={() => selectModel(key)}>{model}</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
				<div>
					{currentModel &&
						modelItems &&
						modelItems.items &&
						modelItems.listDisplayFields.length > 0 && (
							<>
								<div className="admin-mb-4">
									<p>
										<strong>{currentModel.toUpperCase()}</strong>: Showing{' '}
										{modelItems.itemsCount} of {modelItems.total} items
									</p>
									<div className="admin-mb-4 admin-flex">
										{modelItems.searchFields?.length > 0 && (
											<div className="admin-flex search-box admin-mr-4">
												<div className="admin-flex admin-items-center">
													<div className="admin-flex box-label admin-items-center admin-mr-2">
														Search:
													</div>
													<div className="admin-flex box-ctrl admin-items-center">
														<Input
															type="text"
															placeholder="Search..."
															value={searchQuery}
															onChange={(e) => {
																setSearchQuery(e.target.value);
															}}
															className="admin-w-full admin-max-w-xs admin-border admin-px-3 admin-py-2 admin-rounded-md"
														/>
													</div>
													<div className="admin-flex box-btn admin-items-center admin-ml-2">
														<Button
															onClick={() => {
																setReqSearchQuery(searchQuery);
															}}>
															Search
														</Button>
													</div>
												</div>
											</div>
										)}
										{modelItems.actions && modelItems.actions.length > 0 && (
											<div className="admin-flex action-box">
												<div className="admin-flex action-ctrl-label admin-items-center">
													<div className="admin-flex box-label admin-items-center admin-mr-2">
														<span>Actions:</span>
													</div>
												</div>
												<div className="admin-flex action-ctrl admin-items-center admin-mr-2">
													<select
														value={currentAction}
														className='admin-p-1'
														name="actions"
														required={false}
														onChange={(e) => {
															setCurrentAction(e.target.value);
														}}>
														<option value="">----</option>
														{modelItems.actions.map((action) => (
															<option
																key={action.key || ''}
																value={action.key || ''}>
																{splitCamelCaseWords(
																	action.label || '',
																		true,
																	) || ''}
																</option>
															))}
													</select>
												</div>
												<div className="admin-flex action-btn admin-items-center">
													<Button
														disabled={!currentAction || !selectedAny}
														onClick={() => {
															performAction();
														}}>
														GO
													</Button>
												</div>
											</div>
										)}
										{selectedAll &&
											modelItems.actions &&
											modelItems.actions.length > 0 &&
											modelItems.total > modelItems.itemsCount &&
											modelItems.itemsCount >= 100 && (
												<div className="admin-flex action-box">
													<div className="admin-flex action-ctrl-label admin-items-center">
														<div className="admin-flex box-label admin-items-center admin-mr-2">
															<Switch
																checked={selectEverything}
																onCheckedChange={setSelectEverything}
															/>{' '}
															Apply to all items
														</div>
													</div>
												</div>
											)}
										{/*
                            icon on the right side of the header with filter icon and opening a dialog with filter options using Sheet component
                            */}
										{modelItems.canAddItem && (
										<div className="admin-flex action-box">
											<div className="admin-flex action-ctrl-label admin-items-center">
												<div className="admin-flex box-label admin-items-center admin-mx-2">
														<Button
															variant="primary"
															onClick={() => {
																setMode('add');
                                                                navigate(`/admin/${currentModel}/add`);
															}}>
															Add Item
														</Button>
													</div>
												</div>
											</div>
										)}
										{modelItems.listFilterFields &&
											modelItems.listFilterFields.length > 0 && (
												<div className="admin-flex admin-justify-end">
													<DataFilters
                                                        model={currentModel}
														modelItems={modelItems}
														currentFilters={filterByField || {}}
														onChangeFilterByField={(v: Record<string, any>) => {
															setFilterByField(v);
														}}
													/>
												</div>
											)}
									</div>
								</div>
								<Paginator
									currentPage={page}
									itemsPerPage={100}
									totalItems={modelItems.total}
									onPageChange={changePage}
									className="admin-my-3"
								/>
								<Table className="">
									<TableHeader className="admin-sticky admin-top-0 admin-z-10 admin-bg-card">
										<TableRow>
											<TableHead>
												<Checkbox
													title="Select All"
													checked={(!!selectedAll) || false}
													onCheckedChange={(checked) => {
														changeSelectedState(null, checked === true);
													}}
												/>
											</TableHead>
												{modelItems.listDisplayFields.map((fieldDef, idx) => {
													const { field, FieldLabel } =
														parseFieldName(fieldDef);
													return (
														<TableHead key={field}>
															{field !== modelItems.pkFieldName ? (
																<Button
																	variant="link"
																	onClick={() => {
																		changeOrdering(field, idx + 1);
																	}}>
																	{FieldLabel}
																	{orderingIdx && orderingIdx - 1 === idx && (
																		<ArrowUpZA className="admin-inline-block admin-ml-1" />
																	)}
																	{orderingIdx && orderingIdx - 1 === -idx && (
																		<ArrowDownAZ className="admin-inline-block admin-ml-1" />
																	)}
																</Button>
															) : (
																splitSnakeCaseWords(field, true) || ''
															)}
														</TableHead>
													);
												})}
										</TableRow>
									</TableHeader>
									{modelItems.items.length > 0 ? (
										<TableBody>
											{modelItems.items.map((item: any, _index: number) => (
												<TableRow key={item.$pk}>
													<TableCell>
														<Checkbox
															checked={checkboxChecked(item.$pk)}
															onCheckedChange={(checked) => {
																changeSelectedState(item.$pk, checked === true);
															}}
														/>
													</TableCell>
														{modelItems.listDisplayFields.map(
															(fieldDef, index2) => {
																const { field } = parseFieldName(fieldDef);
																const { fieldVal, valueStyle } = getValueAndStyle(field, item[field]);
																return (
																	<>
																		{index2 ? (
																			<>
																			{fieldToFieldTypeMap && fieldToFieldTypeMap[field] === 'image' && item[field] ? (
																			<>
																			<img src={item['$' + field + '__thumbnail'] || item['$' + field + '__url']} alt="" />
																			</>
																			) : (
																			<TableCell key={item.$pk + '__' + field} style={valueStyle}>
																				{fieldVal}
																			</TableCell>
																			)}
																			</>
																		) : (
																			<TableCell key={item.$pk + '__' + field}>
																				<Button
																					style={valueStyle}
																					onClick={() => setEditMode(item.$pk)}
																					variant="link"
																					title={item[field].toString()}>
																					{fieldVal}
																				</Button>
																			</TableCell>
																		)}
																	</>
																);
															},
														)}
												</TableRow>
											))}
										</TableBody>
									) : (
										<TableBody>
											<TableRow>
												<TableCell
													colSpan={modelItems.listDisplayFields.length + 1}
													className="admin-text-center">
													No items found.
												</TableCell>
											</TableRow>
										</TableBody>
									)}
								</Table>
								<Paginator
									currentPage={page}
									itemsPerPage={100}
									totalItems={modelItems.total}
									onPageChange={changePage}
								/>
							</>
						)}
				</div>
			</div>
		);
	} else if (mode === 'edit') {
		return (
			<div className="admin-py-2 admin-px-3">
				{currentModel && editItemId && (
					<EditObject
						model={currentModel}
						itemId={editItemId}
						canAddItem={modelItems?.canAddItem}
                        canDeleteItem={modelItems?.canDeleteItem}
						onSave={async (_data, saveVariant) => {
                            let navigateUrl: string | null = null;
                            if (saveVariant === 'saveAndAddNew') {
								navigateUrl = `/admin/${adminModel}/add`;
                                setMode('reloadAdd');
							} else if (saveVariant === 'saveAndStay') {
								setEditMode(editItemId, 'reloadEdit');
							} else {
								navigateUrl = `/admin/${adminModel}`;
                                setEditMode(null);
							}
							await loadModelItems();
                            if (navigateUrl) {
                                navigate(navigateUrl);
                            }
						}}
                        
                        onDelete={async (itemId?: string) => {
                            await deleteObject(itemId);
                        }}
						onCancel={() => setEditMode(null)}
						onRedirect={(newModel: string, itemId: string) => {
							setMode('reloadEdit');
							navigate(`/admin/${newModel}/${itemId}`);
						}}
					/>
				)}
			</div>
		);
	} else if (mode === 'add') {
		return (
			<div className="admin-py-2 admin-px-3">
				{currentModel && (
					<AddObject
						model={currentModel}
						onSave={async (_data, saveVariant, newId) => {
                            let navigateUrl: string | null = null;
							if (saveVariant === 'saveAndAddNew') {
								navigateUrl = `/admin/${adminModel}/addnew`;
                                setMode('reloadAdd');
							} else if (saveVariant === 'saveAndStay') {
								setEditMode(newId || null, 'reloadEdit');
                                navigateUrl = `/admin/${adminModel}/${newId}`;
							} else {
								setEditMode(null);
                                navigateUrl = `/admin/${adminModel}`;
							}
							await loadModelItems();
                            if (navigateUrl) {
                                navigate(navigateUrl);
                            }
						}}
						onCancel={() => setMode('view')}
					/>
				)}
			</div>
		);
	}
	return null;
};
export default AdminPanelBody;
