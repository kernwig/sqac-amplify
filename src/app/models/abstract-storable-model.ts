import { AbstractModel } from './abstract-model';

/**
 * Base class for model objects that are at the top-level of a JSON
 * object that may be accessed via persistent storage.
 */
export abstract class AbstractStorableModel extends AbstractModel {
    /** Serialization schema used by this model. (For backward compatibility.) */
    schemaRev: number;

    /** Have these settings been modified but not yet saved? */
    isDirty: boolean = false;

    /** Have changes been saved to the cloud? (Only valid if isDirty == false.) */
    isCloudBacked: boolean = false;

    /** Date-time first created */
    created: Date;

    /// Date-time last changed and persisted.
    modified: Date;

    /** Revision counter of this object. Increments with each cloud save. */
    revision: number;

    /**
     * Construct for a new storable model.
     * The optional [id] field may be used when given by an external source;
     * otherwise a UUID will be generated.
     */
    constructor(newestSchemaRev: number, id?: string) {
        super(id);
        this.schemaRev = newestSchemaRev;
        this.created = new Date();
        this.modified = this.created;
        this.revision = 1;
        this.isCloudBacked = false;
    }

    /** Serialize this instance into JSON */
    public toJSON(): AbstractStorableModelJSON {
        return <AbstractStorableModelJSON> {
            id: this.id,
            schemaRev: this.schemaRev,
            created: this.created.toISOString(),
            modified: this.modified.toISOString(),
            revision: this.revision,
            isCloudBacked: this.isCloudBacked
        };
    }

    /** Initialize content from JSON */
    protected static fromAbstractJSON<T extends AbstractStorableModel>(json: AbstractStorableModelJSON, out: T): T {
        out.created = new Date(Date.parse(json.created));
        out.modified = new Date(Date.parse(json.modified));
        out.revision = json.revision || 1;
        out.isCloudBacked = json.isCloudBacked || false;
        return out;
    }
}

export interface AbstractStorableModelJSON {
    id: string;
    schemaRev: number;
    created: string;
    modified: string;
    isCloudBacked: boolean;
    revision: number;
}
