import {Injectable} from "@angular/core";
import {Call} from "../models/call";
import {FamilyService} from "./family.service";
import {CachingModelService} from "./caching-model.service";
import {Family} from "../models/family";

/**
 * Provider of loaded Calls.
 */
@Injectable()
export class CallService extends CachingModelService<Call> {

    /** Lookup map of Families (by id) and the Calls that belong to them */
    private lookupByFamily: Map<string, Call[]>;

    /** Construct */
    constructor(private familySvc: FamilyService) {
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
        this.lookupByFamily = undefined;
    }

    /**
     * Get a list of calls in the given Family.
     */
    getByFamily(family: Family): Call[] {
        if (!family.isAvailable)
            return [];

        if (this.lookupByFamily === undefined) {
            this.lookupByFamily = new Map<string, Call[]>();

            this.forEach((call) => {
                this.getOrCreate(this.lookupByFamily, call.family).push(call);
            });
        }

        return this.lookupByFamily.get(family.id) || [];
    }

    /**
     * Resolve references in data managed by this service.
     * Typically called by CollectionService after Collections have loaded.
     * @return true if all items are available
     */
    resolveReferences(): boolean {
        let allAvailable = true;

        // Resolve references to Family
        super.forEach((call) => {
            let f = this.familySvc.get(call.family.id);
            if (f) {
                call.family = f;
                call.isAvailable = true;
            }
            else {
                console.log(`Call ${call.id} reference to family ${call.family.id} not found`);
                call.family.isAvailable = false; //unresolved reference
                call.isAvailable = false;
                allAvailable = false;
            }
        });

        return allAvailable;
    }
}
