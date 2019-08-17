import {NgModule} from "@angular/core";

import {SharedModule} from "../shared/shared.module";
import {HomeRoutingModule} from "./home-routing.module";
import {AccountComponent} from "./account.component";
import {NewsFeedComponent} from "./news-feed.component";
import {TermsOfServiceComponent} from "./terms-of-service.component";

@NgModule({
    imports: [
        SharedModule,
        HomeRoutingModule,
    ],
    declarations: [
        AccountComponent, NewsFeedComponent, TermsOfServiceComponent
    ]
})
export class HomeModule {
}
