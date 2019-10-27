import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {ChoreographerService} from "../services/choreographer.service";
import * as noUiSlider from "nouislider";

/**
 * U/I for a slider to control the probability driver for continuing to grow the module stack, vs resolving.
 * 0 = end ASAP, 100 = always go deeper
 *
 * @see https://refreshless.com/nouislider
 */
@Component({
    selector: 'sqac-continuation-control',
    template: `
        <div style="min-height: 86px">
            <label>Continuation:</label>
            <div style="padding: 0 25px">
                <div #slider></div>
            </div>
        </div>
    `,
    styles: []
})
export class ContinuationControlComponent implements AfterViewInit, OnDestroy {

    @ViewChild('slider') slider: ElementRef;

    constructor(public choreoSvc: ChoreographerService) {
    }

    ngAfterViewInit() {
        const config: noUiSlider.Options = {
            start: [this.choreoSvc.continuationProbability],
            range: {
                min: 0,
                max: 100
            },
            step: 1,
            pips: {
                mode: 'count',
                values: 3,
                density: 4,
                format: new ContinuationFormatter()
            }
        };

        const elem = this.slider.nativeElement;
        noUiSlider.create(elem, config);

        elem.noUiSlider.on('set', (values: any[]) => {
            this.choreoSvc.continuationProbability = Number.parseFloat(values[0]);
        });
    }

    ngOnDestroy() {
        const elem = this.slider.nativeElement;
        elem.noUiSlider.off('set');
        elem.noUiSlider.destroy();
    }
}

class ContinuationFormatter {
    to(value: number): string {
        if (value === 0) {
            return "Resolve";
        }
        else if (value === 100) {
            return "Forever";
        }
        else if (value === 50) {
            return "Even Odds";
        }
        else {
            return value + "%";
        }
    }
}
