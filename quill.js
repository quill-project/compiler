
/*
 * - ...
 * - [*] More useful errors
 * - [*] External functions and variables
 * - [*] Module System
 * - [*] Custom Types
 * - [ ] Match statements
 *     - [ ] Make match exhaustive if is enum and all variants handled
 * - [ ] Bi-directional type checking 
 *     - (pass nullable expected type to expressions)
 * - [ ] Template functions and types
 *     - Template types must specify arguments
 *     - Function template args must be inferrable 
 *       from return type and provided arguments
 * - [ ] Anonymous Functions
 *     - Type must be inferrable from expected type,
 *       otherwise error
 * - [ ] Strings
 * - [ ] Arrays
 * - [ ] Pipes and method calls (smart pipes)
 *     1. Extend it normally
 *         - If this exists, it only tries that
 *     2. Append the called path to all imported paths
 *        and choose the one which both exists and has
 *        a fitting first argument type
 *        (e.g. if 'use std::io', then 'std::io' :: 'unwrap')
 *        (if multiple can work, throw an error)
 *         - ('use std::(iter, opt, res)')
 *         = '|> std::iter::unwrap()'
 *         = '|> std::opt::unwrap()'
 *         = '|> std::res::unwrap()'
 * - [ ] Enum unwrapping ('?Some')
 * - [ ] 'while' and 'loop' loops, 'continue' and 'break'
 *     - Have instructions in the same block after
 *        a 'continue' or 'break' be an error
 * - [ ] Any?
 */

/*


struct Cat(name: String, hunger: Float)

struct Dog(name: String, speed: Float)

enum Pet(Cat: Cat, Dog: Dog, Bird)

enum Option<T>(Some: T, None: Unit)

val my_cat: Cat = Cat("Bob", 100000.0)
val my_pet: Pet = Pet::Cat(my_cat)
match my_pet {
    Pet::Cat(Cat("Bob", hunger)) {
        return hunger > 1 { 1 } else { hunger }
    }
    Pet::Cat(my_cat) {
        
    }
    Pet::Dog(my_dog) {
    
    }
    _ {
        
    }
}

fun map<T, R>(i: Iterator<T>, f: Fun(T) -> R) -> Iterator<R> 
    = Iterator(|| i |> next() ?Some |> f() |> Option::Some())

0..20 |> map(|n| n * 2)


enum Value {
    I64: Int,
    F64: Float,
    Str: String,
    Undefined,
    ...
}

fun add(a: Value, b: Value) -> Value {
    case a {
        
    }
}



mod cool::example

use std::(iter, opt, int, io as console)

case my_iter |> next() {
    10 {  }
    5 {  }
    5 {  }
    Some as x {  }
    None
}

my_iter |> next() |> unwrap_or_else(|| console::inputln()
    |> int::parse()
    |> expect("Invalid input!")
)

my_optional_value |> unwrap()
// this will try the following:


/*
// not writing a type makes it 'Unit'
enum Option<T>(Some: T, None: Unit)

struct Member(name: String, friend: List<Member>) 
enum User(Guest, Member: Member, Moderator: Member, Admin: Member)

fun add<T>(a: T, b: T) -> T = a + b

struct Cat(name: String, age: Int, hunger: Float)

fun feed(self: Cat, amount: Int) {
    self.hunger -= amount
}

*/

