
const tests = [
    "std::tests::range",
    "std::tests::range_incl",
    "std::tests::count_up_from",

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
    "std::tests::list::slice_from",
    "std::tests::list::slice_to",
    "std::tests::list::length",
    "std::tests::list::splice",
    "std::tests::list::as_string",
    "std::tests::list::as_hash",
    "std::tests::list::empty",
    "std::tests::list::of",
    "std::tests::list::get",
    "std::tests::list::indices",
    "std::tests::list::indices_rep",
    "std::tests::list::values",
    "std::tests::list::values_rep",
    "std::tests::list::reversed",
    "std::tests::list::collect",
    "std::tests::list::is_empty",
    "std::tests::list::remove",
    "std::tests::list::pop",
    "std::tests::list::clear",

    "std::tests::result::as_string",
    "std::tests::result::as_hash",
    "std::tests::result::and",
    "std::tests::result::and_then",
    "std::tests::result::or",
    "std::tests::result::or_else",
    "std::tests::result::get_ok",
    "std::tests::result::get_err",
    "std::tests::result::is_ok",
    "std::tests::result::is_err",
    "std::tests::result::ok_seq",
    "std::tests::result::err_seq",
    "std::tests::result::map",
    "std::tests::result::map_err",
    "std::tests::result::unwrap_or",
    "std::tests::result::unwrap_or_else",
    "std::tests::result::unwrap_err_or",
    "std::tests::result::unwrap_err_or_else",
    
    "std::tests::sequence::of",
    "std::tests::sequence::empty",
    "std::tests::sequence::chain",
    "std::tests::sequence::zip",
    "std::tests::sequence::map",
    "std::tests::sequence::skip",
    "std::tests::sequence::take",
    "std::tests::sequence::take_while",
    "std::tests::sequence::take_until",
    "std::tests::sequence::flatten",
    "std::tests::sequence::length",
    "std::tests::sequence::last",
    "std::tests::sequence::find",
    "std::tests::sequence::find_last",
    "std::tests::sequence::any",
    "std::tests::sequence::all",
    "std::tests::sequence::fold",
    "std::tests::sequence::reduce",
    "std::tests::sequence::filter",

    "std::tests::stream::of",
    "std::tests::stream::zip",
    "std::tests::stream::map",
    "std::tests::stream::skip",
    "std::tests::stream::take",
    "std::tests::stream::take_while",
    "std::tests::stream::take_until",
    "std::tests::stream::flatten",
    "std::tests::stream::filter",
    
    "std::tests::string::slice",
    "std::tests::string::concat",
    "std::tests::string::length",
    "std::tests::string::as_code",
    "std::tests::string::from_code",
    "std::tests::string::chars",
    "std::tests::string::chars_rep",
    "std::tests::string::as_string",
    "std::tests::string::as_hash",
    "std::tests::string::join",
    "std::tests::string::indices",
    "std::tests::string::indices_rep",
    "std::tests::string::codes",
    "std::tests::string::codes_rep",
    "std::tests::string::get",
    "std::tests::string::slice_from",
    "std::tests::string::slice_to",
    "std::tests::string::starts_with",
    "std::tests::string::ends_with",
    "std::tests::string::find",
    "std::tests::string::find_all",
    "std::tests::string::fmt",
    "std::tests::string::repeat",
    "std::tests::string::repeat_to",
    "std::tests::string::pad_begin",
    "std::tests::string::pad_end",
    "std::tests::string::split",
    "std::tests::string::replace",

    "std::tests::map::empty",
    "std::tests::map::of",
    "std::tests::map::collect",
    "std::tests::map::set_load_factor",
    "std::tests::map::set_capacity",
    "std::tests::map::add",
    "std::tests::map::set",
    "std::tests::map::as_string",
    "std::tests::map::as_hash",
    "std::tests::map::load_factor",
    "std::tests::map::capacity",
    "std::tests::map::size",
    "std::tests::map::is_empty",
    "std::tests::map::get",
    "std::tests::map::has",
    "std::tests::map::keys",
    "std::tests::map::keys_rep",
    "std::tests::map::values",
    "std::tests::map::values_rep",
    "std::tests::map::entries",
    "std::tests::map::entries_rep",
    "std::tests::map::remove",
    "std::tests::map::clear",

    "std::tests::float::as_string",
    "std::tests::float::as_int",
    "std::tests::float::as_radians",
    "std::tests::float::as_degrees",
    "std::tests::float::abs",
    "std::tests::float::max",
    "std::tests::float::min",
    "std::tests::float::clamp",
    "std::tests::float::sign",
    "std::tests::float::parse",

    "std::tests::int::as_string",
    "std::tests::int::as_float",
    "std::tests::int::as_hash",
    "std::tests::int::abs",
    "std::tests::int::max",
    "std::tests::int::min",
    "std::tests::int::clamp",
    "std::tests::int::sign",
    "std::tests::int::parse",

    "std::tests::set::empty",
    "std::tests::set::of",
    "std::tests::set::collect",
    "std::tests::set::set_load_factor",
    "std::tests::set::set_capacity",
    "std::tests::set::add",
    "std::tests::set::as_string",
    "std::tests::set::as_hash",
    "std::tests::set::load_factor",
    "std::tests::set::capacity",
    "std::tests::set::size",
    "std::tests::set::is_empty",
    "std::tests::set::has",
    "std::tests::set::values",
    "std::tests::set::values_rep",
    "std::tests::set::remove",
    "std::tests::set::clear",



    "quill::tests::lexer::is_alphabetic",
    "quill::tests::lexer::is_numeric",
    "quill::tests::lexer::is_alphanumeric",
    "quill::tests::lexer::is_whitespace",
    "quill::tests::lexer::parse_hex_digit",
    "quill::tests::lexer::parse_hex_number",
    "quill::tests::lexer::int_literals",
    "quill::tests::lexer::float_literals",
    "quill::tests::lexer::keyword_literals",
    "quill::tests::lexer::string_literals",
    "quill::tests::lexer::symbols",
    "quill::tests::lexer::symbol_merging",
    "quill::tests::lexer::keywords",
    "quill::tests::lexer::identifiers",

    "quill::tests::parser::literals",
    "quill::tests::parser::unary",
    "quill::tests::parser::binary",
    "quill::tests::parser::types",
    "quill::tests::parser::variables",
    "quill::tests::parser::control_flow",
    "quill::tests::parser::declarations",

    "quill::tests::types::collection",
    "quill::tests::types::aliases",
    "quill::tests::types::hoisting",
    
    "quill::tests::checker::declarations",
    "quill::tests::checker::numeric",
    "quill::tests::checker::structs",
    "quill::tests::checker::generics",
    "quill::tests::checker::patterns",
    "quill::tests::checker::matching",
    "quill::tests::checker::closure_captures"
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
    ...collectFiles("./bootstrap/std-js", ".quill"),
    ...collectFiles("./std-base", ".quill"),
    ...collectFiles("./compiler", ".quill")
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
    fs.writeFileSync("bootstrap/build.js", result.code);
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
