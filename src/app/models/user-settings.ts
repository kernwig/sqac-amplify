/* tslint:disable:member-ordering */
import { AbstractStorableModel, AbstractStorableModelJSON } from "./abstract-storable-model";
import { DanceSession, DanceSessionJSON } from "./dance-session";
import {Collection} from './collection';
import {StorageLocation} from './storage-location';

/*
 * AuthUser's application settings.
 */
export class UserSettings extends AbstractStorableModel {

    /** This user's name. */
    name: string;

    /** Primary email address */
    email: string;

    /**
     * Storage paths to other's collections that are subscribed to.
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

    subscribeCollection(collection: Collection) {
        this.collections.add(new StorageLocation(collection).path);
    }

    unsubscribeCollection(collection: Collection) {
        this.collections.delete(new StorageLocation(collection).path);
    }

    /** Serialize this instance into JSON */
    public toJSON(): UserSettingsJSON {
        const json = super.toJSON() as UserSettingsJSON;
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
        const o = new UserSettings(json.id);
        AbstractStorableModel.fromAbstractJSON<UserSettings>(json, o);
        o.name = json.name;
        o.email = json.email;
        if (json.collections) {
            json.collections.forEach(c => o.collections.add(c));
        }
        if (json.sessions) {
            json.sessions.forEach(s => o.sessions.push(DanceSession.fromJSON(s)));
        }
        if (json.activeSession) {
            o.activeSession = o.sessions.find((session) => session.id === json.activeSession);
        }
        return o;
    }
}

export interface UserSettingsJSON extends AbstractStorableModelJSON {
    name: string;
    email: string;
    collections: string[];
    sessions?: DanceSessionJSON[];
    activeSession: string;
}
