import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class ProjectSubCategoryAdmin extends BaseAdminModel {
    override prismaModel = 'ProjectSubCategory';
    protected override listDisplayFields: string[] = ['id', 'name', 'projectCategory__name'];
    static override prismaModelName = 'ProjectSubCategory';
    protected override searchFields: string[] = ['#id', 'name'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected project subcategories?' },
    ];
}
