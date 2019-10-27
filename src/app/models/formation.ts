/* tslint:disable:member-ordering */
import { AbstractModel } from './abstract-model';
import { DanceLevel } from "./dance-level";
import {SearchItem} from "../collections/widget/searchable-input.component";

/**
 * A Formation defines where each dancer is an which way they are facing.
 * (SqAC doesn't actually care what the formation looks like.
 * These are simply used to match of modules.)
 */
export class Formation extends AbstractModel implements SearchItem {

    /** Name given to this formation. Ex: Sashayed Facing Lines */
    name: string;

    /** Short abbreviation of the formation name. Ex: SS */
    abbreviation: string;

    /** CallerLab dance level */
    level: DanceLevel;

    /** Name value for use by SearchableInputComponent */
    get searchableName(): string { return this.abbreviation + " - " + this.name; }

    /** Initialize starting state for a brand new Formation. */
    constructor(id?: string) {
        super(id);
    }

    /** Serialize this instance into JSON */
    public toJSON(): FormationJSON {
        return <FormationJSON> {
            id: this.id,
            name: this.name,
            abbr: this.abbreviation,
            level: this.level
        };
    }

    /** Initialize content from JSON */
    public static fromJSON(json: FormationJSON): Formation {
        const o = new Formation(json.id);
        o.name = json.name;
        o.abbreviation = json.abbr;
        o.level = json.level as DanceLevel;
        return o;
    }

    /**
     * Sort an array of Formations in default order.
     * 1. By name.
     * @param list to sort in place
     * @returns list
     */
    static sort(list: Formation[]): Formation[] {
        list.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        return list;
    }

}

export interface FormationJSON {
    id: string;
    name: string;
    abbr: string;
    level: string;
}
