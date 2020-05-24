/* tslint:disable:member-ordering */
import { AbstractModel } from "./abstract-model";
import { DanceLevel } from "./dance-level";
import { Difficulty } from "./difficulty";

/**
 * SqAC may keep track of configuration for many separate dance sessions.
 * For instance, if multiple classes are being tough, each one is a session.
 * Child of UserSettings.
 */
export class DanceSession extends AbstractModel {

    /** Display name for the session. */
    name: string;

    /** Contains ID of each collection that is enabled for current use. */
    enabledCollections = new Set<string>();

    /** Contains ID of each Family that is enabled for current use - empty for all */
    enabledFamilies = new Set<string>();

    /** CallerLab dance level */
    level: DanceLevel = "PL";

    /** Beats Per Minute at which to emit choreography */
    bpm = 128.0;

    /** Probability driver for continuing to grow the module stack, vs resolving. 0 = end ASAP, 100 = always go deeper */
    continuationProbability = 50;

    /** Maximum difficulty level that may be used when selecting modules */
    maxDifficulty: Difficulty = 2;

    /** Desired average difficulty */
    targetDifficulty = 2.0;

    /** Initialize starting state for a brand new instance. */
    constructor(id?: string) {
        super(id);
        this.isAvailable = true;
    }

    /** Serialize this instance into JSON */
    public toJSON(): DanceSessionJSON {
        return {
            id: this.id,
            name: this.name,
            enabledCollections: Array.from(this.enabledCollections),
            enabledFamilies: Array.from(this.enabledFamilies),
            level: this.level,
            bpm: this.bpm,
            continuationProbability: this.continuationProbability,
            maxDifficulty: this.maxDifficulty as number,
            targetDifficulty: this.targetDifficulty
        };
    }

    /** Initialize content from JSON */
    public static fromJSON(json: DanceSessionJSON): DanceSession {
        const o = new DanceSession(json.id);
        o.name = json.name;
        json.enabledCollections.forEach(c => o.enabledCollections.add(c));
        json.enabledFamilies.forEach(f => o.enabledFamilies.add(f));
        o.level = json.level as DanceLevel;
        o.bpm = json.bpm;
        o.maxDifficulty = json.maxDifficulty as Difficulty;
        o.continuationProbability = json.continuationProbability;
        o.targetDifficulty = json.targetDifficulty as Difficulty;
        return o;
    }
}

export interface DanceSessionJSON {
    id: string;
    name: string;
    enabledCollections: string[];
    enabledFamilies: string[];
    level: string;
    bpm: number;
    continuationProbability: number;
    maxDifficulty: number;
    targetDifficulty: number;
}
