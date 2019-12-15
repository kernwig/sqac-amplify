import {Pipe, PipeTransform} from '@angular/core';
import {Collection} from "../../models/collection";
import {CollectionFilter} from "../widget/collection-filter.component";

@Pipe({
    name: 'collectionFilter',
    pure: false
})
export class CollectionFilterPipe implements PipeTransform {

    transform(list: Collection[], criteria?: CollectionFilter): Collection[] {
        if (!criteria) {
            return list;
        }

        const searchText = criteria.text.toLocaleLowerCase();
        const searchDifficulty = +criteria.difficulty;
        const searchLevel = criteria.level;

        if (!searchText && !searchDifficulty && !searchLevel) {
            return list;
        }
        else {
            return list.filter(collection => {
                return (
                        !searchText
                        ||
                        (collection.name + collection.author + collection.description).toLocaleLowerCase().includes(searchText)
                    )
                    &&
                    (!searchDifficulty || collection.difficulty === searchDifficulty)
                    &&
                    (!searchLevel || collection.level === searchLevel);
            });
        }
    }
}
