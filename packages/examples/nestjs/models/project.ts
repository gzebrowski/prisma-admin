import { ActionIdsType, ActionType, BaseAdminModel, FieldDefinition, InlineDefinition, ValidationError, validateEmail } from '@simpleblog/shared/admin';


const inlines: InlineDefinition[] = [
    {
        model: 'TimeTracking',
        label: 'Time Tracking',
        mode: 'inline',
        expanded: true,
    },
];


export class ProjectAdmin extends BaseAdminModel {
    override prismaModel = 'Project';
    protected override listDisplayFields: string[] = ['pk', 'name', 'isActive', 'startFrom', 'validTo', 'status'];
    static override prismaModelName = 'Project';
    protected override searchFields: string[] = ['#pk', 'name'];
    protected override inlines: InlineDefinition[] = inlines;
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected projects?' },
        { key: 'testAction', label: 'Test Action', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to perform the test action on the selected projects?' },
    ];
    protected override updateFilteredFieldAndType(fieldType: FieldDefinition): FieldDefinition {
        // Can be overridden to modify filtered fields and types
        console.log('Field before updateFilteredFieldAndType:', fieldType);
        if (fieldType.column_name === 'validTo') {
            fieldType.data_type = 'date';
        }
        return fieldType;
    }
    async testAction(request: any, user: any, ids: ActionIdsType) {
        // Just simply do nothing for testing
        // const model = this.getPrismaModel();
    }
}
