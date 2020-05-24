/* tslint:disable:member-ordering */
import { AbstractStorableModel, AbstractStorableModelJSON } from "./abstract-storable-model";
import { Difficulty } from "./difficulty";
import { Formation, FormationJSON } from "./formation";
import { DanceLevel } from "./dance-level";
import { Family, FamilyJSON } from "./family";
import { Call, CallJSON } from "./call";
import { Module, ModuleJSON } from "./module";
import { UserSettings } from "./user-settings";
import * as Licenses from "./licenses";

/**
 * All Formations, Familys, Calls, and Modules are organized into Collections.
 * Collections may be loaded, saved, and shared with others.
 */
export class Collection extends AbstractStorableModel {

    /** Display name of this collection */
    name: string;

    /** Name of the person who created this collection */
    author: string;

    /** User ID of the author of this collection. */
    authorUserId: string;

    /** Description of the collection */
    description: string;

    /** Is this collection public? */
    isPublic: boolean;

    /** Highest difficulty flavor in this collection */
    difficulty: Difficulty = 1;

    /** Highest CallerLab dance level in this collection. */
    level: DanceLevel = "NO";

    /** All Formations defined in this collection */
    formations: Formation[] = [];

    /** All Familys defined in this collection */
    families: Family[] = [];

    /** All Calls defined in this collection. */
    calls: Call[] = [];

    /** All Modules defined in this collection. */
    modules: Module[] = [];

    /** Copyright license. */
    license: string;

    /** Construct a new instance */
    constructor(id?: string) {
        super(1, id);
    }

    /** Factory to create a brand new Collection */
    static forUser(user: UserSettings): Collection {
        const c = new Collection();
        c.name = "Collection " + c.id.substring(24);
        c.author = user.name;
        c.authorUserId = user.id;
        c.isPublic = false;
        c.license = Licenses.CC_BY.name;
        return c;
    }

    /** Serialize this instance into JSON */
    public toJSON(): CollectionJSON {
        const json = super.toJSON() as CollectionJSON;
        json.name = this.name;
        json.author = this.author;
        json.authorUserId = this.authorUserId;
        json.description = this.description;
        json.isPublic = this.isPublic;
        json.difficulty = this.difficulty;
        json.level = this.level;
        json.formations = this.formations.map(f => f.toJSON());
        json.families = this.families.map(f => f.toJSON());
        json.calls = this.calls.map(c => c.toJSON());
        json.modules = this.modules.map(m => m.toJSON());
        json.license = this.license;
        return json;
    }

    /** Initialize content from JSON */
    public static fromJSON(json?: CollectionJSON): Collection|undefined {
        if (!json) {
            return undefined;
        }

        const o = new Collection(json.id);
        AbstractStorableModel.fromAbstractJSON(json, o);
        o.name = json.name;
        o.author = json.author;
        o.authorUserId = json.authorUserId;
        o.description = json.description;
        o.isPublic = json.isPublic;
        o.difficulty = (+json.difficulty) as Difficulty;
        o.level = json.level as DanceLevel;
        o.formations = Array.isArray(json.formations) ? json.formations.map(f => Formation.fromJSON(f)) : [];
        o.families = Array.isArray(json.families) ? json.families.map(f => Family.fromJSON(f)) : [];
        o.calls = Array.isArray(json.calls) ? json.calls.map(c => Call.fromJSON(c)) : [];
        o.modules = Array.isArray(json.modules) ? json.modules.map(m => Module.fromJSON(m)) : [];
        o.license = json.license || "";
        return o;
    }
}

export interface CollectionJSON extends AbstractStorableModelJSON {
    name: string;
    author: string;
    authorUserId: string;
    description: string;
    isPublic: boolean;
    difficulty: number;
    level: string;
    formations: FormationJSON[];
    families: FamilyJSON[];
    calls: CallJSON[];
    modules: ModuleJSON[];
    license: string;
}
