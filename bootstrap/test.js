
const tests = [
    "std::tests::option::as_string",
    "std::tests::option::as_hash",
    "std::tests::option::and",
    "std::tests::option::and_then",
    "std::tests::option::or",
    "std::tests::option::or_else",
    "std::tests::option::unwrap_or",
    "std::tests::option::unwrap_or_else",
    "std::tests::option::map",
    "std::tests::option::is_some",
    "std::tests::option::is_none",
    "std::tests::option::ok_or",
    "std::tests::option::ok_or_else",
    "std::tests::option::flatten",
    "std::tests::option::as_seq",

    "std::tests::list::concat",
    "std::tests::list::push",
    "std::tests::list::insert",
    "std::tests::list::set",
    "std::tests::list::of_length",
    "std::tests::list::slice",
    "std::tests::list::length",
    "std::tests::list::splice",
    "std::tests::list::as_string",
    "std::tests::list::as_hash",
    "std::tests::list::of",
    "std::tests::list::get",
    "std::tests::list::as_seq",
    "std::tests::list::repeated",
    "std::tests::list::reversed",
    "std::tests::list::collect",
    "std::tests::list::is_empty",
    "std::tests::list::remove",
    "std::tests::list::pop",
    "std::tests::list::clear"
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
