import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node16',
  outfile: 'dist/cli.js',
  banner: {
    js: '#!/usr/bin/env -S node --no-deprecation'
  },
  external: ['@supabase/supabase-js', 'commander', 'dotenv'],
}).catch(() => process.exit(1));
