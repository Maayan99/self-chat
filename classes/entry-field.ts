// entryField.ts
import {CategoryEntry} from './category-entry';
import {Field} from './field';

export class EntryField {
    dbId: string;
    entryId: string;
    fieldId: string;
    fieldValue: string;
    entry?: CategoryEntry;
    field?: Field;

    constructor(dbId: string, entryId: string, fieldId: string, fieldValue: string, entry?: CategoryEntry, field?: Field) {
        this.dbId = dbId;
        this.entryId = entryId;
        this.fieldId = fieldId;
        this.fieldValue = fieldValue;
        this.entry = entry;
        this.field = field;
    }

    getDbId(): string {
        return this.dbId;
    }
}
