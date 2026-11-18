const { isAbsolute, join, relative, resolve, sep } = require('node:path');

function buildTarget(root, args = process.argv.slice(2)) {
  const personal = args.includes('--personal'), index = args.indexOf('--outdir');
  const output = index < 0 ? undefined : args[index + 1];
  if (index >= 0 && (!output || output.startsWith('--'))) throw new Error('--outdir needs a directory.');
  const dist = resolve(root, output || 'dist'), publicDist = join(root, 'dist');
  const fromPublic = relative(publicDist, dist);
  if (personal && (!output || !fromPublic || !isAbsolute(fromPublic) && fromPublic !== '..' && !fromPublic.startsWith(`..${sep}`))) {
    throw new Error('A personal build requires --outdir outside the public dist directory.');
  }
  return { personal, dist, define: { __CHARMBITS_PERSONAL__: String(personal) },
    metadata: { edition: personal ? 'personal' : 'public' } };
}

module.exports = { buildTarget };
