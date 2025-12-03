import { ActionType, BaseAdminModel, ValidationError, validateEmail } from '@simpleblog/shared/admin';


export class VariousFieldsAdmin extends BaseAdminModel {
    override prismaModel = 'VariousFields';
    protected override listDisplayFields: string[] = ['id', 'stringField', 'intField', 'floatField', 'booleanField', 'dateTimeField', 'dateField', 'keyField'];
    static override prismaModelName = 'VariousFields';
    protected override searchFields: string[] = ['#id', 'firstName', 'lastName', 'email'];
    protected override actions: ActionType[] = [
        { key: 'deleteSelected', label: 'Delete Selected', requiresConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected users?' },
    ];

}
