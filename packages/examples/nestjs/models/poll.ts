import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class PollAdmin extends BaseAdminModel {
    override prismaModel = 'Poll';
    protected override listDisplayFields: string[] = ['id', 'title', 'createdAt', 'isActive', 'startDate', 'endDate', 'updatedAt', 'author__firstName|First Name', 'author__lastName|Last Name'];
    static override prismaModelName = 'Poll';
    protected override searchFields: string[] = ['#id', 'title, author__firstName', 'author__lastName'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected polls?' },
    ];

}
