import { NgModule } from '@angular/core';
import {SharedModule} from "../shared/shared.module";
import {SessionsRoutingModule} from "./sessions-routing.module";
import { SessionPageComponent } from './session-page.component';
import {WidgetsModule} from "../widgets/widgets.module";

@NgModule({
    imports: [
        SharedModule, WidgetsModule,
        SessionsRoutingModule
    ],
    declarations: [
        SessionPageComponent
    ]
})
export class SessionsModule {
}
