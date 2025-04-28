
const files = [ "test.quill" ];

const fs = require("fs");
const quill = require("./quill.js");

const sources = {};
for(const file of files) {
	sources[file] = fs.readFileSync(file, 'utf8');
}

const result = quill.compile(sources);
if(result.success) {
    console.log(result.code);
}
console.error(result.messages
    .map(m => quill.message.display(m, sources))
    .join("\n\n")
);
if(result.success) {
	console.log("Running program:");
	eval(result.code);
	test$main();
} else {
    console.log("Compilation failed.")
}
