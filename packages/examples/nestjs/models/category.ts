import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class CategoryAdmin extends BaseAdminModel {
    override prismaModel = 'Category';
    protected override listDisplayFields: string[] = ['id', 'name', 'color', 'createdAt', 'updatedAt'];
    static override prismaModelName = 'Category';
    protected override searchFields: string[] = ['#id', 'name'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected categories?' },
    ];

    async validate_color(value: string, id?: string) {
        value = value?.trim().toLowerCase();
        if (!/^#[0-9A-F]{6}$/i.test(value)) {
            throw new ValidationError('Invalid color format');
        }
        return value;
    }
}
