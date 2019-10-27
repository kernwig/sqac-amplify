/* tslint:disable:max-line-length */
/**
 * Pre-defined licenses for collections.
 */
export class License {

    constructor(
        public name: string,
        public description: string
    ) {
    }
}

export const PublicDomain = new License("CC0", "Public Domain: This license is for work that holds contains no copyright, and thus be be used without restriction.");
export const CC_BY = new License("CC BY", "Creative Commons Attribution: This license lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit the author(s) for the original creation.");
export const CC_BY_SA = new License("CC BY-SA", "Creative Commons Attribution-Share Alike: This license lets others remix, tweak, and build upon the work even for commercial purposes, as long as they credit the author(s) and license their new creations under the identical terms.");
export const CC_BY_ND = new License("CC BY-ND", "Creative Commons Attribution-No Derivations: This license allows for redistribution, commercial and non-commercial, as long as it is passed along unchanged and in whole, with credit to the author(s).");

export const All = [ PublicDomain, CC_BY, CC_BY_SA, CC_BY_ND ];
