import {Component} from '@angular/core';

@Component({
    selector: 'sqac-only-owner-message',
    template: `
        <div class="alert alert-warning text-center">
            You may view this content, but only the author may modify it.
        </div>
    `,
})
export class OnlyOwnerMessageComponent {
}
