import {NgModule} from "@angular/core";

import {SharedModule} from "../shared/shared.module";
import {HomeRoutingModule} from "./home-routing.module";
import {AccountComponent} from "./account.component";
import {NewsFeedComponent} from "./news-feed.component";
import {TermsOfServiceComponent} from "./terms-of-service.component";
import {AmplifyAngularModule} from 'aws-amplify-angular';

@NgModule({
    imports: [
        SharedModule,
        HomeRoutingModule,
        AmplifyAngularModule,
    ],
    declarations: [
        AccountComponent, NewsFeedComponent, TermsOfServiceComponent
    ]
})
export class HomeModule {
}
