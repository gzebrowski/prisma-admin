import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class PollAnswerAdmin extends BaseAdminModel {
    override prismaModel = 'PollAnswer';
    protected override listDisplayFields: string[] = ['id', 'textAnswer', 'question__question', 'question__poll__title'];
    static override prismaModelName = 'PollAnswer';
    protected override searchFields: string[] = ['#id', 'textAnswer'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected poll answers?' },
    ];

}
