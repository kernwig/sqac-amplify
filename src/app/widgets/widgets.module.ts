import {NgModule} from '@angular/core';

import {SharedModule} from "../shared/shared.module";
import {BootstrapSwitchComponent} from "./bootstrap-switch.component";
import {BpmControlComponent} from "./bpm-control.component";
import {ContinuationControlComponent} from "./continuation-control.component";
import {PlayControlComponent} from "./play-control.component";
import {TipHistoryViewComponent} from "./tip-history-view.component";
import {AverageDifficultyComponent} from './average-difficulty.component';
import {MaxDifficultyComponent} from './max-difficulty.component';
import {CommandListingComponent} from './command-listing.component';
import {StopControlComponent} from './stop-control.component';

/** Components & Directives to declare and export */
const SHARED_COMPONENTS = [
    AverageDifficultyComponent,
    BootstrapSwitchComponent,
    BpmControlComponent,
    CommandListingComponent,
    ContinuationControlComponent,
    MaxDifficultyComponent,
    PlayControlComponent,
    StopControlComponent,
    TipHistoryViewComponent
];

@NgModule({
    imports: [
        SharedModule
    ],
    declarations: [...SHARED_COMPONENTS],
    exports: [...SHARED_COMPONENTS]
})
export class WidgetsModule {
}
