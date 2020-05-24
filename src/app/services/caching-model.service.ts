import {AbstractModel} from '../models/abstract-model';

/**
 * This wraps Map, which can't be extended directly.
 */
export abstract class CachingModelService<M extends AbstractModel> {

    // tslint:disable-next-line:variable-name
    protected _data = new Map<string, M>();

    clearAll(): void {
        this._data.clear();
    }

    delete(idOrObj: string | M): boolean {
        if (typeof idOrObj === 'string') {
            return this._data.delete(idOrObj as string);
        }
        else if (idOrObj instanceof AbstractModel) {
            return this._data.delete((idOrObj as AbstractModel).id);
        }
    }

    forEach(callbackfn: (value: M, index: string, map: Map<string, M>) => void, thisArg?: any): void {
        return this._data.forEach(callbackfn, thisArg);
    }

    get(id: string): M | undefined {
        return this._data.get(id);
    }

    has(id: string): boolean {
        return this._data.has(id);
    }

    add(value: M): this {
        this._data.set(value.id, value);
        return this;
    }

    get size(): number {
        return this._data.size;
    }

    // entries(): IterableIterator<[string, M]> {
    //     return this._data.entries();
    // }

    // keys(): IterableIterator<string> {
    //     return this._data.keys();
    // }

    values(): IterableIterator<M> {
        return this._data.values();
    }

    /**
     * Helper function to find something in a lookup, creating an entry if
     * it doesn't exist. Used for building the lookups, not when accessing.
     */
    protected getOrCreate(lookup: Map<string, M[]>, model: AbstractModel): M[] {
        let list = lookup.get(model.id);
        if (list == undefined) {
            list = [] as M[];
            lookup.set(model.id, list);
        }
        return list;
    }
}
