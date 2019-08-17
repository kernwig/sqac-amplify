import {Injectable} from "@angular/core";
import {Family} from "../models/family";
import {CachingModelService} from "./caching-model.service";

/**
 * Provider of loaded Families.
 */
@Injectable()
export class FamilyService extends CachingModelService<Family> {

    constructor() {
        super();
    }

    /**
     * Clear all data from this service.
     * @override
     */
    clearAll(): void {
        this.clearCache();
        super.clearAll();
    }

    /**
     * Cleared cached data (ex: lookup maps) when something changes.
     */
    clearCache(): void {
    }

    /**
     * Resolve references in data managed by this service.
     * Typically called by CollectionService after Collections have loaded.
     * @return true if all items are available
     */
    resolveReferences(): boolean {
        // No external references, thus everything is available.
        super.forEach(family => family.isAvailable = true);
        return true;
    }
}
