
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

// compile the compiler using the bootstrap compiler
const bscFiles = [
    ...collectFiles("./bootstrap", ".quill"),
    ...collectFiles("./std-base/src", ".quill"),
    ...collectFiles("./compiler/src", ".quill")
];
const bscSrcFiles = {};
for(const file of bscFiles) {
    const content = fs.readFileSync(file, 'utf8')
	bscSrcFiles[file] = content;
}
const bscStart = Date.now();
const bsResult = quill.compile(bscSrcFiles);
const bscEnd = Date.now();
console.log(`Bootstrap compiler took ${bscEnd - bscStart}ms to compile QIQ`);
console.error(bsResult.messages
    .map(m => quill.message.display(m, bscSrcFiles))
    .join("\n\n")
);
if(!bsResult.success) {
    console.log("Compilation failed.");
    process.exit(1);
}
bsResult.code += "module.exports = quill$bootstrap$compile$$0;\n";
fs.writeFileSync("bootstrap/build.js", bsResult.code);

// have the compiler compile itself
const qiqFiles = [
    ...collectFiles("./std-base/src", ".quill"),
    ...collectFiles("./std-c/src", ".quill"),
    ...collectFiles("./compiler/src", ".quill"),
    ...collectFiles("./cli/src", ".quill")
];
const qiqSrcFiles = [];
for(const file of qiqFiles) {
    const content = fs.readFileSync(file, 'utf8')
    qiqSrcFiles.push({ file, content });
}
const bootstrapped = require("./build.js");
const qiqStart = Date.now();
const result = bootstrapped(qiqSrcFiles, "quill::cli::main");
const qiqEnd = Date.now();
console.log(`QIQ took ${qiqEnd - qiqStart}ms to compile QIQ`);
fs.writeFileSync("bootstrap/build.c", result);