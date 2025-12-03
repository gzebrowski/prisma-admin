type BaseActionExtraFieldType = {
    label: string;
    required?: boolean;
    defaultValue?: string | number | boolean;
};

type ActionSimpleExtraFieldType = BaseActionExtraFieldType & {
    type: 'text' | 'checkbox' | 'date' | 'number';
};

type ActionSelectExtraFieldType = BaseActionExtraFieldType & {
    type: 'select';
    options: { label: string; value: string | number }[];
};

export type DMMMFieldType = {
    name: string;
    type: string;
    kind: string;
    isRequired: boolean;
    isList: boolean;
    isUnique: boolean;
    isId: boolean;
    hasDefaultValue: boolean;
    default?: any;
    relationName?: string;
    relationFromFields?: readonly string[];
    relationToFields?: readonly string[];
    isUpdatedAt?: boolean;
};

export type DMMFRelationType = {
    oneToOne: DMMMFieldType[];
    oneToMany: DMMMFieldType[];
    manyToOne: DMMMFieldType[];
};

export type DMMFModelRelationsType = {
    model: string;
    relations: DMMFRelationType;
    allRelationFields: DMMMFieldType[];
};

export type OneToOneRelationType = {
    from: {
        field: string;
        dbField: string;
    };
    to: {
        model: string;
        relationName?: string;
        field: string;
        dbField: string;
    };
    isRequired: boolean;
    isId: boolean;
};

export type OneToOneRelationsResultType = {
    model: string;
    relations: OneToOneRelationType[];
};

export type InlineFileDataType = Record<
    string, // modelName
    Record<
        'newItems' | 'existingItems',
        Record<
            number, // existingItems|newItems array index
            Record<
                string, // fieldName
                File
            >
        >
    >
>;

export type FilesMapFormat = Record<string, // modelName
    Record<
        'existingItems' | 'newItems',
        Record<number | string, // existingItems|newItems array index
            Record<string, number> // fieldName to index in files array
            >
        >
    >
export type ActionIdsType = string[] | 'all';


export type FieldDependencies = Record<string, string[]>;

export type FieldDefinition = {
    column_name: string;
    is_nullable: string;
    column_default: string | null;
    data_type: string;
    raw_type: string;
    character_maximum_length: number | null;
    isPk: boolean;
    help_text?: string;
};

export type NewFormData = {
    idx: number;
    isValid: boolean;
    formData: Record<string, any>;
    typesMap?: Record<string, string>;
};

export type ExistingFormData = {
    id: string;
    isValid: boolean;
    formData: Record<string, any>;
    typesMap?: Record<string, string>;
};

export type InlineExistingItemsData = Record<string, ExistingFormData[]>;

export type InlineNewItemsData = Record<string, NewFormData[]>;

export type InlineItemsData = {
    existingItems: InlineExistingItemsData;
    newItems: InlineNewItemsData;
};

export type CommonPostResult = {
    status: 'success' | 'error';
    message?: string | null;
    data?: Record<string, any> | null;
    errors?: ValidationError['errors'] | null;
    errorMap?: Record<string, ValidationError['errors'] | null> | null;
}

export type ActionExtraFieldType = ActionSimpleExtraFieldType | ActionSelectExtraFieldType;

export type ActionType = {
    key: string;
    label: string;
    requiresConfirmation?: boolean;
    extraFields?: Record<string, ActionExtraFieldType>;
    confirmationMessage?: string;
}

export type AdditionalFieldDefinition = {
    field: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'file' | 'image' | 'choice';
    required?: boolean;
    default?: any;
};

export type InlineDefinition = {
    model: string; // the relation model
    fields?: string[]; // if specified, only these fields will be displayed
    label?: string; // the label to display for the inline
    canAdd?: boolean; // Whether a new inline can be added
    canDelete?: boolean; // Whether the inline can be deleted
    canUpdate?: boolean; // Whether the inline can be updated
    expanded?: boolean; // Whether the inline is expanded by default
    mode?: 'stacked' | 'inline' | 'auto'; // 'stacked' means the inlines are displayed as a list, 'inline' means they are displayed in a table. Auto means the layout will be determined automatically based on number of items.
    maxItems?: number; // Maximum number of items to display
    toField?: string; // The field in the main model that this inline is related to
    excludeFields?: string[]; // Fields to exclude from the inline display
    readonlyFields?: string[]; // Fields that are readonly in the inline
    orderBy?: string[]; // Fields to order the inline items by. If some field starts with '-' it will be sorted in descending order. Ie. ['-field1', 'field2'] means {[field1]: desc, [field2]: asc}
    additionalFields?: AdditionalFieldDefinition[]; // Additional fields to include in the inline that are not part of the model
}

export type InlineItemType = {
    exclude: string;
    items: string[];
    revRelation?: {field: string, value: any};
}

export type InlineItemTypeMap = Record<string, InlineItemType>;

export interface ValidationErrorDetail {
    field: string;
    message: string;
    code?: string;
    value?: any;
}
export class ApiResponseError extends Error {
    public override readonly name = 'ApiResponseError';

    constructor(
        public override readonly message: string,
        public readonly statusCode: number = 400
    ) {
        super(message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiResponseError);
        }
    }
}

export class ValidationError extends Error {
    public override readonly name = 'ValidationError';

    constructor(
        message: string,
        public readonly errors: ValidationErrorDetail[] = [],
        public readonly statusCode: number = 400
    ) {
        super(message);
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }
    }
    
    // Dodaj pojedynczy błąd walidacji
    addError(field: string, message: string, code?: string, value?: any): void {
        this.errors.push({ field, message, code, value });
    }
    
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            errors: this.errors,
            statusCode: this.statusCode
        };
    }
}
export type FieldConfig = {
    widget?: 'input' | 'textarea' | 'select' | 'checkbox' | 'date' | 'datetime';
    className?: string;
    attrs?: Record<string, any>;
};

export type ExtraFieldDefinition = {
    field: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'file' | 'choice';
    required?: boolean;
    default?: any;
    choices?: Array<{ label: string; value: any }>;
    helpText?: string;
}

export class NotFoundException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundException';
    }
}

export class ForbiddenException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ForbiddenException';
    }
}
export type ListViewFilterType = {label: string, value: any}[];
