import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {ChoreographerService} from "../services/choreographer.service";
import {Difficulty, DifficultyMap, DifficultyMax, DifficultyMin} from "../models/difficulty";
import * as noUiSlider from "nouislider";
import {Subject} from "rxjs";
import {debounceTime} from "rxjs/operators";

@Component({
    selector: 'sqac-average-difficulty',
    template: `
        <div style="min-height: 86px">
            <label>Average Difficulty:</label>
            <div style="padding: 0 25px">
                <div #slider></div>
            </div>
        </div>
    `,
    styles: []
})
export class AverageDifficultyComponent implements AfterViewInit, OnDestroy {

    @ViewChild('slider') slider: ElementRef;

    /** Delay processing slider changes until it stops changing */
    private slideDebouncer$ = new Subject();

    constructor(public choreoSvc: ChoreographerService) {
    }

    ngAfterViewInit() {
        let config: noUiSlider.Options = {
            start: [2/*this.choreoSvc.maxDifficulty*/],
            range: {
                min: DifficultyMin,
                max: DifficultyMax
            },
            step: 0.25,
            pips: {
                mode: 'count',
                values: 4,
                density: 8,
                format: new DifficultyFormatter()
            }
        };

        let elem = this.slider.nativeElement;
        noUiSlider.create(elem, config);

        this.slideDebouncer$
            .pipe(debounceTime(2000))
            .subscribe(() => this.choreoSvc.activateCriteria());

        elem.noUiSlider.on('set', (values: any[]) => {
            let value = Number.parseFloat(values[0]);
            this.choreoSvc.targetDifficulty = value as Difficulty;
            this.slideDebouncer$.next();
        });
    }

    ngOnDestroy() {
        let elem = this.slider.nativeElement;
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
