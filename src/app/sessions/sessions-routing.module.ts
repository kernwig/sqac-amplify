import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {SessionPageComponent} from "./session-page.component";

const routes: Routes = [
    {
        path: '',
        component: SessionPageComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SessionsRoutingModule { }
