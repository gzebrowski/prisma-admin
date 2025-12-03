import React, { useState, useEffect } from 'react';
import { FilterIcon } from './ui/icons';
import { DateTime } from 'luxon';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    Button,
    Input,
 } from './ui/simpleComponents';
import { Calendar } from './calendar';
import { GetModelItemsType, splitCamelCaseWords, parseFieldName } from '../../../core/src';
import { cn } from '../utils/utils';

type DataFiltersProps = {
    model: string;
    modelItems: GetModelItemsType;
    currentFilters?: Record<string, any>;
    onChangeFilterByField: (v: Record<string, any>) => void;
};

const DataFilters: React.FC<DataFiltersProps> = ({ model, modelItems, currentFilters, onChangeFilterByField }) => {
    const [filterByField, setFilterByField] = useState<Record<string, any> | null>(null);
    const [typeByField, setTypeByField] = useState<Record<string, string | null>>({});
    useEffect(() => {
        if (currentFilters) {
            setFilterByField(currentFilters);
        }
    }, [currentFilters]);
    const changeFilterByField = (field: string, value: any) => {
        const newFilterByField = {...(filterByField || currentFilters || {}),
            [field]: value,
        };
        if (value === '' || value === null || value === undefined) {
            delete newFilterByField[field];
        }
        setFilterByField(newFilterByField);
        onChangeFilterByField(newFilterByField);
    };
    useEffect(() => {
        setFilterByField(null);
    }, [model]);
    useEffect(() => {
        modelItems.fieldsAndTypes.forEach((f) => {
            let tp = 'text';
            const field = f.column_name;
            const dataTp = modelItems.fieldsAndTypes.find((f) => f.column_name === field)?.data_type;
            if (field in (modelItems.filterTypes || {})) {
                tp = 'choice';
            } else if (dataTp === 'boolean') {
                tp = 'boolean';
            } else if (dataTp === 'date' || dataTp === 'datetime' || dataTp?.startsWith('timestamp')) {
                tp = 'date';
            }
            setTypeByField((prev) => ({
                ...prev,
                [field]: tp,
            }));
        });
    }, [model, modelItems.fieldsAndTypes]);

    return (
        <Sheet>
            <SheetTrigger className="admin-ml-2">
                <FilterIcon />
            </SheetTrigger>
            <SheetContent className="admin-w-96">
                <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                        Apply filters to narrow down the results.
                    </SheetDescription>
                </SheetHeader>
                <div className="admin-space-y-4">
                    {modelItems.listFilterFields.map((fieldName) => {
                        const { field, FieldLabel} = parseFieldName(fieldName);

                        return (
                        <div key={field} className="admin-space-x-2 admin-mb-3">
                            <h3 className='admin-display-block'>{FieldLabel}</h3>
                            { typeByField[field] === 'choice' ? (
                                <div className="admin-w-full">
                                    <div className=''>
                                        <Button
                                            variant="link"
                                            onClick={() => changeFilterByField(field, '')}
                                        >
                                            All
                                        </Button>
                                    </div>
                                    { modelItems.filterTypes[field].length > 20 ? (
                                    <select
                                        value={filterByField?.[field] || ''}
                                        onChange={(e) => changeFilterByField(field, e.target.value)}
                                        className="admin-w-full admin-rounded-md admin-border admin-border-input admin-bg-background admin-px-3 admin-py-2 admin-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:admin-text-sm"
                                    >
                                        <option value=''>All</option>
                                        {modelItems.filterTypes[field].map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {splitCamelCaseWords(option.label, true)}
                                            </option>
                                        ))}
                                    </select>
                                    ) : (
                                        <div>
                                            {modelItems.filterTypes[field].map((option) => (
                                                <div key={option.value} >
                                                    <Button
                                                        variant="link"
                                                        className={cn('', (filterByField?.[field] === option.value) ? 'admin-font-bold' : '')}
                                                        onClick={() => changeFilterByField(field, option.value)}
                                                    >
                                                        {splitCamelCaseWords(option.label, true)}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                { typeByField[field] === 'boolean' && (
                                    <div className="admin-w-full">
                                        <div className=''>
                                            <Button
                                                variant="link"
                                                onClick={() => changeFilterByField(field, '')}
                                            >
                                                All
                                            </Button>
                                        </div>
                                        <div >
                                            <Button
                                                className={cn('', (filterByField?.[field] === true) ? 'admin-font-bold' : '')}
                                                variant="link"
                                                onClick={() => changeFilterByField(field, true)}
                                            >
                                                Yes
                                            </Button>
                                        </div>
                                        <div>
                                            <Button
                                                className={cn('', (filterByField?.[field] === false) ? 'admin-font-bold' : '')}
                                                variant="link"
                                                onClick={() => changeFilterByField(field, false)}
                                            >
                                                No
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                { typeByField[field] === 'date' && (
                                    <div>
                                        <div>
                                            <Calendar
                                                value={filterByField?.[`${field}__$gte`] ? DateTime.fromISO(filterByField?.[`${field}__$gte`]).toJSDate() : undefined}
                                                onChange={(selectedDate) => {
                                                    if (selectedDate) {
                                                        changeFilterByField(`${field}__$gte`,
                                                            DateTime.fromJSDate(selectedDate).toISODate(),
                                                        );
                                                    }
                                                }}
                                            />
                                            <Calendar
                                                value={filterByField?.[`${field}__$lte`] ? DateTime.fromISO(filterByField?.[`${field}__$lte`]).toJSDate() : undefined}
                                                onChange={(selectedDate) => {
                                                    if (selectedDate) {
                                                        changeFilterByField(`${field}__$lte`, 
                                                            DateTime.fromJSDate(selectedDate).toISODate(),
                                                        );
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className=""
                                            onClick={() => {
                                                changeFilterByField(`${field}__$gte`, '');
                                                changeFilterByField(`${field}__$lte`, '');
                                            }}>
                                                Clear
                                        </Button>
                                        </div>

                                    </div>
                                )}
                                { typeByField[field] === 'text' && (
                                    <Input
                                        id={field}
                                        type="text"
                                        value={filterByField?.[field] || ''}
                                        placeholder={`Filter by ${field}`}
                                        onChange={(e) => {
                                            changeFilterByField(field, e.target.value);
                                        }}
                                    />
                                    )}
                                </>
                            )}
                        </div>
                    )})}
                </div>
                <SheetFooter>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
export default DataFilters;
export { DataFilters };
