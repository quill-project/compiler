
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

const files = [
    ...collectFiles("./std-base", ".quill"),
    ...collectFiles("./compiler", ".quill"),
    ...collectFiles("./cli", ".quill")
];
const sources = {};
for(const file of files) {
	sources[file] = fs.readFileSync(file, 'utf8');
}

const result = quill.compile(sources);
console.error(result.messages
    .map(m => quill.message.display(m, sources))
    .join("\n\n")
);
if(result.success) {
    result.code += "quill$cli$main$$0();";
    fs.writeFileSync("bootstrap/build.js", result.code);
	console.log(`Wrote output to 'bootstrap/build.js'`);
} else {
    console.log("Compilation failed.");
    process.exit(1);
}
