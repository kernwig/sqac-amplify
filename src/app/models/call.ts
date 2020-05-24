/* tslint:disable:member-ordering */
import { AbstractModel } from './abstract-model';
import { Family } from "./family";
import {SearchItem} from "../collections/widget/searchable-input.component";

/**
 * A Call is the command that is given to dancers during a dance.
 * All Calls are members of a [Family].
 */
export class Call extends AbstractModel implements SearchItem {
    /** The command to speak, as displayed when calling..  Ex: Heads Right and Left Thru */
    command: string;

    /** How many beats of music this call requires to be danced. */
    beats: number;

    /** Which [Family] is this call a member of? */
    family: Family;

    /** Name value for use by SearchableInputComponent */
    get searchableName(): string { return this.command + " (" + this.beats + ")"; }

    /** Initialize starting state for a brand new [Call]. */
    constructor(id?: string) {
        super(id);
    }

    /** Serialize this instance into JSON */
    public toJSON(): CallJSON {
        return {
            id: this.id,
            command: this.command,
            beats: this.beats,
            family: this.family.id
        };
    }

    /** Initialize content from JSON */
    public static fromJSON(json: CallJSON): Call {
        const o = new Call(json.id);
        o.command = json.command;
        o.beats = json.beats;
        o.family = new Family(json.family);
        return o;
    }

    /**
     * Sort an array of Calls in default order.
     * 1. By family name.
     * 2. By command.
     * 3. By beats.
     * @param list to sort in place
     * @returns list
     */
    static sort(list: Call[]): Call[] {
        list.sort((a, b) => {
            let c = a.family.name.localeCompare(b.family.name);
            if (c !== 0) {
                return c;
            }
            c = a.command.localeCompare(b.command);
            if (c !== 0) {
                return c;
            }
            else {
                return a.beats - b.beats;
            }
        });

        return list;
    }
}

export interface CallJSON {
    id: string;
    command: string;
    beats: number;
    family: string; // id ref
}
