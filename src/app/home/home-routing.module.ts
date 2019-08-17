import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AccountComponent} from "./account.component";
import {NewsFeedComponent} from "./news-feed.component";
import {TermsOfServiceComponent} from "./terms-of-service.component";

const routes: Routes = [
    {
        path: '',
        redirectTo: 'news'
    },
    {
        path: 'account',
        component: AccountComponent
    },
    {
        path: 'news',
        component: NewsFeedComponent
    },
    {
        path: 'tos',
        component: TermsOfServiceComponent
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
