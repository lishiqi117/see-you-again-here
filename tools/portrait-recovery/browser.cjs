let pw;try{pw=require('playwright')}catch{pw=require('C:/Users/25044/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
module.exports={chromium:pw.chromium,executablePath:process.env.BROWSER_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')};
