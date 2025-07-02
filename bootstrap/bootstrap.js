
const fs = require("fs");
const path = require('path');
const quill = require("./compiler.js");
const { exec } = require("child_process");

function collectFiles(dir, exts) {
    let files = [];
    for(const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.resolve(dir, f.name);
        if(f.isDirectory()) {
            files.push(...collectFiles(fp, exts));
        } else if(f.isFile() && exts.includes(path.extname(f.name))) {
            files.push(fp);
        }
    }
    return files;
}

// compile the compiler using the bootstrap compiler
// const bscFiles = [
//     ...collectFiles("./bootstrap", [".quill"]),
//     ...collectFiles("./std-base/src", [".quill"]),
//     ...collectFiles("./compiler/src", [".quill"])
// ];
// const bscSrcFiles = {};
// for(const file of bscFiles) {
//     const content = fs.readFileSync(file, 'utf8')
// 	bscSrcFiles[file] = content;
// }
// const bscStart = Date.now();
// const bsResult = quill.compile(bscSrcFiles);
// const bscEnd = Date.now();
// console.log(`Bootstrap compiler took ${bscEnd - bscStart}ms to compile QIQ`);
// console.error(bsResult.messages
//     .map(m => quill.message.display(m, bscSrcFiles))
//     .join("\n\n")
// );
// if(!bsResult.success) {
//     console.log("Compilation failed.");
//     process.exit(1);
// }
// bsResult.code += "module.exports = quill$bootstrap$compile$$0;\n";
// fs.writeFileSync("bootstrap/build.js", bsResult.code);

// have the compiler compile itself
const qiqSrcPaths = [
    ...collectFiles("./std-base/src", [".quill"]),
    ...collectFiles("./std-c/src", [".quill"]),
    ...collectFiles("./compiler/src", [".quill"]),
    ...collectFiles("./cli/src", [".quill"]),
    ...collectFiles("./os/src", [".quill"]),
    ...collectFiles("./conc/src", [".quill"]),
    ...collectFiles("./terminal/src", [".quill"])
];
const qiqExtSourcePaths = [
    ...collectFiles("./runtime-c/src-c", [".c"]),
    ...collectFiles("./std-c/src-c", [".c"]),
    ...collectFiles("./os/src-c", [".c"]),
    ...collectFiles("./conc/src-c", [".c"])
];
const qiqExtIncludeDirs = [
    "./runtime-c/src-c/include",
    "./std-c/src-c/include",
    "./os/src-c/include",
    "./conc/src-c/include"
]
const qiqSrcFiles = [];
for(const file of qiqSrcPaths) {
    const content = fs.readFileSync(file, 'utf8');
    qiqSrcFiles.push({ file, content });
}
const bootstrapped = require("./build.js");
const qiqStart = Date.now();
const result = bootstrapped(qiqSrcFiles, "quill::cli::main");
const qiqEnd = Date.now();
console.log(`QIQ took ${qiqEnd - qiqStart}ms to compile QIQ`);
fs.writeFileSync("bootstrap/build.c", result);

// compile the output of QIQ compiling itself using any C compiler
const ccCmd = `cc bootstrap/build.c ${qiqExtSourcePaths.join(" ")}`
    + qiqExtIncludeDirs.map(p => " -I " + p).join("")
    // + " -lm -O3 -flto -o bootstrap/build";
    // + " -lm -O0 -g -o bootstrap/build";
    + " -lm -O3 -o bootstrap/build";
console.log(ccCmd);
exec(ccCmd);