import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {ChoreographerService} from "../services/choreographer.service";
import * as noUiSlider from "nouislider";
import {Difficulty, DifficultyMap, DifficultyMax, DifficultyMin} from "../models/difficulty";
import {Subject} from "rxjs";
import {debounceTime} from "rxjs/operators";

@Component({
    selector: 'sqac-max-difficulty',
    template: `
        <div style="min-height: 86px">
            <label>Max Difficulty:</label>
            <div style="padding: 0 25px">
                <div #slider></div>
            </div>
        </div>
    `,
    styles: []
})
export class MaxDifficultyComponent implements AfterViewInit, OnDestroy {

    @ViewChild('slider') slider: ElementRef;

    /** Delay processing slider changes until it stops changing */
    private slideDebouncer$ = new Subject();

    constructor(public choreoSvc: ChoreographerService) {
    }

    ngAfterViewInit() {
        const config: noUiSlider.Options = {
            start: [this.choreoSvc.maxDifficulty],
            range: {
                min: DifficultyMin,
                max: DifficultyMax
            },
            step: 1,
            pips: {
                mode: 'count',
                values: 4,
                density: 99,
                format: new DifficultyFormatter()
            }
        };

        const elem = this.slider.nativeElement;
        noUiSlider.create(elem, config);

        this.slideDebouncer$
            .pipe(debounceTime(2000))
            .subscribe(() => this.choreoSvc.activateCriteria());

        elem.noUiSlider.on('set', (values: any[]) => {
            const value = Number.parseFloat(values[0]);
            this.choreoSvc.maxDifficulty = value as Difficulty;
            this.slideDebouncer$.next();
        });
    }

    ngOnDestroy() {
        const elem = this.slider.nativeElement;
        elem.noUiSlider.off('set');
        elem.noUiSlider.destroy();
        this.slideDebouncer$.complete();
    }
}

class DifficultyFormatter {
    to(value: number): string {
        return DifficultyMap[value];
    }
}
