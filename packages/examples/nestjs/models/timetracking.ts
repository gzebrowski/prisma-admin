import { ActionType, BaseAdminModel, ValidationError, validateEmail, FieldDependencies } from '@simpleblog/shared/admin';


export class TimeTrackingAdmin extends BaseAdminModel {
    override prismaModel = 'TimeTracking';
    protected override listDisplayFields: string[] = ['pk', 'project__name', 'projectCategory__name', 'projectSubCategory__name'];
    static override prismaModelName = 'TimeTracking';
    protected override searchFields: string[] = ['#pk', 'project__name'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected projects?' },
    ];
    protected override fieldDependencies: FieldDependencies = {
        'projectCategoryId': ['projectId'],
        'projectSubCategoryId': ['projectCategoryId'],
    };

}
