
const tests = [
    "std::tests::option::as_string",
    "std::tests::option::as_hash",
    "std::tests::option::unwrap_or",
    "std::tests::option::unwrap_or_else",
    "std::tests::option::map",
    "std::tests::option::is_some",
    "std::tests::option::is_none"
];

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
    ...collectFiles("./std-js", ".quill"),
    ...collectFiles("./std-base", ".quill")
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
    eval(result.code);
    let failed = 0;
    for(const test of tests) {
        console.log(`Running test '${test}'`);
        const mangled = test.split("::").join("$");
        try {
            eval(`${mangled}$$0();`);
        } catch(e) {
            console.log(`'${test}' failed:`);
            console.error(e);
            console.log();
            failed += 1;
        }
    }
    console.log(`Result: ${tests.length - failed}/${tests.length} tests passed`);
} else {
    console.log("Compilation failed.");
    process.exit(1);
}
