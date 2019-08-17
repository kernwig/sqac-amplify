import { Pipe, PipeTransform } from "@angular/core";

/**
 * Difficulty "flavors".
 */

export const DifficultyMap = {
    0: "Unset",
    1: "Plain",
    2: "Vanilla",
    3: "Pepper",
    4: "Tabasco"
};

export type Difficulty = 0 | 1 | 2 | 3 | 4;
export const Difficulties: number[] = [ 0, 1, 2, 3, 4 ];
export const DifficultyMin = 1;
export const DifficultyMax = 4;

/**
 * Translate a Difficulty "flavor" into a display name.
 */
@Pipe({name: 'difficulty'})
export class DifficultyPipe implements PipeTransform {
    transform(value: Difficulty | number) {
        return DifficultyMap[value] || "Unknown/"+value;
    }
}
