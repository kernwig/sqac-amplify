import { Pipe, PipeTransform } from "@angular/core";

/**
 * Refers to a dancer's [Hand] or handedness.
 */

export interface HandMeta {
    /** U/I display text */
    displayText: string;

    /** If this is "Last Hand Used", which "Hand Needed" may we *not* use next? */
    violation: Hand;
}

export const HandMap: {[id: string]: HandMeta} = {
    any: {
        displayText: "None/Either",
        violation: null
    },
    left: {
        displayText: "Left",
        violation: "left"
    },
    right: {
        displayText: "Right",
        violation: "right"
    },
    both: {
        displayText: "Both",
        violation: null
    }
};

export type Hand = keyof typeof HandMap;
// export type Hand = "any"|"left"|"right"|"both";

export const Hands: string[] = Object.keys(HandMap);

/**
 * Translate a Hand into a display name.
 */
@Pipe({name: 'hand'})
export class HandPipe implements PipeTransform {
    transform(value: Hand | string) {
        const meta: HandMeta = HandMap[value];
        return meta ? meta.displayText : "Unknown/" + value;
    }
}
