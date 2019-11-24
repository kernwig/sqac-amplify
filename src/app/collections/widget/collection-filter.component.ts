import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DanceLevel, DanceLevels} from "../../models/dance-level";
import {Difficulties, Difficulty} from "../../models/difficulty";

export interface CollectionFilter {
    text: string;
    difficulty: Difficulty;
    level: DanceLevel | '';
}

/**
 * Inputs for filtering a list of collections.
 */
@Component({
    selector: 'sqac-collection-filter',
    template: `
        <form class="form-inline">
            <div class="form-group">
                <label for="text"><span class="glyphicon {{icon}}" tooltip="Clear Filters" (click)="clear()"></span></label>
                <input name="text" type="text" maxlength="40" class="form-control"
                       placeholder="name / author / description"
                       [(ngModel)]="filter.text" (ngModelChange)="apply.emit(filter)" (keyup.enter)="enter.emit(null)">
            </div>
            <div class="form-group">
                <label for="difficulty">Difficulty:</label>
                <select name="difficulty" class="form-control"
                        [(ngModel)]="filter.difficulty" (ngModelChange)="apply.emit(filter)">
                    <option *ngFor="let dif of availableDifficulties" [value]="dif">{{dif === 0 ? 'Any' : (dif | difficulty)}}</option>
                </select>
            </div>
            <div class="form-group">
                <label for="level">Level:</label>
                <select name="level" class="form-control"
                        [(ngModel)]="filter.level" (ngModelChange)="apply.emit(filter)">
                    <option value="">Any</option>
                    <option *ngFor="let level of availableDanceLevels" [value]="level">{{level | danceLevel}}</option>
                </select>
            </div>
        </form>
    `,
    styles: [`
        label {
            font-weight: 400;
            padding-left: 0.5em;
            padding-right: 0.5em;
        }
        input.form-control {
            width: 14em;
        }
    `]
})
export class CollectionFilterComponent {
    @Input() icon: string;

    /** Output emit whenever filter content changes */
    @Output() apply = new EventEmitter<CollectionFilter>();

    /** Output emit only when the enter key is pressed */
    @Output() enter = new EventEmitter<void>();

    readonly availableDanceLevels = DanceLevels;
    readonly availableDifficulties = Difficulties;

    filter: CollectionFilter;

    constructor() {
        this.clear();
    }

    clear() {
        this.filter = {
            text: '',
            difficulty: 0,
            level: '',
        };
        this.apply.emit(this.filter);
    }
}
