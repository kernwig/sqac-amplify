import { Call } from "./call";

const headSideRexEx = /^\((.+)\/(.+)\)/;

/**
 * A single item in a sequence. May reference a Call or define an Interruption.
 */
export class SequencedItem /*extends Interruption*/ {

    /**
     * The Call at this point in the sequence. If non-null, the Interruption base class fields
     * are null and this step in the sequence is simply the call.
     */
    call: Call;

    /** Alternative command for the call. Use for more directional calling. */
    altCommand: string;

    /** If true, this call will be performed by part of the square at the same time as the others do the next call in sequence. */
    concurrentWithNext: boolean;

    /**
     * If altCommand has a substitution option,
     * the current random substituted version is stored here so that it'll be consistent for the tip.
     */
    private substitutedCommand: string;

    /** Return the text to display */
    get displayText() {
        if (this.altCommand) {

            return this.substitute(this.altCommand);
        }
        else {
            let text = this.call.command;
            if (this.concurrentWithNext)
                text += " and...";
            return text;
        }

    }

    resetSubstitution(): SequencedItem {
        this.substitutedCommand = undefined;
        return this;
    }

    /** Serialize this instance into JSON */
    public toJSON(): SequencedItemJSON {
        return <SequencedItemJSON> {
            call: this.call.id,
            altCommand: this.altCommand,
            concurrent: this.concurrentWithNext
        };
    }

    /** Initialize content from JSON */
    public static fromJSON(json: SequencedItemJSON): SequencedItem {
        let o = new SequencedItem();
        o.call = new Call(json.call);
        o.altCommand = json.altCommand;
        o.concurrentWithNext = json.concurrent;
        return o;
    }

    /**
     * If command starts with pattern "(option1/option2) ", then
     * select one of the options at random and substitute it in.
     * @param {string} command
     * @returns {string}
     */
    private substitute(command: string): string {
        if (this.substitutedCommand) {
            return this.substitutedCommand;
        }
        else if (command.charAt(0) === '(') {
            const result = headSideRexEx.exec(command);
            if (result) {
                console.debug("Substituted for " + command);
                const idx = Math.floor(Math.random() * (result.length - 1)) + 1;
                this.substitutedCommand = result[idx] + command.substr(result[0].length);
                return this.substitutedCommand;
            }
        }

        return command;
    }
}

export interface SequencedItemJSON {
    call: string;
    altCommand: string;
    concurrent: boolean;
}
