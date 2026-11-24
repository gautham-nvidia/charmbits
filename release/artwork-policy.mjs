import policy from '../extension/src/artwork-policy.json' with { type: 'json' };

/** Also covers archived revisions and website thumbnails of the withheld studies. */
export function isWithheldArtworkFile(path) {
  const name = String(path).split(/[\\/]/).at(-1).toLowerCase();
  return policy.withheldFilePrefixes.some(prefix => name.startsWith(prefix));
}
