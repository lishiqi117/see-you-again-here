const path=require('path');
require('../node_modules/esbuild').buildSync({entryPoints:[path.join(__dirname,'src/main.jsx')],bundle:true,minify:true,format:'iife',outfile:path.join(__dirname,'scene.js'),define:{'process.env.NODE_ENV':'"production"'}});
console.log('Dream homepage built.');
