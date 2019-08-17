import { AbstractModel } from "./abstract-model";
import { DanceLevel } from "./dance-level";
import { Difficulty } from "./difficulty";
import { FlowDirection } from "./flow-direction";
import { Formation } from "./formation";
import { Hand } from "./hand";
import { SequencedItem, SequencedItemJSON } from "./sequenced-item";
import {Collection} from "./collection";

/**
 * A Module of a sequence of Calls packaged together.
 * SqAC works by stringing together, and interrupting, compatible Modules into patter.
 */
export class Module extends AbstractModel {

    /** Some descriptive name */
    name: string;

    /** CallerLab dance level */
    level: DanceLevel = "NO";

    /** The starting [Formation] that this module may be called from. */
    startFormation: Formation;

    /** The ending [Formation] when this module completes. */
    endFormation: Formation;

    /** Which hand the belle dancers need to be available at the start of this module. */
    startHandBelle: Hand = "any";

    /** Which hand the beau dancers need to be available at the start of this module. */
    startHandBeau: Hand = "any";

    /** Which hand the belle dancers last used at the end of this module. */
    endHandBelle: Hand = "any";

    /** Which hand the beau dancers last used at the end of this module. */
    endHandBeau: Hand = "any";

    /** Set of flow directions that that belles may start this module with. */
    startFlowBelle: FlowDirection = "forward";

    /** Set of flow directions that that beau may start this module with. */
    startFlowBeau: FlowDirection = "forward";

    /** Belle flow direction when the module completes. (Next module may not start in opposite direction.) */
    endFlowBelle: FlowDirection = "none";

    /** Beau flow direction when the module completes. (Next module may not start in opposite direction.) */
    endFlowBeau: FlowDirection = "none";

    /** Difficulty “flavor” */
    difficulty: Difficulty = 1;

    /// Sequence of [Call]s and Interruptions.
    sequence = <SequencedItem[]>[];

    /** Author notes */
    notes: string;

    /** Transient flag indicating if this module has been used during the current tip.
        true when used, falsey otherwise. */
    usedThisTip: boolean = undefined;

    /** Reference back to the collection that this module belongs to */
    collection: Collection;

    /** Initialize starting state for a brand new Module. */
    constructor(id?: string) {
        super(id);
    }

    /** Serialize this instance into JSON */
    public toJSON(): ModuleJSON {
        return <ModuleJSON> {
            id: this.id,
            name: this.name,
            level: this.level,
            startFormation: this.startFormation ? this.startFormation.id : undefined,
            endFormation: this.endFormation ? this.endFormation.id : undefined,
            startHandBelle: this.startHandBelle,
            startHandBeau: this.startHandBeau,
            endHandBelle: this.endHandBelle,
            endHandBeau: this.endHandBeau,
            startFlowBelle: this.startFlowBelle,
            startFlowBeau: this.startFlowBeau,
            endFlowBelle: this.endFlowBelle,
            endFlowBeau: this.endFlowBeau,
            difficulty: this.difficulty as number,
            sequence: this.sequence.map(s => s.toJSON()),
            notes: this.notes
        };
    }

    /** Initialize content from JSON */
    public static fromJSON(json: ModuleJSON): Module {
        let o = new Module(json.id);
        o.name = json.name;
        o.level = json.level as DanceLevel;

        o.startFormation = json.startFormation ? new Formation(json.startFormation) : undefined;
        o.endFormation = json.endFormation ? new Formation(json.endFormation) : undefined;

        o.startHandBelle = json.startHandBelle as Hand;
        o.startHandBeau = json.startHandBeau as Hand;
        o.endHandBelle = json.endHandBelle as Hand;
        o.endHandBeau = json.endHandBeau as Hand;

        o.startFlowBelle = json.startFlowBelle as FlowDirection;
        o.startFlowBeau = json.startFlowBeau as FlowDirection;
        o.endFlowBelle = json.endFlowBelle as FlowDirection;
        o.endFlowBeau = json.endFlowBeau as FlowDirection;

        o.difficulty = (+json.difficulty) as Difficulty;
        json.sequence.forEach(seq => o.sequence.push(SequencedItem.fromJSON(seq)));
        o.notes = json.notes;
        return o;
    }

    /**
     * Sort an array of Modules in default order.
     * 1. By name.
     * @param list to sort in place
     * @returns list
     */
    static sort(list: Module[]): Module[] {
        list.sort((a, b) => {
            return (a.name || '').localeCompare(b.name);
        });

        return list;
    }
}

export interface ModuleJSON {
    id: string;
    name: string;
    level: string;
    startFormation: string;
    endFormation: string;
    startHandBelle: string;
    startHandBeau: string;
    endHandBelle: string;
    endHandBeau: string;
    startFlowBelle: string;
    startFlowBeau: string;
    endFlowBelle: string;
    endFlowBeau: string;
    difficulty: number;
    sequence: SequencedItemJSON[];
    notes: string;
}
