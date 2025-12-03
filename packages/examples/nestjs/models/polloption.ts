import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class PollOptionAdmin extends BaseAdminModel {
    override prismaModel = 'PollOption';
    protected override listDisplayFields: string[] = ['id', 'text', 'order', 'question__question', 'question__poll__title'];
    static override prismaModelName = 'PollOption';
    protected override searchFields: string[] = ['#id', 'text'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected poll options?' },
    ];

}
