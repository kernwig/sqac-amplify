import {NgModule} from "@angular/core";

import {SharedModule} from "../shared/shared.module";
import {WidgetsModule} from "../widgets/widgets.module";
import {DanceRoutingModule} from "./dance-routing.module";
import {DancePageComponent} from "./dance-page.component";

@NgModule({
    imports: [
        SharedModule, WidgetsModule,
        DanceRoutingModule
    ],
    declarations: [
        DancePageComponent,
    ]
})
export class DanceModule {
}
