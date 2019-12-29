/**
 * Information about the current authorized (signed-in) user of the application.
 */
export interface AuthUser {
    /** Unique ID */
    id: string;

    /** Display name */
    name: string;

    /** Primary email address */
    email: string;

    /** DataURI of the user's profile picture */
    photo: string;

    /** ID provider */
    provider: string;
}