const quill = (function() {

    // Utilities

    function makeEnum(...members) {
        let result = {};
        let i = 0;
        for(const member of members) {
            result[member] = i;
            i += 1;
        }
        return Object.freeze(result);
    }



    // Errors and Warnings

    const message = (function() {
        const Section = makeEnum(
            "Error",
            "Warning",
            "Note",
            "Code"
        );

        function error(text) {
            return { type: Section.Error, text };
        }
        function warning(text) {
            return { type: Section.Warning, text };
        }
        function note(text) {
            return { type: Section.Note, text };
        }
        function code(origin) {
            return { type: Section.Code, origin };
        }
        
        function from(...sections) {
            return {
                sections 
            };        
        }

        function internalError(text) {
            return from(error("(INTERNAL ERROR) " + text));
        }

        function lineOf(file, offset) {
            let line = 1;
            for(let i = 0; i < offset; i += 1) {
                if(file[i] === "\n") { line += 1; }
            }
            return line;
        }

        function columnOf(file, offset) {
            let column = 1;
            for(let i = 0; i < offset; i += 1) {
                if(file[i] === "\n") { column = 1; }
                else { column += 1; }
            }
            return column;
        }

        function display(message, sources) {
            let output = "";
            for(const section of message.sections) {
                if(output.length > 0) {
                    output += "\n";
                }
                switch(section.type) {
                    case Section.Error: {
                        output += `[error] ${section.text}`;
                        break;
                    }
                    case Section.Warning: {
                        output += `<warning> ${section.text}`;
                        break;
                    }
                    case Section.Note: {
                        output += `note: ${section.text}`;
                        break;
                    }
                    case Section.Code: {
                        const o = section.origin;
                        const file = sources[o.path];
                        output += `-> ${o.path}`;
                        if(file !== undefined) {
                            const lines = file.split("\n");
                            const startLine = lineOf(file, o.start);
                            const startCol = columnOf(file, o.start);
                            const endLine = lineOf(file, o.end - 1);
                            const endCol = columnOf(file, o.end - 1);
                            const lineCW = String(endLine).length;
                            output += `:${startLine}:${startCol}`;
                            for(let l = startLine; l <= endLine; l += 1) {
                                if((l - 1) >= lines.length) { break; }
                                const line = lines[l - 1];
                                const lineC = String(l)
                                    .padStart(lineCW, " ");
                                output += `\n ${lineC}   ${line}`;
                                output += `\n ${" ".repeat(lineCW)}   `;
                                for(let c = 1; c <= line.length; c += 1) {
                                    let m = l >= startLine && l <= endLine;
                                    if(l === startLine) { m &= c >= startCol; }
                                    if(l === endLine) { m &= c <= endCol; }
                                    output += m? "^" : " ";
                                }
                            }
                        }
                        break;
                    }
                }
            }
            return output;
        }
        
        return {
            Section,
            error, warning, note, code,
            from, internalError,
            lineOf, columnOf, display
        };
    })();



    // Tokenizer / Lexer

    const TokenType = makeEnum(
        "Identifier",
        "IntLiteral",
        "FloatLiteral",
        "BoolLiteral",
        "UnitLiteral",

        "LessThanEqual",
        "GreaterThanEqual",
        "DoubleEqual",
        "NotEqual",
        "ArrowRight",
        "DoubleAmpersand",
        "DoublePipe",
        "PathSeparator",

        "ParenOpen",
        "ParenClose",
        "BraceOpen",
        "BraceClose",
        
        "LessThan",
        "GreaterThan",
        "Equal",
        "Plus",
        "Minus",
        "Asterisk",
        "Slash",
        "Colon",
        "Comma",
        "ExclamationMark",
        "Dot",
        "Pipe",

        "KeywordIf",
        "KeywordElse",
        "KeywordExt",
        "KeywordFun",
        "KeywordReturn",
        "KeywordVal",
        "KeywordMut",
        "KeywordMod",
        "KeywordUse",
        "KeywordAs",
        "KeywordPub",
        "KeywordStruct",
        "KeywordEnum",
        "KeywordMatch",

        "End"
    );

    const fixedTokens = Object.freeze({
        "<=": TokenType.LessThanEqual,
        ">=": TokenType.GreaterThanEqual,
        "==": TokenType.DoubleEqual,
        "!=": TokenType.NotEqual,
        "->": TokenType.ArrowRight,
        "&&": TokenType.DoubleAmpersand,
        "||": TokenType.DoublePipe,
        "::": TokenType.PathSeparator,

        "(": TokenType.ParenOpen,
        ")": TokenType.ParenClose,
        "{": TokenType.BraceOpen,
        "}": TokenType.BraceClose,

        "<": TokenType.LessThan,
        ">": TokenType.GreaterThan,
        "=": TokenType.Equal,
        "+": TokenType.Plus,
        "-": TokenType.Minus,
        "*": TokenType.Asterisk,
        "/": TokenType.Slash,
        ":": TokenType.Colon,
        ",": TokenType.Comma,
        "!": TokenType.ExclamationMark,
        ".": TokenType.Dot,
        "|": TokenType.Pipe,

        "if": TokenType.KeywordIf,
        "else": TokenType.KeywordElse,
        "ext": TokenType.KeywordExt,
        "fun": TokenType.KeywordFun,
        "return": TokenType.KeywordReturn,
        "val": TokenType.KeywordVal,
        "mut": TokenType.KeywordMut,
        "mod": TokenType.KeywordMod,
        "use": TokenType.KeywordUse,
        "as": TokenType.KeywordAs,
        "pub": TokenType.KeywordPub,
        "struct": TokenType.KeywordStruct,
        "enum": TokenType.KeywordEnum,
        "match": TokenType.KeywordMatch,

        "true": TokenType.BoolLiteral,
        "false": TokenType.BoolLiteral,
        "unit": TokenType.UnitLiteral
    });

    function tokenDescription(tokenType) {
        switch(tokenType) {
            case TokenType.Identifier: return "an identifier";
            case TokenType.IntLiteral: return "an integer";
            case TokenType.FloatLiteral: return "a float";
            case TokenType.BoolLiteral: return "a boolean";
            case TokenType.UnitLiteral: return "the unit value";

            case TokenType.LessThanEqual: return "'<='";
            case TokenType.GreaterThanEqual: return "'>='";
            case TokenType.DoubleEqual: return "'=='";
            case TokenType.NotEqual: return "'!='";
            case TokenType.ArrowRight: return "'->'";
            case TokenType.DoubleAmpersand: return "'&&'";
            case TokenType.DoublePipe: return "'||'";
            case TokenType.PathSeparator: return "'::'";

            case TokenType.ParenOpen: return "'('";
            case TokenType.ParenClose: return "')'";
            case TokenType.BraceOpen: return "'{'";
            case TokenType.BraceClose: return "'}'";

            case TokenType.LessThan: return "'<'";
            case TokenType.GreaterThan: return "'>'";
            case TokenType.Equal: return "'='";
            case TokenType.Plus: return "'+'";
            case TokenType.Minus: return "'-'";
            case TokenType.Asterisk: return "'*'";
            case TokenType.Slash: return "'/'";
            case TokenType.Colon: return "':'";
            case TokenType.Comma: return "','";
            case TokenType.ExclamationMark: return "'!'";
            case TokenType.Dot: return "'.'";
            case TokeNType.Pipe: return "'|'";

            case TokenType.KeywordIf: return "'if'";
            case TokenType.KeywordElse: return "'else'";
            case TokenType.KeywordExt: return "'ext'";
            case TokenType.KeywordFun: return "'fun'";
            case TokenType.KeywordReturn: return "'return'";
            case TokenType.KeywordVal: return "'val'";
            case TokenType.KeywordMut: return "'mut'";
            case TokenType.KeywordMod: return "'mod'";
            case TokenType.KeywordUse: return "'use'";
            case TokenType.KeywordAs: return "'as'";
            case TokenType.KeywordPub: return "'pub'";
            case TokenType.KeywordStruct: return "'struct'";
            case TokenType.KeywordEnum: return "'enum'";
            case TokenType.KeywordMatch: return "'match'";

            case TokenType.End: return "the end of the file";
        }
        console.warn(`No description for token type ${tokenType}`);
        return "<no description>";
    }

    function isAlphabetic(char) {
        const c = char.charCodeAt(0);
        return (65 <= c && c <= 90)
            || (97 <= c && c <= 122);
    }

    function isNumeric(char) {
        const c = char.charCodeAt(0);
        return (48 <= c && c <= 57); 
    }

    const isAlphanumeric = char => char == "_"
        || isAlphabetic(char)
        || isNumeric(char);

    function tokenFrom(type, content, path, start, end) {
        return { type, content, path, start, end };
    }

    function tokenize(text, path, errors) {
        let output = [];
        for(let i = 0; i < text.length;) {
            if(text[i].trim().length == 0) { i += 1; continue; }
            const skipWhile = cond => {
                while(i < text.length && cond(text[i])) { 
                    i += 1; 
                }
            };
            if(text.substring(i).startsWith("//")) {
                skipWhile(c => c !== "\n");
                i += 1;
                continue;
            }
            let madeFixed = false;
            for(const content in fixedTokens) {
                const type = fixedTokens[content];
                const matches = i + content.length <= text.length
                    && text.substring(i, i + content.length) === content;
                if(!matches) { continue; }
                output.push(tokenFrom(
                    type, content, 
                    path, i, i + content.length
                ));
                i += content.length;
                madeFixed = true;
            }
            if(madeFixed) { continue; } 
            if(isNumeric(text[i])) {
                const start = i;
                skipWhile(isNumeric);
                let isFloat = text[i] === ".";
                if(isFloat) {
                    i += 1;
                    skipWhile(isNumeric);
                }
                const type = isFloat
                    ? TokenType.FloatLiteral : TokenType.IntLiteral;
                output.push(tokenFrom(
                    type, text.substring(start, i),
                    path, start, i
                ));
                continue;
            }
            if(isAlphabetic(text[i]) || text[i] === "_") {
                const start = i;
                skipWhile(isAlphanumeric);
                output.push(tokenFrom(
                    TokenType.Identifier, text.substring(start, i),
                    path, start, i
                ));
                continue;
            }
            errors.push(message.from(
                message.error(`Usage of unrecognized character '${text[i]}'`),
                message.code({ path, start: i, end: i + 1 })
            ));
            i += 1;
        }
        output.push(tokenFrom(
            TokenType.End, text.substring(text.length - 1),
            path, text.length - 1, text.length
        ));
        return output;
    }



    // Parser

    function createParserState(tokens) {
        return { 
            tokens, i: 0,

            curr: function() {
                return this.tokens[this.i];
            },
            next: function() {
                this.i += 1;
            },
            assertType: function(...types) {
                if(types.includes(this.curr().type)) { return; }
                let expected = "";
                for(let i = 0; i < types.length; i += 1) {
                    if(i > 0 && i === types.length - 1) { 
                        expected += " or "; 
                    } else if(i > 0) { 
                        expected += ", ";
                    }
                    expected += tokenDescription(types[i]);
                }
                this.reportUnexpected(expected);
                
            },
            reportUnexpected: function(expected = null) {
                const token = this.curr().type == TokenType.End
                    ? "end of file" : `token '${this.curr().content}'`;
                let msg = message.from(
                    message.error(`Unexpected ${token}`),
                    message.code(this.curr())
                );
                if(expected != null) {
                    msg.sections.push(
                        message.note(`Expected ${expected}`)
                    );
                }
                throw msg;
            }
        };
    }

    const binaryOpPrec = Object.freeze({
        "(": 2, ".": 2,
        "*": 3, "/": 3,
        "+": 4, "-": 4, 
        "<": 5, ">": 5, "<=": 5, ">=": 5,
        "==": 6, "!=": 6,
        "&&": 8, 
        "||": 9
    });

    const unaryOpPrec = Object.freeze({
        "-": 2, "!": 2
    });

    const NodeType = makeEnum(
        "Path",
        "IntLiteral",
        "FloatLiteral",
        "BoolLiteral",
        "UnitLiteral",
    
        "Multiplicative",
        "Additive",
        "Comparative",
        "Negation",
        "MemberAccess",
        "Call",
        "StructureInit",
        "EnumerationInit",
        "IfExpr",

        "Variable",
        "Assignment",
        "Return",
        "If",
        "Match",

        "Module",
        "Usage",
        "Function",
        "Structure",
        "Enumeration"
    );

    const binaryOpType = Object.freeze({
        "*": NodeType.Multiplicative, 
        "/": NodeType.Multiplicative,
        "+": NodeType.Additive,
        "-": NodeType.Additive,
        "<": NodeType.Comparative,
        ">": NodeType.Comparative,
        "<=": NodeType.Comparative,
        ">=": NodeType.Comparative,
        "==": NodeType.Comparative,
        "!=": NodeType.Comparative
    });

    const unaryOpType = Object.freeze({
        "-": NodeType.Negation,
        "!": NodeType.Negation
    });

    function valueNodeFrom(type, value, token) {
        return {
            type, value,
            path: token.path, start: token.start, end: token.end
        };
    }

    function parsePath(state, endOut = null) {
        let result = "";
        for(;;) {
            state.assertType(TokenType.Identifier);
            result += state.curr().content;
            state.next();
            const isSeparator = state.curr().type 
                === TokenType.PathSeparator;
            if(!isSeparator) { break; }
            result += "::";
            if(endOut !== null) { 
                endOut.value = state.curr().end; 
            }
            state.next();
        }
        return result;
    }

    function parseValue(state) {
        const start = state.curr();
        const value = start.content;
        switch(state.curr().type) {
            case TokenType.ParenOpen: {
                state.next();
                const value = parseExpression(state);
                state.assertType(TokenType.ParenClose);
                state.next();
                return value;
            }
            case TokenType.Identifier: {
                const path = parsePath(state);
                return valueNodeFrom(NodeType.Path, path, start);
            }
            case TokenType.IntLiteral: {
                state.next();
                return valueNodeFrom(NodeType.IntLiteral, value, start);
            }
            case TokenType.FloatLiteral: {
                state.next();
                return valueNodeFrom(NodeType.FloatLiteral, value, start);
            }
            case TokenType.BoolLiteral: {
                state.next();
                return valueNodeFrom(NodeType.BoolLiteral, value, start);
            }
            case TokenType.UnitLiteral: {
                state.next();
                return valueNodeFrom(NodeType.UnitLiteral, value, start);
            }
            case TokenType.KeywordIf: {
                state.next();
                const cond = parseExpression(state);
                state.assertType(TokenType.BraceOpen);
                state.next();
                const ifValue = parseExpression(state);
                state.assertType(TokenType.BraceClose);
                state.next();
                state.assertType(TokenType.KeywordElse);
                state.next();
                state.assertType(TokenType.BraceOpen, TokenType.KeywordIf);
                let elseValue;
                let end;
                if(state.curr().type == TokenType.KeywordIf) {
                    elseValue = parseExpression(state);
                    end = elseValue.end;
                } else {
                    state.next();
                    elseValue = parseExpression(state);
                    state.assertType(TokenType.BraceClose);
                    end = state.curr().end;
                    state.next();
                }
                return {
                    type: NodeType.IfExpr, cond, ifValue, elseValue,
                    path: start.path, start: start.start, end
                };
            }
        }
        const prec = unaryOpPrec[start.content];
        if(prec !== undefined) {
            state.next();
            const value = parseExpression(state, prec);
            return { 
                type: unaryOpType[start.content], 
                op: start.content, value,
                path: start.path, start: start.start, 
                end: value.end
            };
        }
        state.reportUnexpected("an expression");
    }

    function parseExpression(state, precedence = Infinity) {
        let collected = parseValue(state);
        for(;;) {
            const currPrec = binaryOpPrec[state.curr().content];
            if(currPrec === undefined) { return collected; }
            if(currPrec >= precedence) { return collected; }
            switch(state.curr().type) {
                case TokenType.ParenOpen: {
                    state.next();
                    let args = [];
                    while(state.curr().type != TokenType.ParenClose) {
                        args.push(parseExpression(state));
                        if(state.curr().type == TokenType.Comma) {
                            state.next();
                        }
                    }
                    const end = state.curr();
                    state.next();
                    collected = {
                        type: NodeType.Call, called: collected, args,
                        path: collected.path, start: collected.start,
                        end: end.end
                    };
                    continue;                
                }
                case TokenType.Dot: {
                    state.next();
                    state.assertType(TokenType.Identifier);
                    const name = state.curr().content;
                    const end = state.curr().end;
                    state.next();
                    collected = {
                        type: NodeType.MemberAccess, 
                        accessed: collected, name,
                        path: collected.path, start: collected.start,
                        end
                    };
                    continue;
                } 
            }
            const op = state.curr();
            state.next();
            const prec = binaryOpPrec[op.content];
            const rhs = parseExpression(state, prec);
            if(op.type == TokenType.DoubleAmpersand) {
                // 'a && b' -> 'if a { b } else { false }'
                collected = {
                    type: NodeType.IfExpr,
                    cond: collected, 
                    ifValue: rhs, 
                    elseValue: valueNodeFrom(NodeType.BoolLiteral, "false", op),
                    path: op.path, start: collected.start, end: rhs.end
                };
                continue;
            }
            if(op.type == TokenType.DoublePipe) {
                // 'a || b' -> 'if a { true } else { b }'
                collected = {
                    type: NodeType.IfExpr,
                    cond: collected,
                    ifValue: valueNodeFrom(NodeType.BoolLiteral, "true", op),
                    elseValue: rhs,
                    path: op.path, start: collected.start, end: rhs.end
                };
                continue;
            }
            collected = { 
                type: binaryOpType[op.content], 
                lhs: collected, op: op.content, rhs,
                path: collected.path, start: collected.start, 
                end: rhs.end
            };
            continue;
        }
    }

    function parseType(state) {
        switch(state.curr().type) {
            case TokenType.Identifier: {
                const start = state.curr();
                const path = parsePath(state);
                return {
                    type: NodeType.Path, value: path,
                    path: start.path, start: start.start, end: start.end
                };
            }
        }
        state.reportUnexpected("a type");
    }

    function parseArgumentList(state, allowMissing = false) {
        state.assertType(TokenType.ParenOpen);
        state.next();
        let args = [];
        state.assertType(
            TokenType.Identifier, TokenType.ParenClose
        );
        while(state.curr().type == TokenType.Identifier) {
            const name = state.curr();
            state.next();
            let type = {
                type: NodeType.Path, value: "Unit",
                path: name.path, start: name.start, end: name.end
            };
            if(!allowMissing || state.curr().type === TokenType.Colon) {
                state.assertType(TokenType.Colon);
                state.next();
                type = parseType(state);
            }
            args.push({ name: name.content, type });
            state.assertType(
                TokenType.Comma, TokenType.ParenClose
            );
            if(state.curr().type === TokenType.Comma) {
                state.next();
            }
            state.assertType(
                TokenType.Identifier, TokenType.ParenClose
            );
        }
        state.assertType(TokenType.ParenClose);
        state.next();
        return args;
    }

    function parseStatement(state, topLevel = false) {
        const assertTopLevel = tl => {
            if(tl == topLevel) { return; }
            if(tl && !topLevel) {
                throw message.from(
                    message.error("Top-level expression inside function"),
                    message.code(state.curr())
                );
            }
            if(!tl && topLevel) {
                throw message.from(
                    message.error("Local expression used outside of function"),
                    message.code(state.curr())
                );
            }
        };
        const start = state.curr();
        const parseFunction = (isPublic, isExternal) => {
            assertTopLevel(true);
            state.assertType(TokenType.KeywordFun);
            state.next();
            state.assertType(TokenType.Identifier);
            const name = state.curr().content;
            state.next();
            const args = parseArgumentList(state);
            let returnType;
            if(isExternal) {
                state.assertType(
                    TokenType.ArrowRight, TokenType.Equal
                );
            } else {
                state.assertType(
                    TokenType.ArrowRight,
                    TokenType.BraceOpen, TokenType.Equal
                );
            }
            if(state.curr().type == TokenType.ArrowRight) {
                state.assertType(TokenType.ArrowRight);
                state.next();
                returnType = parseType(state);
            } else {
                returnType = {
                    type: NodeType.Path, value: "Unit",
                    path: start.path, start: start.start, end: start.end
                };
            }
            let body = null;
            let externalName = null;
            let end = returnType.end;
            if(!isExternal) {
                state.assertType(
                    TokenType.BraceOpen, TokenType.Equal
                );
                if(state.curr().type == TokenType.Equal) {
                    state.next();
                    const value = parseExpression(state);
                    body = [
                        {
                            type: NodeType.Return, value,
                            path: value.path, start: value.start,
                            end: value.end
                        }
                    ];
                    end = value.end;
                } else {
                    state.assertType(TokenType.BraceOpen);
                    state.next();
                    body = parseStatementList(state);
                    state.assertType(TokenType.BraceClose);
                    end = state.curr().end;
                    state.next();
                }
            } else {
                state.assertType(TokenType.Equal);
                state.next();
                state.assertType(TokenType.Identifier);
                externalName = state.curr().content;
                state.next();
            }
            return {
                type: NodeType.Function, isPublic, isExternal, 
                name, args, returnType, body, externalName,
                path: start.path, start: start.start, end
            };
        };
        const parseStructure = isPublic => {
            assertTopLevel(true);
            state.assertType(TokenType.KeywordStruct);
            state.next();
            state.assertType(TokenType.Identifier);
            const name = state.curr().content;
            state.next();
            let end = state.curr().end;
            const members = parseArgumentList(state);
            if(members.length > 0) { 
                end = members.at(-1).type.end; 
            } 
            return {
                type: NodeType.Structure, isPublic,
                name, members,
                path: start.path, start: start.start, end
            };
        };
        const parseEnumeration = isPublic => {
            assertTopLevel(true);
            state.assertType(TokenType.KeywordEnum);
            state.next();
            state.assertType(TokenType.Identifier);
            const name = state.curr().content;
            state.next();
            let end = state.curr().end;
            const members = parseArgumentList(state, true);
            if(members.length > 0) {
                end = members.at(-1).type.end;
            }
            return {
                type: NodeType.Enumeration, isPublic,
                name, members,
                path: start.path, start: start.start, end
            };
        };
        const parseVariable = (isPublic, isExternal) => {
            const isMutable = state.curr().type 
                == TokenType.KeywordMut;
            state.next();
            state.assertType(TokenType.Identifier);
            const name = state.curr().content;
            state.next();
            if(!isExternal) {
                state.assertType(TokenType.Equal, TokenType.Colon);
            } else {
                state.assertType(TokenType.Colon);
            }
            let valueType = null;
            if(state.curr().type === TokenType.Colon) {
                state.next();
                valueType = parseType(state);
            }
            state.assertType(TokenType.Equal);
            state.next();
            let value = null;
            let externalName = null;
            let end;
            if(!isExternal) {
                value = parseExpression(state);
                end = value.end;
            } else {
                state.assertType(TokenType.Identifier);
                externalName = state.curr().content;
                end = state.curr().end;
                state.next();
            }
            return {
                type: NodeType.Variable, 
                isPublic, isExternal, isMutable, 
                name, valueType, value, externalName,
                path: start.path, start: start.start, end
            };
        };
        const parseExternal = isPublic => {
            state.next();
            state.assertType(
                TokenType.KeywordFun,
                TokenType.KeywordVal, TokenType.KeywordMut
            );
            if(state.curr().type === TokenType.KeywordFun) {
                return parseFunction(isPublic, true);    
            } else {
                return parseVariable(isPublic, true);
            }
        };
        switch(state.curr().type) {
            case TokenType.KeywordPub: {
                state.next();
                state.assertType(
                    TokenType.KeywordExt,
                    TokenType.KeywordFun, 
                    TokenType.KeywordVal,
                    TokenType.KeywordMut,
                    TokenType.KeywordStruct,
                    TokenType.KeywordEnum
                );
                switch(state.curr().type) {
                    case TokenType.KeywordExt:
                        return parseExternal(true);
                    case TokenType.KeywordFun:
                        return parseFunction(true, false);
                    case TokenType.KeywordVal:
                    case TokenType.KeywordMut:
                        return parseVariable(true, false);
                    case TokenType.KeywordStruct:
                        return parseStructure(true);
                    case TokenType.KeywordEnum:
                        return parseEnumeration(true);
                }
            }
            case TokenType.KeywordExt: {
                return parseExternal(false);
            }
            case TokenType.KeywordFun: {
                return parseFunction(false, false);
            }
            case TokenType.KeywordStruct: {
                return parseStructure(false);
            }
            case TokenType.KeywordEnum: {
                return parseEnumeration(false);
            }
            case TokenType.KeywordVal:
            case TokenType.KeywordMut: {
                return parseVariable(false, false);
            }
            case TokenType.KeywordMod: {
                state.next();
                const end = { value: null };
                const path = parsePath(state, end);
                return {
                    type: NodeType.Module, name: path,
                    path: start.path, start: start.start, end: end.value
                };
            }
            case TokenType.KeywordUse: {
                const parseUsages = base => {
                    let path = [...base];
                    state.assertType(TokenType.Identifier);
                    while(state.curr().type === TokenType.Identifier) {
                        path.push(state.curr().content);
                        state.next();
                        if(state.curr().type === TokenType.PathSeparator) {
                            state.next();
                            continue;
                        }
                        let usages = {};
                        if(state.curr().type === TokenType.KeywordAs) {
                            state.next();
                            state.assertType(TokenType.Identifier);
                            usages[state.curr().content] = path.join("::");
                            state.next();
                        } else {
                            const end = path.at(-1);
                            usages[end] = path.join("::");
                        }
                        return usages;
                    }
                    state.assertType(TokenType.ParenOpen);
                    state.next();
                    let usages = {};
                    while(state.curr().type !== TokenType.ParenClose) {
                        const branch = parseUsages(path);
                        for(const usage in branch) {
                            usages[usage] = branch[usage];
                        }
                        state.assertType(TokenType.Comma, TokenType.ParenClose);
                        if(state.curr().type === TokenType.Comma) {
                            state.next();
                        }
                    }
                    state.next();
                    return usages;
                };
                state.next();
                const usages = parseUsages([]);
                return {
                    type: NodeType.Usage, usages,
                    path: start.path, start: start.start, end: start.end
                };
            }
            case TokenType.KeywordReturn: {
                assertTopLevel(false);
                state.next();
                const value = parseExpression(state);
                return {
                    type: NodeType.Return, value,
                    path: start.path, start: start.start, end: value.end
                };
            }
            case TokenType.KeywordMatch: {
                assertTopLevel(false);
                state.next();
                const matched = parseExpression(state);
                state.assertType(TokenType.BraceOpen);
                state.next();
                let branches = [];
                while(state.curr().type !== TokenType.BraceClose) {
                    let patterns = [ { node: parseExpression(state) } ];
                    state.assertType(TokenType.BraceOpen, TokenType.Pipe);
                    while(state.curr().type === TokenType.Pipe) {
                        state.next();
                        patterns.push({ node: parseExpression(state) });
                        state.assertType(TokenType.BraceOpen, TokenType.Pipe);
                    }
                    state.assertType(TokenType.BraceOpen);
                    state.next();
                    const body = parseStatementList(state);
                    state.assertType(TokenType.BraceClose);
                    state.next();
                    branches.push({ body, patterns });
                }
                state.assertType(TokenType.BraceClose);
                const end = state.curr().end;
                state.next();
                return {
                    type: NodeType.Match, matched, branches,
                    path: start.path, start: start.start, end
                };
            }
            case TokenType.KeywordIf: {
                assertTopLevel(false);
                state.next();
                const cond = parseExpression(state);
                state.assertType(TokenType.BraceOpen);
                state.next();
                const ifBody = parseStatementList(state);
                state.assertType(TokenType.BraceClose);
                let end = state.curr().end;
                state.next();
                let elseBody = [];
                if(state.curr().type == TokenType.KeywordElse) {
                    state.next();
                    state.assertType(
                        TokenType.BraceOpen, TokenType.KeywordIf
                    );
                    if(state.curr().type == TokenType.KeywordIf) {
                        const elseBranch = parseStatement(state);
                        elseBody.push(elseBranch);
                        end = elseBranch.end;
                    } else {
                        state.next();
                        elseBody = parseStatementList(state);
                        state.assertType(TokenType.BraceClose);
                        end = state.curr().end;
                        state.next();
                    }
                }
                return {
                    type: NodeType.If, cond, ifBody, elseBody,
                    path: start.path, start: start.start, end
                };
            }
        }
        assertTopLevel(false);
        const expr = parseExpression(state);
        if(state.curr().type == TokenType.Equal) {
            state.next();
            const value = parseExpression(state);
            return { 
                type: NodeType.Assignment, to: expr, value,
                path: expr.path, start: expr.start, end: value.end
            };
        }
        return expr;
    }

    const blockEndTokens = [
        TokenType.End,
        TokenType.BraceClose
    ];

    function parseStatementList(state, topLevel = false) {
        let statements = [];
        while(!blockEndTokens.includes(state.curr().type)) {
            statements.push(parseStatement(state, topLevel));
        }
        return statements;
    }

    // Type Checking

    function createCheckerState() {
        return {
            module: "",
            usages: {},
            functions: {},
            variables: {},
            structs: {},
            enums: {},
            scopes: [],

            enterScope: function(returnType = null) {
                this.scopes.push({
                    variables: {},
                    returnType,
                    alwaysReturns: false
                });
            },
            scope: function() {
                return this.scopes.at(-1);
            },
            exitScope: function() {
                const alwaysReturns = this.scope().alwaysReturns;
                this.scopes.pop();
                return alwaysReturns;
            },
            reset: function() {
                this.module = "";
                this.usages = {};
                this.scopes = [];
            },

            findLocalVariable: function(name) {
                for(let i = this.scopes.length - 1; i >= 0; i -= 1) {
                    const scope = this.scopes[i];
                    const variable = scope.variables[name];
                    if(variable === undefined) { continue; }
                    return variable;
                }
                return null;
            },
            findReturnType: function() {
                for(let i = this.scopes.length - 1; i >= 0; i -= 1) {
                    const scope = this.scopes[i];
                    const returnType = scope.returnType;
                    if(returnType !== null) { return returnType; }
                }
                return null;
            },
            isBase: function() {
                return this.scopes.length === 0;
            }
        };
    }

    const Type = makeEnum(
        "Unit",
        "Integer",
        "Float",
        "Boolean",
        "Struct",
        "Enum"
    );

    const builtinTypeNames = Object.freeze({
        "Unit": Type.Unit,
        "Int": Type.Integer,
        "Float": Type.Float,
        "Bool": Type.Boolean
    });

    function typeFromNode(node, state) {
        switch(node.type) {
            case NodeType.Path: {
                const path = expandUsages(node.value, state);
                const builtin = builtinTypeNames[path];
                if(builtin !== undefined) { 
                    return { type: builtin, node }; 
                }
                const struct = state.structs[path];
                if(struct !== undefined) {
                    return { 
                        type: Type.Struct, name: path, node 
                    };
                }
                const enumeration = state.enums[path];
                if(enumeration !== undefined) {
                    return {
                        type: Type.Enum, name: path, node
                    };
                }
                throw message.from(
                    message.error(`Unknown type '${node.value}'`),
                    message.code(node)
                );
            }
        }
        throw message.internalError(`Unhandled node type ${node.type}`);
    }

    function handleModules(node, state) {
        switch(node.type) {
            case NodeType.Module: {
                state.module = node.name;
                state.usages = {};
                break;
            }
            case NodeType.Usage: {
                for(const usage in node.usages) {
                    const replacement = node.usages[usage];
                    state.usages[usage] = replacement;
                }
                break;
            }
        }
    }

    function hasSymbol(path, state) {
        return state.functions[path] !== undefined
            || state.variables[path] !== undefined
            || state.structs[path] !== undefined
            || state.enums[path] !== undefined;
    }

    function collectSymbols(statements, state) {
        const assertUnique = (node, path) => {
            if(!hasSymbol(path, state)) { return; }
            throw message.from(
                message.error(`The symbol '${path}' exists more than once`),
                message.code(node),
                message.note("There may only be one symbol of the same name in the same module")
            );
        };
        // collect all types
        for(const node of statements) {
            handleModules(node, state);
            switch(node.type) {
                case NodeType.Structure: {
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    assertUnique(node, path);
                    state.structs[path] = null;
                    continue;
                }
                case NodeType.Enumeration: {
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    assertUnique(node, path);
                    state.enums[path] = null;
                    continue;
                }
            }
        }
        state.reset();
        // collect all symbols, fully collect types
        for(const node of statements) {
            handleModules(node, state);
            switch(node.type) {
                case NodeType.Function: {
                    const args = node.args.map(a => {
                        return { 
                            name: a.name, 
                            type: typeFromNode(a.type, state)
                        };
                    });
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    assertUnique(node, path);
                    state.functions[path] = {
                        node, args, 
                        returnType: typeFromNode(node.returnType, state)
                    };
                    continue;
                }
                case NodeType.Variable: {
                    const type = node.valueType === null? null
                        : typeFromNode(node.valueType, state);
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    assertUnique(node, path);
                    state.variables[path] = {
                        node, type, isMutable: node.isMutable
                    };
                    continue;
                }
                case NodeType.Structure: {
                    const members = node.members.map(m => {
                        return {
                            name: m.name,
                            type: typeFromNode(m.type, state)
                        };
                    });
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    state.structs[path] = {
                        node, members
                    };
                    continue;
                }
                case NodeType.Enumeration: {
                    const members = node.members.map(m => {
                        return {
                            name: m.name,
                            type: typeFromNode(m.type, state)
                        };
                    });
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    state.enums[path] = {
                        node, members
                    };
                    continue;
                }
            }
        }
    }

    function expandUsages(path, state) {
        const inModule = state.module.length === 0
            ? path : state.module + "::" + path;
        if(hasSymbol(inModule, state)) { return inModule; }
        const pathSegs = path.split("::");
        const start = pathSegs.at(0);
        const expansion = state.usages[start];
        if(expansion !== undefined) {
            let result = expansion; 
            if(pathSegs.length > 1) {
                result += "::" + pathSegs.slice(1).join("::");
            }
            return result;
        }
        return path;
    }

    function assertSymbolExposed(node, symbolPath, symbol, state) {
        if(symbol.node.isPublic) { return; }
        const symbolModule = symbolPath
            .split("::").slice(0, -1).join("::");
        if(symbolModule === state.module) { return; }
        throw message.from(
            message.error(`'${symbolPath}' is not public but accessed from a different module`),
            message.code(node),
            message.note(`'${symbolPath}' is defined here:`),
            message.code(symbol.node),
            message.note(`The access is in '${state.module}', which is only valid if '${symbolPath}' is declared as public`)
        );
    }

    function displayType(t) {
        switch(t.type) {
            case Type.Unit: return "Unit";
            case Type.Integer: return "Int";
            case Type.Float: return "Float";
            case Type.Boolean: return "Boolean";
            case Type.Struct: 
            case Type.Enum: return t.name;
        }
        return `<unhandled type: ${t.type}>`;
    }

    function assertTypesEqual(exp, got, source) {
        const typesEqual = exp.type === got.type;
        const namesEqual = exp.name === got.name;
        if(typesEqual && namesEqual) { return; }
        const expD = displayType(exp);
        const gotD = displayType(got);
        throw message.from(
            message.error(`Expected type '${expD}', but got '${gotD}'`),
            message.code(source),
            message.note(`'${expD}' originates from here:`),
            message.code(exp.node),
            message.note(`'${gotD}' originates from here:`),
            message.code(got.node)
        );
    }

    function assertNumberType(t, node) {
        if(t.type === Type.Integer || t.type === Type.Float) { return; }
        const gotD = displayType(t);
        throw message.from(
            message.error(`Expected number type, but got '${gotD}'`),
            message.code(node),
            message.note(`'${gotD}' originates from here:`),
            message.code(t.node)
        );
    }

    function assertMatchingArgC(expC, gotC, path, node, symbol) {
        if(expC === gotC) { return; }
        throw message.from(
            message.error(`'${path}'`
                + ` expects ${expC} argument(s),` 
                + ` but ${gotC} were provided`
            ),
            message.code(node),
            message.note("'" + path + "' is defined here:"),
            message.code(called.node)
        );
    };
    
    function assertMatchingArgTypes(expected, got, state) {
        for(const argI in expected) {
            const exp = expected[argI].type;
            const given = checkTypes(got[argI], state);
            assertTypesEqual(exp, given, expected[argI]);
        }
    };

    const PatternPath = makeEnum(
        "StructMember",
        "EnumMember"
    );

    const PatternCondition = makeEnum(
        "Value",
        "EnumVariant"
    );

    function checkMatchPattern(node, expected, state, pattern, path = []) {
        const check = () => {
            switch(node.type) {
                case NodeType.Path: {
                    const asLocal = state.findLocalVariable(node.value);
                    if(asLocal !== null) { break; }
                    if(node.value.includes("::")) { break; }
                    if(node.value !== "_") {
                        pattern.variables[node.value] = { 
                            path, type: expected 
                        };
                    }
                    return expected;
                }
                case NodeType.Call: {
                    if(node.called.type !== NodeType.Path) { break; }
                    const calledPath = expandUsages(node.called.value, state);
                    const asFunction = state.functions[calledPath];
                    if(asFunction !== undefined) { break; }
                    const asStruct = state.structs[calledPath];
                    if(asStruct !== undefined) {
                        assertTypesEqual(
                            expected, 
                            { type: Type.Struct, name: calledPath, node }, 
                            node
                        );
                        assertSymbolExposed(node, calledPath, asStruct, state);
                        assertMatchingArgC(
                            asStruct.members.length, node.args.length,
                            calledPath, node, asStruct
                        );
                        for(const argI in asStruct.members) {
                            const exp = asStruct.members[argI].type;
                            const memPath = [...path, { 
                                type: PatternPath.StructMember,
                                path: calledPath, 
                                name: asStruct.members[argI].name
                            }];
                            checkMatchPattern(
                                node.args[argI], exp, state, pattern, memPath
                            );
                        }
                        return expected;
                    }
                    const rawPathElems = node.called.value.split("::");
                    if(rawPathElems.length === 1) { break; }
                    const enumPath = expandUsages(
                        rawPathElems.slice(0, -1).join("::"), state
                    );
                    const variant = rawPathElems.at(-1);
                    const asEnum = state.enums[enumPath];
                    if(asEnum !== undefined) {
                        assertTypesEqual(
                            expected, 
                            { type: Type.Enum, name: enumPath, node }, 
                            node
                        );
                        assertSymbolExposed(node, enumPath, asEnum, state);
                        if(node.args.length !== 1) { break; }
                        for(const memberI in asEnum.members) {
                            const member = asEnum.members[memberI];
                            if(member.name !== variant) { continue; }
                            const memPath = [...path, { 
                                type: PatternPath.EnumMember,
                                path: calledPath, 
                                name: member.name
                            }];
                            pattern.conditions.push({
                                type: PatternCondition.EnumVariant,
                                path, variant: memberI
                            });
                            checkMatchPattern(
                                node.args[0], member.type, 
                                state, pattern, memPath
                            );
                            return expected;
                        }
                        break;
                    }
                    break;
                }
            }
            pattern.conditions.push({ 
                type: PatternCondition.Value, 
                path, value: node 
            });
            return checkTypes(node, state);
        };
        const got = check();
        assertTypesEqual(expected, got, node);
    }

    function checkTypes(node, state, assignment = false) {
        const assertReadOnly = () => {
            if(!assignment) { return; }
            throw message.from(
                message.error(`Assignment to immutable expression`),
                message.code(node)
            );
        };
        const check = () => {
            switch(node.type) {
                case NodeType.Path: {
                    const assertImmutable = variable => {
                        if(!assignment || variable.isMutable) { return; }
                        throw message.from(
                            message.error(`Assignment to immutable variable '${node.value}'`),
                            message.code(node),
                            message.note(`'${node.value}' is defined here:`),
                            message.code(variable.node)
                        );
                    };
                    const variable = state.findLocalVariable(node.value);
                    if(variable !== null) {
                        node.fullPath = node.value;
                        assertImmutable(variable);
                        return variable.type;
                    }
                    const path = expandUsages(node.value, state);
                    const global = state.variables[path];
                    if(global !== undefined) {
                        assertSymbolExposed(node, path, global, state);
                        node.fullPath = path;
                        assertImmutable(global);
                        return global.type;
                    }
                    assertReadOnly();
                    const pathElems = node.value.split("::");
                    if(pathElems.length > 1) {
                        const enumPath = expandUsages(
                            pathElems.slice(0, -1).join("::"), state
                        );
                        const variant = pathElems.at(-1);
                        const enumeration = state.enums[enumPath];
                        if(enumeration !== undefined) {
                            assertSymbolExposed(
                                node, enumPath, enumeration, state
                            );
                            node.fullPath = enumPath;
                            const value = { type: Type.Unit, node };
                            for(const memberI in enumeration.members) {
                                const member = enumeration.members[memberI];
                                if(member.name !== variant) { continue; }
                                assertTypesEqual(value, member.type, node);
                                node.type = NodeType.EnumerationInit;
                                node.variant = memberI;
                                node.args = [ valueNodeFrom(
                                    NodeType.UnitLiteral, "unit", node
                                ) ];
                                return {
                                    type: Type.Enum, name: enumPath, node 
                                };
                            }
                            throw message.from(
                                message.error(`Creation of unknown enum variant '${path}' attempted`),
                                message.code(node),
                                message.note(`'${enumPath}' originates from here:`),
                                message.code(called.node)
                            );
                        }
                    }
                    // TODO: NON-VARIABLE ACCESSES
                    //     FUNCTIONS -> TO EQUAL LAMBDA TYPE
                    //         fun test(a: Int) -> Int  =>  fun(Int) -> Int
                    //     STRUCTS / ENUMS -> TO CONSTRUCTOR LAMBDA TYPE
                    //         struct Cat(name: str)    =>  fun(str) -> Cat
                    throw message.from(
                        message.error(`Access of unknown variable '${node.value}'`),
                        message.code(node)
                    );
                }
                case NodeType.IntLiteral: {
                    assertReadOnly();
                    return { type: Type.Integer, node };
                }
                case NodeType.FloatLiteral: {
                    assertReadOnly();
                    return { type: Type.Float, node };
                }
                case NodeType.BoolLiteral: {
                    assertReadOnly();
                    return { type: Type.Boolean, node };
                }
                case NodeType.UnitLiteral: {
                    assertReadOnly();
                    return { type: Type.Unit, node };
                }
                case NodeType.Multiplicative:
                case NodeType.Additive:
                case NodeType.Comparative: {
                    assertReadOnly();
                    const lhs = checkTypes(node.lhs, state);
                    const rhs = checkTypes(node.rhs, state);
                    assertTypesEqual(lhs, rhs, node);
                    const op = node.op;
                    if(op != "==" && op != "!=") {
                        assertNumberType(lhs, node);
                    }
                    return node.type === NodeType.Comparative
                        ? { type: Type.Boolean, node } : lhs;
                }
                case NodeType.Negation: {
                    assertReadOnly();
                    const value = checkTypes(node.value, state);
                    if(node.op === "-") {
                        assertNumberType(value, node, node);
                    } else {
                        const bool = { type: Type.Boolean, node };
                        assertTypesEqual(value, bool, node);
                    }
                    return value;
                }
                case NodeType.MemberAccess: {
                    const accessed = checkTypes(node.accessed, state);
                    if(accessed.type !== Type.Struct) {
                        throw message.from(
                            messsage.error(
                                `Access of member ${node.name} of the non-struct `
                                    + `type '${displayType(accessed)}'`
                            ),
                            message.code(node),
                            message.note(`'${displayType(accessed)}' originates from here:`),
                            message.code(accessed.node)
                        );
                    }
                    const struct = state.structs[accessed.name];
                    assertSymbolExposed(node, accessed.name, struct, state);
                    for(const member of struct.members) {
                        if(member.name !== node.name) { continue; }
                        return member.type;
                    }
                    throw message.from(
                        messsage.error(
                            `Access of unknown member ${node.name} of `
                                + `struct '${displayType(accessed)}'`
                        ),
                        message.code(node),
                        message.note(`'${displayType(accessed)}' originates from here:`),
                        message.code(accessed.node)
                    );
                }
                case NodeType.Call: {
                    assertReadOnly();
                    if(node.called.type === NodeType.Path) {
                        const path = expandUsages(node.called.value, state);
                        let called = state.functions[path];
                        if(called !== undefined) {
                            assertSymbolExposed(node, path, called, state);
                            node.called.fullPath = path;
                            assertMatchingArgC(
                                called.args.length, node.args.length,
                                path, node, called
                            );
                            assertMatchingArgTypes(called.args, node.args, state);
                            return called.returnType;
                        }
                        called = state.structs[path];
                        if(called !== undefined) {
                            assertSymbolExposed(node, path, called, state);
                            node.fullPath = path;
                            assertMatchingArgC(
                                called.members.length, node.args.length,
                                path, node, called
                            );
                            assertMatchingArgTypes(called.members, node.args, state);
                            node.type = NodeType.StructureInit;
                            return {
                                type: Type.Struct, name: path, node 
                            };
                        }
                        const pathElems = node.called.value.split("::");
                        if(pathElems.length > 1) {
                            const enumPath = expandUsages(
                                pathElems.slice(0, -1).join("::"), state
                            );
                            const variant = pathElems.at(-1);
                            called = state.enums[enumPath];
                            if(called !== undefined) {
                                assertSymbolExposed(
                                    node, enumPath, called, state
                                );
                                node.fullPath = enumPath;
                                if(node.args.length !== 1) {
                                    throw message.from(
                                        message.error(
                                            `Enums variants take one value, but ${node.args.length} were provided`
                                        ),
                                        message.code(node)
                                    );
                                }
                                const value = checkTypes(node.args[0], state);
                                for(const memberI in called.members) {
                                    const member = called.members[memberI];
                                    if(member.name !== variant) { continue; }
                                    assertTypesEqual(value, member.type, node);
                                    node.type = NodeType.EnumerationInit;
                                    node.variant = memberI;
                                    return {
                                        type: Type.Enum, name: enumPath, node 
                                    };
                                }
                                throw message.from(
                                    message.error(`Creation of unknown enum variant '${path}' attempted`),
                                    message.code(node),
                                    message.note(`'${enumPath}' originates from here:`),
                                    message.code(called.node)
                                );
                            }
                        }
                    }
                    // TODO: CALL LAMBDA
                    throw message.internalError(
                        "not yet implemented - lambdas"
                    );   
                }
                case NodeType.IfExpr: {
                    assertReadOnly();
                    const cond = checkTypes(node.cond, state);
                    assertTypesEqual(cond, { type: Type.Boolean, node }, node);
                    const ifType = checkTypes(node.ifValue, state);
                    const elseType = checkTypes(node.elseValue, state);
                    assertTypesEqual(ifType, elseType, node);
                    return ifType;
                }

                case NodeType.Variable: {
                    const got = node.value === null? null
                        : checkTypes(node.value, state);
                    const exp = node.valueType === null? null
                        : typeFromNode(node.valueType, state);
                    if(got !== null && exp !== null) {
                        assertTypesEqual(exp, got, node);
                    }
                    const type = got !== null? got : exp;
                    if(state.isBase()) {
                        const path = state.module.length === 0
                            ? node.name : state.module + "::" + node.name;
                        node.fullPath = path;
                        state.variables[path].type = type;
                    } else {
                        const scope = state.scope();
                        scope.variables[node.name] = {
                            type, isMutable: node.isMutable, node
                        };
                    }
                    return null;
                }
                case NodeType.Assignment: {
                    const scope = state.scope();
                    const lhs = checkTypes(node.to, state, true);
                    const rhs = checkTypes(node.value, state);
                    assertTypesEqual(lhs, rhs, node);
                    return null;
                }
                case NodeType.Return: {
                    const returnType = state.findReturnType();
                    if(returnType === null) { 
                        throw message.internalError(
                            "'return' used outside function (should not parse)"
                        ); 
                    }
                    const value = checkTypes(node.value, state);
                    assertTypesEqual(returnType, value, node);
                    state.scope().alwaysReturns = true;
                    return null;
                }
                case NodeType.If: {
                    const cond = checkTypes(node.cond, state);
                    assertTypesEqual(cond, { type: Type.Boolean, node }, node);
                    const ifReturns = checkBlock(node.ifBody, state);
                    const elseReturns = checkBlock(node.elseBody, state);
                    state.scope().alwaysReturns |= (ifReturns && elseReturns);
                    return null;
                }
                case NodeType.Match: {
                    const matched = checkTypes(node.matched, state);
                    let anyExhaustive = false;
                    let allReturn = true;
                    for(const branch of node.branches) {
                        for(const pattern of branch.patterns) {
                            pattern.conditions = [];
                            pattern.variables = {};
                            checkMatchPattern(
                                pattern.node, matched, state, pattern
                            );
                            anyExhaustive |= pattern.conditions.length === 0;
                            if(pattern === branch.patterns[0]) { continue; }
                            for(const name in branch.patterns[0].variables) {
                                if(pattern.variables[name] !== undefined) { continue; }
                                throw message.from(
                                    message.error("'match'-pattern has partially defined variables"),
                                    message.note(`'${name}' is defined in this pattern:`),
                                    message.code(branch.patterns[0].node),
                                    message.note(`...but not in this pattern:`),
                                    message.code(pattern.node)
                                );
                            }
                            for(const name in pattern.variables) {
                                if(branch.patterns[0].variables[name] !== undefined) { continue; }
                                throw message.from(
                                    message.error("'match'-pattern has partially defined variables"),
                                    message.note(`'${name}' is defined in this pattern:`),
                                    message.code(pattern.node),
                                    message.note(`...but not in this pattern:`),
                                    message.code(branch.patterns[0].node)
                                );
                            }
                        }
                        state.enterScope();
                        for(const pattern of branch.patterns) {
                            for(const name in pattern.variables) {
                                const vars = state.scope().variables;
                                const expected = pattern.variables[name].type;
                                if(vars[name] !== undefined) {
                                    assertTypesEqual(vars[name].type, expected, node);
                                }
                                vars[name] = {
                                    type: expected, isMutable: false, node
                                };
                            }
                        }
                        for(const statement of branch.body) {
                            checkTypes(statement, state);
                        }
                        allReturn &= state.exitScope();
                    }
                    if(!anyExhaustive) {
                        throw message.from(
                            message.error("'match' is not exhaustive"),
                            message.code(node),
                            message.note("'match'-statements need to provide a branch for all possible values")
                        );
                    }
                    state.scope().alwaysReturns |= allReturn;
                    return null;
                }

                case NodeType.Function: {
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    node.fullPath = path;
                    const returnType = typeFromNode(node.returnType, state);
                    state.enterScope(returnType);
                    const scope = state.scope();
                    for(const arg of node.args) {
                        const argType = typeFromNode(arg.type, state);
                        scope.variables[arg.name] = {
                            type: argType, isMutable: false, node
                        };
                    }
                    if(!node.isExternal) {
                        for(const statement of node.body) {
                            checkTypes(statement, state);
                        }
                    }
                    const alwaysReturns = state.exitScope();
                    const missingReturn = !node.isExternal 
                        && !alwaysReturns && returnType.type !== Type.Unit
                    if(missingReturn) {
                        throw message.from(
                            message.error(`Function '${node.name}' does not always return a value`),
                            message.note(`The function specifies '${displayType(returnType)}' as the return type here:`),
                            message.code(node.returnType),
                            message.note(`However, the end of the function can be reached:`),
                            message.code(
                                node.body.length === 0? node : node.body.at(-1)
                            ),
                            message.note(`This is only allowed if the function returns 'Unit'`)
                        );
                    }
                    return null;
                }
                case NodeType.Structure:
                case NodeType.StructureInit:
                case NodeType.Enumeration:
                case NodeType.Module:
                case NodeType.Usage:
                    return null;
            }
            throw message.internalError(`Unhandled node type ${node.type}`);
        };
        let valueType = check();
        if(valueType === null) { 
            valueType = { type: Type.Unit, node };
        }
        node.valueType = valueType;
        return valueType;
    }

    function checkBlock(nodes, state, returnType = null) {
        state.enterScope(returnType);
        for(const node of nodes) {
            checkTypes(node, state);
        }
        return state.exitScope();
    }

    function checkVariables(statements, state) {
        for(const node of statements) {
            handleModules(node, state);
            if(node.type !== NodeType.Variable) { continue; }
            checkTypes(node, state);
        }
    }

    function checkSymbols(statements, state) {
        for(const node of statements) {
            handleModules(node, state);
            if(node.type === NodeType.Variable) { continue; }
            checkTypes(node, state);
        }
    }



    // Codegen 

    const runtime = `

// Generated by the Quill compiler from Quill source code.
// Check https://github.com/schwalbe-t/quill for more details.
    
function quill$$eq(a, b) {
    if(typeof a !== typeof b) { return false; }
    if(typeof a !== "object") { return a === b; }
    for(const a_prop in a) {
        if(!Object.hasOwn(b, a_prop)) { return false; }
    }
    for(const b_prop in b) {
        if(!Object.hasOwn(a, b_prop)) { return false; }
    }
    for(const prop in a) {
        if(!quill$$eq(a[prop], b[prop])) { return false; }
    }
    return true;
}
    
    `;

    function createGeneratorState(checker) {
        return {
            checker,
            nextVarNumber: 0,
            scopes: [],

            enterScope: function() {
                this.scopes.push({
                    aliases: {},
                    variables: [],
                    output: "",
                    vars: ""
                });
            },
            scope: function() {
                return this.scopes.at(-1);
            },
            exitScope: function() {
                const scope = this.scope();
                this.scopes.pop();
                return scope.vars;
            },
            
            alloc: function() {
                const i = this.nextVarNumber;
                this.nextVarNumber += 1;
                const scope = this.scope();
                const variable = `local${i}`;
                scope.vars += `let ${variable};\n`;
                scope.variables.push(variable);
                return variable;
            },
            isBase: function() {
                return this.scopes.length === 1;
            }
        };
    }

    function manglePath(path) {
        return path.split("::").join("$");
    }

    function generateCode(node, state, into = null) {
        const intoOrAlloc = () => into === null? state.alloc() : into;
        switch(node.type) {
            case NodeType.Path: {
                for(let i = state.scopes.length - 1; i >= 0; i -= 1) {
                    const scope = state.scopes[i];
                    if(!Object.hasOwn(scope.aliases, node.value)) { continue; }
                    const value = scope.aliases[node.value];
                    if(into === null) { return value; }
                    state.scope().output += `${into} = ${value};\n`;
                    return into;
                }
                const read = state.checker.variables[node.fullPath];
                return read !== undefined && read.node.isExternal
                    ? read.node.externalName : manglePath(node.fullPath);
            }
            case NodeType.IntLiteral:
                const out = intoOrAlloc();
                state.scope().output += `${out} = ${node.value}n;\n`;
                return out;
            case NodeType.FloatLiteral:
            case NodeType.BoolLiteral: {
                const out = intoOrAlloc();
                state.scope().output += `${out} = ${node.value};\n`;
                return out;
            }
            case NodeType.UnitLiteral: {
                return intoOrAlloc();
            }
            case NodeType.Multiplicative:
            case NodeType.Additive: {
                const lhs = generateCode(node.lhs, state);
                const rhs = generateCode(node.rhs, state);
                const out = intoOrAlloc();
                if(node.valueType === Type.Integer) {
                    state.scope().output += `${out} = BigInt.asIntN(64,`
                        + ` ${lhs} ${node.op} ${rhs}`
                        + `);\n`;
                } else {
                    state.scope().output += `${out} = ${lhs} ${node.op} ${rhs};\n`;
                }
                return out;
            }
            case NodeType.Comparative: {
                const lhs = generateCode(node.lhs, state);
                const rhs = generateCode(node.rhs, state);
                const out = intoOrAlloc();
                state.scope().output += `${out} = `;
                switch(node.op) {
                    case "!=":
                        state.scope().output += "!";
                        // FALL THROUGH
                    case "==": 
                        state.scope().output += `quill$$eq(${lhs}, ${rhs})`;
                        break;
                    default:
                        state.scope().output += `${lhs} ${node.op} ${rhs}`;
                }
                state.scope().output += `;\n`;
                return out;
            }
            case NodeType.Negation: {
                const value = generateCode(node.value, state);
                const out = intoOrAlloc();
                state.scope().output += `${out} = ${node.op} ${value};\n`;
                return out;
            }
            case NodeType.MemberAccess: {
                const accessed = generateCode(node.accessed, state);
                return `${accessed}.${node.name}`;
            }
            case NodeType.Call: {
                let called = null;
                if(node.called.type === NodeType.Path) {
                    const func = state.checker.functions[node.called.fullPath];
                    if(func !== undefined && func.node.isExternal) {
                        called = func.node.externalName;
                    }
                }
                if(called === null) {
                    called = generateCode(node.called, state);
                }
                const args = node.args
                    .map(n => generateCode(n, state))
                    .join(", ");
                const out = intoOrAlloc();
                state.scope().output += `${out} = ${called}(${args});\n`;
                return out;
            }
            case NodeType.StructureInit: {
                const struct = state.checker.structs[node.fullPath];
                const args = node.args.map(n => generateCode(n, state));
                const out = intoOrAlloc();
                state.scope().output += `${out} = {`;
                for(const memberI in args) {
                    const name = struct.members[memberI].name;
                    if(memberI > 0) { state.scope().output += ","; }
                    state.scope().output += ` ${name}: ${args[memberI]}`;
                }
                state.scope().output += ` };\n`;
                return out;
            }
            case NodeType.EnumerationInit: {
                const enumeration = state.checker.enums[node.fullPath];
                const value = generateCode(node.args[0], state);
                const out = intoOrAlloc();
                state.scope().output += `${out} = { tag: ${node.variant}, value: ${value} };\n`;
                return out;
            }
            case NodeType.IfExpr: {
                const cond = generateCode(node.cond, state);
                const out = state.alloc();
                state.enterScope();
                generateCode(node.ifValue, state, out);
                const ifBody = state.scope().output;
                const ifVars = state.exitScope();
                state.enterScope();
                generateCode(node.elseValue, state, out);
                const elseBody = state.scope().output;
                const elseVars = state.exitScope();
                state.scope().output += `if(${cond}) {\n`
                    + `${ifVars}${ifBody}`
                    + `} else {\n`
                    + `${elseVars}${elseBody}`
                    + `}\n`;
                return out;
            }
            case NodeType.Variable: {
                if(node.isExternal) { return null; }
                if(state.isBase()) {
                    const value = generateCode(node.value, state);
                    state.scope().output += `let ${manglePath(node.fullPath)} = ${value};\n`;
                } else {
                    const value = generateCode(node.value, state);
                    state.scope().aliases[node.name] = value;
                }
                return null;
            }
            case NodeType.Assignment: {
                const to = generateCode(node.to, state);
                const value = generateCode(node.value, state, to);
                if(value !== to) {
                    state.scope().output += `${to} = ${value};\n`;
                }
                return null;
            }
            case NodeType.Function: {
                if(node.isExternal) { return null; }
                state.enterScope();
                const args = node.args.map((n, i) => `param${i}`).join(", ");
                node.args.forEach((n, i) => {
                    state.scope().aliases[n.name] = `param${i}`;
                });
                node.body.forEach(n => generateCode(n, state));
                const body = state.scope().output;
                const vars = state.exitScope();
                state.scope().output 
                    += `function ${manglePath(node.fullPath)}(${args}) {\n`
                    + `${vars}${body}`
                    + `}\n`;
                return null;
            }
            case NodeType.Return: {
                const value = generateCode(node.value, state);
                state.scope().output += `return ${value};\n`;
                return null;
            }
            case NodeType.If: {
                const cond = generateCode(node.cond, state);
                const ifBody = generateBlock(node.ifBody, state);
                const elseBody = generateBlock(node.elseBody, state);
                state.scope().output += `if(${cond}) {\n`
                    + ifBody
                    + `} else {\n`
                    + elseBody
                    + `}\n`;
                return null;
            }
            case NodeType.Match: {
                const matched = generateCode(node.matched, state);
                let out = "{\n";
                for(const branchI in node.branches) {
                    const branch = node.branches[branchI];
                    const vars = Object.keys(branch.patterns[0].variables);
                    state.enterScope();
                    out += `const body${branchI} = (`;
                    for(const varI in vars) {
                        if(varI > 0) { out += ", "; }
                        out += `matched${varI}`;
                        state.scope().aliases[vars[varI]] = `matched${varI}`;
                    }
                    out += `) => {\n`;
                    branch.body.forEach(n => generateCode(n, state));
                    const body = state.scope().output;
                    out += state.exitScope();
                    out += `${body}return null;\n}\n`;
                }
                out += `let returned = null;\n`;
                for(const branchI in node.branches) {
                    const branch = node.branches[branchI];
                    for(const pattern of branch.patterns) {
                        if(branchI > 0) { out += `else `; }
                        const generatePath = path => {
                            for(const element of path) {
                                switch(element.type) {
                                    case PatternPath.StructMember: {
                                        out += `.${element.name}`;
                                        break;
                                    }
                                    case PatternPath.EnumMember: {
                                        out += `.value`;
                                        break;
                                    }
                                }
                            }
                        };
                        if(pattern.conditions.length >= 1) {
                            out += `if(`;
                            for(const condI in pattern.conditions) {
                                if(condI > 0) { out += " && "; }
                                const condition = pattern.conditions[condI];
                                switch(condition.type) {
                                    case PatternCondition.Value: {
                                        const value = generateCode(
                                            condition.value, state
                                        );
                                        out += `quill$$eq(${matched}`;
                                        generatePath(condition.path);
                                        out += `, ${value})`;
                                        break;
                                    }
                                    case PatternCondition.EnumVariant: {
                                        out += matched;
                                        generatePath(condition.path);
                                        out += `.tag === ${condition.variant}`
                                        break;
                                    }
                                }
                            }
                            out += `) `;
                        }
                        out += `{ returned = body${branchI}(`;
                        const vars = Object.keys(pattern.variables);
                        for(const varI in vars) {
                            if(varI > 0) { out += ", "; }
                            out += matched;
                            generatePath(pattern.variables[vars[varI]].path);
                        }
                        out += `); }\n`;
                    }
                }
                state.scope().output += out + `if(returned !== null) { return returned; }\n}\n`;
                return null;
            }
            case NodeType.Module:
            case NodeType.Usage:
            case NodeType.Structure:
            case NodeType.Enumeration:
                return null;
        }
        throw message.internalError(`Unhandled node type ${node.type}`);
    }

    function generateBlock(nodes, state) {
        state.enterScope();
        nodes.forEach(n => generateCode(n, state));
        const body = state.scope().output;
        const vars = state.exitScope();
        return vars + body;
    }

    function generateVariables(statements, state) {
        state.enterScope();
        for(const node of statements) {
            if(node.type !== NodeType.Variable) { continue; }
            generateCode(node, state);
        }
        const body = state.scope().output;
        const vars = state.exitScope();
        return vars + body;
    }

    function generateSymbols(statements, state) {
        state.enterScope();
        for(const node of statements) {
            if(node.type === NodeType.Variable) { continue; }
            generateCode(node, state);
        }
        const body = state.scope().output;
        const vars = state.exitScope();
        return vars + body;   
    }
    


    // Driver

    function compile(sources) {
        const makeError = errors => {
            return { success: false, errors, code: null };
        };
        const makeSuccess = code => {
            return { success: true, errors: null, code };
        };
        let errors = [];
        let code = runtime;
        const checker = createCheckerState();
        let nodes = {};
        // tokenizing, parsing and symbol collection
        for(const path in sources) {
            const text = sources[path];
            if(text.length == 0) { continue; }
            const tokens = tokenize(text, path, errors);
            const parser = createParserState(tokens);
            try {
                const statements = parseStatementList(parser, true);
                nodes[path] = statements;
                collectSymbols(statements, checker);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        if(errors.length > 0) { return makeError(errors); }
        // type checking of variables
        // -> variable decl might not specify a type,
        //    therefore we have to check all of them first
        //    to figure those out :/
        for(const path in nodes) {
            const statements = nodes[path];
            checker.reset();
            try {
                checkVariables(statements, checker);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        if(errors.length > 0) { return makeError(errors); }
        // type checking of everything else
        for(const path in nodes) {
            const statements = nodes[path];
            checker.reset();
            try {
                checkSymbols(statements, checker);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        if(errors.length > 0) { return makeError(errors); }
        // code generation
        for(const path in nodes) {
            const statements = nodes[path];
            const generator = createGeneratorState(checker);
            try {
                code += generateVariables(statements, generator);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        for(const path in nodes) {
            const statements = nodes[path];
            const generator = createGeneratorState(checker);
            try {
                code += generateSymbols(statements, generator);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        if(errors.length > 0) { return makeError(errors); }
        return makeSuccess(code);
    }

    return {
        message,
    
        TokenType, 
        isAlphabetic, isNumeric, isAlphanumeric, 
        tokenize,

        NodeType,
        createParserState,
        parseValue, parseExpression, parseType, 
        parseArgumentList, parseStatement, parseStatementList,

        Type,
        createCheckerState,
        collectSymbols,
        checkTypes, checkBlock,

        runtime,
        createGeneratorState,    
        generateCode,
        generateBlock,

        compile
    };
})();

if(typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = quill;
} else {
    (typeof self !== 'undefined' ? self : this).quill = quill;
}