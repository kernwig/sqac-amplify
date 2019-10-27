import { Pipe, PipeTransform } from "@angular/core";

/**
 * Refers to which way the dancers are flowing.
 */

export interface FlowDirectionMeta {
    /** U/I display text */
    displayText: string;

    /** If this is the current flow, what new flow would be "bad" flow? */
    bad: FlowDirection;
}

export const FlowDirectionMap = {
    none: {
        displayText: "None",
        bad: null
    },
    forward: {
        displayText: "Forward",
        bad: "back"
    },
    back: {
        displayText: "Back",
        // theoretically "forward" should be bad,
        // but in rare practice when flow is "back", someone ends up rock-stepping forward
        bad: null
    },
    left: {
        displayText: "Left",
        bad: "right"
    },
    right: {
        displayText: "Right",
        bad: "left"
    }
};

export type FlowDirection = keyof typeof FlowDirectionMap;
// export type FlowDirection = "none"|"forward"|"back"|"left"|"right";

export const FlowDirections: string[] = Object.keys(FlowDirectionMap);

/**
 * Translate a FlowDirection into a display name.
 */
@Pipe({name: 'flowDirection'})
export class FlowDirectionPipe implements PipeTransform {
    transform(value: FlowDirection | string) {
        const meta: FlowDirectionMeta = FlowDirectionMap[value];
        return meta ? meta.displayText : "Unknown/" + value;
    }
}
