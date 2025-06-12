
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
const src_file_m = {};
const src_file_l = [];
for(const file of files) {
    const content = fs.readFileSync(file, 'utf8')
	src_file_m[file] = content;
    src_file_l.push({ file, content });
}

// compile the compiler using the bootstrap compiler
const result = quill.compile(src_file_m);
console.error(result.messages
    .map(m => quill.message.display(m, src_file_m))
    .join("\n\n")
);
if(!result.success) {
    console.log("Compilation failed.");
    process.exit(1);
}
result.code += "module.exports = quill$bootstrap$compile$$0;\n";
fs.writeFileSync("bootstrap/build.js", result.code);
console.log(`Wrote output to 'bootstrap/build.js'`);

// have the compiler compile itself
const bootstrapped = require("./build.js");
console.log(bootstrapped(src_file_l));