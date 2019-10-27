import { Pipe, PipeTransform } from "@angular/core";

/**
 * CallerLab dance level.
 */

export const DanceLevelMap = {
    NO: "Custom", // No level / custom
    B1: "Basic 1",
    B2: "Basic 2",
    MS: "Mainstream",
    PL: "Plus",
    A1: "Advanced 1",
    A2: "Advanced 2",
    // C1: "Challenge 1"
    // C2: "Challenge 2"
    // C3A: "C3A",// Challenge 3a
    // C3B: "C3B",// Challenge 3b
    // C4: "C4", // Challenge 4
};

export type DanceLevel = keyof typeof DanceLevelMap;
export const DanceLevels: string[] = Object.keys(DanceLevelMap);

const danceLevelOrderLookup = new Map<DanceLevel, number>();

/**
 * Compare first and second DanceLevel to see which is higher or lower level.
 * @param first
 * @param second
 * @return 0 if equal, -1 if first is lower level, +1 if first is higher level
 */
export function compareDanceLevels(first: DanceLevel, second: DanceLevel): number {
    if (danceLevelOrderLookup.size === 0) {
        for (let ordinal = 0; ordinal < DanceLevels.length; ++ordinal) {
            danceLevelOrderLookup.set(DanceLevels[ordinal] as DanceLevel, ordinal);
        }
    }

    const firstOrdinal = danceLevelOrderLookup.get(first);
    const secondOrdinal = danceLevelOrderLookup.get(second);
    if (firstOrdinal === secondOrdinal) {
        return 0;
    }
    else if (firstOrdinal < secondOrdinal) {
        return -1;
    }
    else {
        return 1;
    }
}

/**
 * Translate a DanceLevel enum into a display string.
 */
@Pipe({name: 'danceLevel'})
export class DanceLevelPipe implements PipeTransform {
    transform(value: DanceLevel | string) {
        return DanceLevelMap[value] || "Unknown/" + value;
    }
}
