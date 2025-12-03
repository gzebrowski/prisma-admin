import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class PostAdmin extends BaseAdminModel {
    override prismaModel = 'Post';
    protected override listDisplayFields: string[] = ['id', 'title', 'author', 'category', 'isPublished', 'createdAt', 'updatedAt'];
    static override prismaModelName = 'Post';
    protected override searchFields: string[] = ['#id', 'title', 'author__lastName', 'author__firstName', 'category__name'];
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
