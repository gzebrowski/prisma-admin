import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class ProjectCategoryAdmin extends BaseAdminModel {
    override prismaModel = 'ProjectCategory';
    protected override listDisplayFields: string[] = ['id', 'name'];
    static override prismaModelName = 'ProjectCategory';
    protected override searchFields: string[] = ['#id', 'name'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected projects?' },
    ];

}
