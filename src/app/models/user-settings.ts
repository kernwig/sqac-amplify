import { AbstractStorableModel, AbstractStorableModelJSON } from "./abstract-storable-model";
import { DanceSession, DanceSessionJSON } from "./dance-session";

/*
 * AuthUser's application settings.
 */
export class UserSettings extends AbstractStorableModel {

    /** This user's name. */
    name: string;

    /** Primary email address */
    email: string;

    /**
     * Storage paths to collections, whether public or private.
     * May be the user's own collections, or other peoples' public collections that have been imported.
     * The distinction is easy via [Collection.authorUserId].
     * (Dev note: When toggling 'public', just add the new path. Old path will be removed when
     * a 404 happens on load. This prevents loss upon failure during switch.
     */
    collections: Set<string> = new Set<string>();

    /** All save [DanceSession]s. */
    sessions: DanceSession[] = [];

    /** The currently active Dance Session. (Points to one element in sessions.) */
    activeSession: DanceSession = null;

    /*
     * Construct for a new user.
     * The [userId] is defined by the authentication system.
     */
    constructor(userId: string) {
        super(1, userId);
    }

    /** Serialize this instance into JSON */
    public toJSON(): UserSettingsJSON {
        let json = super.toJSON() as UserSettingsJSON;
        json.name = this.name;
        json.email = this.email;
        json.collections = Array.from(this.collections);
        json.sessions = [];
        this.sessions.forEach(s => json.sessions.push(s.toJSON()));
        json.activeSession = this.activeSession ? this.activeSession.id : undefined;
        return json;
    }

    /** Initialize content from JSON */
    public static fromJSON(json: UserSettingsJSON): UserSettings {
        let o = new UserSettings(json.id);
        AbstractStorableModel.fromAbstractJSON<UserSettings>(json, o);
        o.name = json.name;
        o.email = json.email;
        if (json.collections)
            json.collections.forEach(c => o.collections.add(c));
        if (json.sessions)
            json.sessions.forEach(s => o.sessions.push(DanceSession.fromJSON(s)));
        if (json.activeSession)
            o.activeSession = o.sessions.find((session) => session.id === json.activeSession);
        return o;
    }

    /** Get the name of the authentication provider used by this user. */
    getAuthProviderName(): string {
        if (!this.id)
            return "";
        else if (this.id.startsWith("google"))
            return "Google";
        else if (this.id.startsWith("facebook"))
            return "Facebook";
        else
            return "";
    }
}

export interface UserSettingsJSON extends AbstractStorableModelJSON {
    name: string;
    email: string;
    collections: string[];
    sessions?: DanceSessionJSON[];
    activeSession: string;
}
