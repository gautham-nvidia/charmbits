// Replaced in both host and renderer by the packager. Normal source/test builds
// default to public; an environment variable or saved preference cannot unlock it.
declare const __CHARMBITS_PERSONAL__: boolean;
export const PERSONAL_EDITION = typeof __CHARMBITS_PERSONAL__ !== 'undefined' && __CHARMBITS_PERSONAL__ === true;
