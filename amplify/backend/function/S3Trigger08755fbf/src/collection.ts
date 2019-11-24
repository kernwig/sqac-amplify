export interface CollectionJSON {
    id: string;
    schemaRev: number;
    created: string;
    modified: string;
    revision: number;
    name: string;
    author: string;
    authorUserId: string;
    description: string;
    isPublic: boolean;
    difficulty: number;
    level: string;
    formations: any[] | number;
    families:  any[] | number;
    calls: any[] | number;
    modules: any[] | number;
    license: string;
}

export function isCollection(key: string): boolean {
    return !key.includes('/settings');
}

export function isPrivateFile(key: string): boolean {
    return key.startsWith('private/');
}

/**
 * Gleam what Collection data we can from an S3 key.
 */
export function disectCollectionkey(key: string): Partial<CollectionJSON> {
    const [level, authorUserId, file] = key.split('/');
    const plusPos = file.lastIndexOf('+');
    return {
        id: plusPos > 0 ? file.substring(0, plusPos) : file,
        revision: plusPos > 0 ? Number.parseInt(key.substring(plusPos + 1), 10) : undefined,
        authorUserId,
        isPublic: level === 'protected'
    };
}

export function privateToPublicCollectionKey(key: string): string {
    const collection = disectCollectionkey(key);
    return 'protected/' + collection.authorUserId + '/' + collection.id;
}

export function getPrivateCollectionKey(collection: CollectionJSON): string {
    return 'private/' + collection.authorUserId + '/' + collection.id + '+' + collection.revision;
}

/**
 * Validate that the content truly looks like a Collection, and covert arrays to counts.
 */
export function validateAndCount(collection: CollectionJSON): CollectionJSON | null {
    if (
        collection.id && collection.created && collection.revision &&
        collection.name && collection.author && collection.difficulty && collection.level &&
        collection.formations && collection.calls && collection.modules && collection.license
    ) {
        collection.families = (collection.families as any[]).length;
        collection.formations = (collection.formations as any[]).length;
        collection.calls = (collection.calls as any[]).length;
        collection.modules = (collection.modules as any[]).length;
        return collection;
    }
    else {
        return null;
    }
}
