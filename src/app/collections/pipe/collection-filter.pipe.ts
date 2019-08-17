import {Pipe, PipeTransform} from '@angular/core';
import {Collection} from "../../models/collection";
import {CollectionFilter} from "../widget/collection-filter.component";

@Pipe({
    name: 'collectionFilter',
    pure: false
})
export class CollectionFilterPipe implements PipeTransform {

    transform(list: Collection[], criteria: CollectionFilter): Collection[] {
        const searchText = criteria.text ? criteria.text.toLocaleUpperCase() : null;
        const searchDifficulty = (criteria.difficulty as any) === '0' ? 0 : criteria.difficulty;

        if (!searchText && !searchDifficulty && !criteria.level) {
            return list;
        }
        else {
            return list.filter(collection => {
                return (
                        !searchText
                        ||
                        (collection.name + collection.author + collection.description).toLocaleUpperCase().includes(searchText)
                    )
                    &&
                    (!searchDifficulty || collection.difficulty == searchDifficulty)
                    &&
                    (!criteria.level || collection.level == criteria.level);
            });
        }
    }
}
