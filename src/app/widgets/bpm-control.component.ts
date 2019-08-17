import {Component, HostListener} from "@angular/core";
import {ChoreographerService} from "../services/choreographer.service";

/**
 * U/I control for adjusting the Choreographer's Beats Per Minute speed.
 */
@Component({
    selector: 'sqac-bpm-control',
    template: `
        <label>BPM:</label>
        <div class="input-group bpm">
            <span class="input-group-addon">
                <span class="glyphicon glyphicon-minus" (click)="adjust(-2)"></span>
            </span>
            <input type="number" class="form-control" min="100" max="999" [(ngModel)]="bpm">
            <span class="input-group-addon">
                <span class="glyphicon glyphicon-plus" (click)="adjust(2)"></span>
            </span>
        </div>
    `,
    styles: [`
        div.bpm {
            width: 10em;
        }

        /* Disable number arrows on WebKit and Firefox. Edge doesn't have them? */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        input[type=number] {
            -moz-appearance:textfield;
        }
    `]
})
export class BpmControlComponent {

    constructor(private choreoSvc: ChoreographerService) {
    }

    get bpm() {
        return this.choreoSvc.bpm;
    }

    set bpm(value: number) {
        this.choreoSvc.bpm = value;
    }

    adjust(amount: number) {
        this.choreoSvc.bpm += amount;
    }

    @HostListener('window:keydown', ['$event'])
    hotkeys(ev : KeyboardEvent) {
        switch (ev.key) {
            case '+':
            case '=': {
                this.adjust(1);
                break;
            }
            case '-':
            case '_': {
                this.adjust(-1);
                break;
            }
        }
    }
}
