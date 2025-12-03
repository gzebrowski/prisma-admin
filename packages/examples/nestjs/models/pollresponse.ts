import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class PollResponseAdmin extends BaseAdminModel {
    override prismaModel = 'PollResponse';
    protected override listDisplayFields: string[] = ['id', 'poll__title', 'createdAt', 'user__email'];
    static override prismaModelName = 'PollResponse';
    protected override searchFields: string[] = ['#id', 'poll__title'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected poll responses?' },
    ];

}
