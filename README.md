# quill
A beautifully simple statically typed, garbage compiled, transpiled programming language.

### Repository Structure
- `/bootstrap` - Files for the bootstrap compiler, written in Javascript
- `/compiler` - Source for the Quill compiler, written in Quill
- `/cli` - Command line interface for the Quill compiler
- `/std-base` - Base standard library (everything needed for the full compiler)

### Bootstrapping
To compile the Quill compiler from source, make sure you have Node.js installed and then run `node bootstrap/bootstrap.js`.