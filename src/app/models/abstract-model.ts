import * as uuid from 'uuid';

/**
 * Base class for identifiable model instances.
 */
export abstract class AbstractModel {
    /** Unique identifier */
    readonly id: string;

    /**
     * When true, this instance's fields are fully populated, including all of its children.
     * Thus it is available for use.
     */
    isAvailable: boolean;

    /**
     * Initialize a brand new instance.
     * If [id] is provided, use it instead of generating a UUID.
     * When deserializing from JSON, pass json.id.
     */
    protected constructor(id?: string) {
        this.id = (id != null ? id : uuid.v1());
        this.isAvailable = false;
    }
}
