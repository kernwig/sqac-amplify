import {Component, Input} from '@angular/core';

@Component({
    selector: 'sqac-news-item',
    templateUrl: './news-item.component.html',
})
export class NewsItemComponent {
    @Input() headline: string;
    @Input() date: string; // ISO Date
}
