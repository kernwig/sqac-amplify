import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DanceLevel, DanceLevels} from "../../models/dance-level";
import {Difficulties, Difficulty} from "../../models/difficulty";

export interface CollectionFilter {
    text?: string;
    difficulty?: Difficulty;
    level?: DanceLevel;
}

/**
 * Inputs for filtering a list of collections.
 */
@Component({
    selector: 'sqac-collection-filter',
    template: `
        <form class="form-inline">
            <span class="glyphicon {{icon}}" tooltip="Clear Filters" (click)="clear()"></span>
            <div class="form-group">
                <input name="text" type="text" maxlength="40" class="form-control"
                       placeholder="Name / author / description"
                       [(ngModel)]="filter.text" (ngModelChange)="apply.emit(filter)" (keyup.enter)="enter.emit(null)">
            </div>
            <div class="form-group">
                <select name="difficulty" class="form-control" 
                        [(ngModel)]="filter.difficulty" (ngModelChange)="apply.emit(filter)">
                    <option *ngFor="let dif of availableDifficulties" [value]="dif">{{dif === 0 ? 'Any' : (dif | difficulty)}}</option>
                </select>
            </div>
            <div class="form-group">
                <select name="level" class="form-control"
                        [(ngModel)]="filter.level" (ngModelChange)="apply.emit(filter)">
                    <option value="">Any</option>
                    <option *ngFor="let level of availableDanceLevels" [value]="level">{{level | danceLevel}}</option>
                </select>
            </div>
        </form>
    `
})
export class CollectionFilterComponent {

    readonly availableDanceLevels = DanceLevels;
    readonly availableDifficulties = Difficulties;

    filter: CollectionFilter = {};
    @Input() icon: string;

    /** Output emit whenever filter content changes */
    @Output() apply = new EventEmitter<CollectionFilter>();

    /** Output emit only when the enter key is pressed */
    @Output() enter = new EventEmitter<void>();

    clear() {
        this.filter = {};
        this.apply.emit(this.filter);
    }
}
