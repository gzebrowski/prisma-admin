import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class PollQuestionAdmin extends BaseAdminModel {
    override prismaModel = 'PollQuestion';
    protected override listDisplayFields: string[] = ['id', 'question', 'questionType', 'isRequired', 'poll__title', 'order', 'createdAt', 'updatedAt'];
    static override prismaModelName = 'PollQuestion';
    protected override searchFields: string[] = ['#id', 'question'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected poll questions?' },
    ];
}
