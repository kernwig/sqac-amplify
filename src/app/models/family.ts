import { AbstractModel } from './abstract-model';
import { DanceLevel } from "./dance-level";
import {SearchItem} from "../collections/widget/searchable-input.component";

/**
 * A Family is a grouping of related Calls. Not quite adhering to conventional views,
 * all Calls are part of a Family. In the Callerlab Definitions documents, the numbered lists
 * are actually of Families.
 *
 * In the Mainstream list, #22 Right and Left Thru is a Family, consisting of specific Calls
 * with built-in designators such as “Heads Right and Left Thru”,
 * “Centers Right and Left Thru”, etc.
 */
export class Family extends AbstractModel implements SearchItem {
    /** Full name of the family. Ex:Right and Left Thru */
    name: string;

    /// CallerLab dance level
    level: DanceLevel;

    /** Name value for use by SearchableInputComponent */
    get searchableName(): string { return this.name; }

    /// Initialize starting state for a brand new [Family].
    constructor(id?: string) {
        super(id);
    }

    /** Serialize this instance into JSON */
    public toJSON(): FamilyJSON {
        return <FamilyJSON> {
            id: this.id,
            name: this.name,
            level: this.level.toString()
        };
    }

    /** Initialize content from JSON */
    public static fromJSON(json: FamilyJSON): Family {
        let o = new Family(json.id);
        o.name = json.name;
        o.level = json.level as DanceLevel;
        return o;
    }

    /**
     * Sort an array of Families in default order.
     * 1. By family name.
     * @param list to sort in place
     * @returns list
     */
    static sort(list: Family[]): Family[] {
        list.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        return list;
    }
}

export interface FamilyJSON {
    id: string;
    name: string;
    level: string;
}
