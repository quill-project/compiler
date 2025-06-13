
const fs = require("fs");
const path = require('path');
const quill = require("./compiler.js");

function collectFiles(dir, ext) {
    let files = [];
    for(const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.resolve(dir, f.name);
        if(f.isDirectory()) {
            files.push(...collectFiles(fp, ext));
        } else if(f.isFile() && path.extname(f.name) === ext) {
            files.push(fp);
        }
    }
    return files;
}

// collect all source files
const files = [
    ...collectFiles("./bootstrap", ".quill"),
    ...collectFiles("./std-base/src", ".quill"),
    ...collectFiles("./compiler/src", ".quill"),
    ...collectFiles("./cli/src", ".quill")
];
const srcFilesM = {};
const srcFilesL = [];
for(const file of files) {
    const content = fs.readFileSync(file, 'utf8')
	srcFilesM[file] = content;
    srcFilesL.push({ file, content });
}

// compile the compiler using the bootstrap compiler
const bscStart = Date.now();
const bsResult = quill.compile(srcFilesM);
const bscEnd = Date.now();
console.log(`Bootstrap compiler took ${bscEnd - bscStart}ms to compile QIQ`);
console.error(bsResult.messages
    .map(m => quill.message.display(m, srcFilesM))
    .join("\n\n")
);
if(!bsResult.success) {
    console.log("Compilation failed.");
    process.exit(1);
}
bsResult.code += "module.exports = quill$bootstrap$compile$$0;\n";
fs.writeFileSync("bootstrap/build.js", bsResult.code);

// have the compiler compile itself
const bootstrapped = require("./build.js");
const qiqStart = Date.now();
const result = bootstrapped(srcFilesL);
const qiqEnd = Date.now();
console.log(`QIQ took ${qiqEnd - qiqStart}ms to parse and check QIQ`);