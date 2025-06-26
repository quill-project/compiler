
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

        function isError(message) {
            return message.sections.some(s => s.type === Section.Error);
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

        const RESET_STYLE = "\x1B[0m";

        const Foreground = Object.freeze({
            Black: "\x1B[30m",
            Red: "\x1B[31m",
            Green: "\x1B[32m",
            Yellow: "\x1B[33m",
            Blue: "\x1B[34m",
            Magenta: "\x1B[35m",
            Cyan: "\x1B[36m",
            White: "\x1B[37m",
            BrightBlack: "\x1B[90m",
            BrightRed: "\x1B[91m",
            BrightGreen: "\x1B[92m",
            BrightYellow: "\x1B[93m",
            BrightBlue: "\x1B[94m",
            BrightMagenta: "\x1B[95m",
            BrightCyan: "\x1B[96m",
            BrightWhite: "\x1B[97m",
        });

        const Background = Object.freeze({
            Black: "\x1B[40m",
            Red: "\x1B[41m",
            Green: "\x1B[42m",
            Yellow: "\x1B[43m",
            Blue: "\x1B[44m",
            Magenta: "\x1B[45m",
            Cyan: "\x1B[46m",
            White: "\x1B[47m",
            BrightBlack: "\x1B[100m",
            BrightRed: "\x1B[101m",
            BrightGreen: "\x1B[102m",
            BrightYellow: "\x1B[103m",
            BrightBlue: "\x1B[104m",
            BrightMagenta: "\x1B[105m",
            BrightCyan: "\x1B[106m",
            BrightWhite: "\x1B[107m",
        });

        function display(message, sources, useColor = true) {
            let output = "";
            for(const section of message.sections) {
                if(output.length > 0) {
                    output += "\n";
                }
                switch(section.type) {
                    case Section.Error: {
                        if(useColor) {
                            output += Background.BrightRed + Foreground.Black
                                + " error " + RESET_STYLE 
                                + " " + Foreground.BrightRed
                                + section.text + RESET_STYLE;
                        } else {
                            output += `[error] ${section.text}`;
                        }
                        break;
                    }
                    case Section.Warning: {
                        if(useColor) {
                            output += Background.BrightYellow + Foreground.Black
                                + " warning " + RESET_STYLE 
                                + " " + Foreground.BrightYellow
                                + section.text + RESET_STYLE;
                        } else {
                            output += `<warning> ${section.text}`;
                        }
                        break;
                    }
                    case Section.Note: {
                        if(useColor) {
                            output += section.text;
                        } else {
                            output += `note: ${section.text}`;
                        }
                        break;
                    }
                    case Section.Code: {
                        if(useColor) { output += Foreground.BrightBlack; }
                        const o = section.origin;
                        const file = sources[o.path];
                        output += `in '${o.path}'`;
                        if(file !== undefined) {
                            const lines = file.split("\n");
                            const startLine = lineOf(file, o.start);
                            const startCol = columnOf(file, o.start);
                            const endLine = lineOf(file, o.end - 1);
                            const endCol = columnOf(file, o.end - 1);
                            const lineCW = String(endLine).length;
                            for(let l = startLine; l <= endLine; l += 1) {
                                if((l - 1) >= lines.length) { break; }
                                const line = lines[l - 1];
                                const lineC = String(l)
                                    .padStart(lineCW, " ");
                                let dLine = "";
                                let mLine = "";
                                let wasMarked = false;
                                for(let c = 1; c <= line.length; c += 1) {
                                    let m = l >= startLine && l <= endLine;
                                    if(l === startLine) { m &= c >= startCol; }
                                    if(l === endLine) { m &= c <= endCol; }
                                    if(m && !wasMarked) {
                                        dLine += Foreground.White;
                                    }
                                    if(!m && wasMarked) {
                                        dLine += Foreground.BrightBlack;
                                    }
                                    dLine += line[c - 1];
                                    mLine += m? "^" : " ";
                                    wasMarked = m;
                                }
                                output += `\n ${lineC}   ${dLine}`;
                                output += `\n ${" ".repeat(lineCW)}   ${mLine}`;
                            }
                        }
                        if(useColor) { output += RESET_STYLE; }
                        break;
                    }
                }
            }
            return output;
        }

        return {
            Section,
            error, warning, note, code,
            from, isError, internalError,
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
        "StringLiteral",

        "TripleDots",

        "LessThanEqual",
        "GreaterThanEqual",
        "DoubleEqual",
        "NotEqual",
        "ArrowRight",
        "DoubleAmpersand",
        "DoublePipe",
        "PathSeparator",
        "Triangle",

        "ParenOpen",
        "ParenClose",
        "BraceOpen",
        "BraceClose",
        "BracketOpen",
        "BracketClose",

        "LessThan",
        "GreaterThan",
        "Equal",
        "Plus",
        "Minus",
        "Asterisk",
        "Slash",
        "Percent",
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

    const operatorTokens = Object.freeze([
        { content: "...", type: TokenType.TripleDots },

        { content: "<=", type: TokenType.LessThanEqual },
        { content: ">=", type: TokenType.GreaterThanEqual },
        { content: "==", type: TokenType.DoubleEqual },
        { content: "!=", type: TokenType.NotEqual },
        { content: "->", type: TokenType.ArrowRight },
        { content: "&&", type: TokenType.DoubleAmpersand },
        { content: "||", type: TokenType.DoublePipe },
        { content: "::", type: TokenType.PathSeparator },
        { content: "|>", type: TokenType.Triangle },

        { content: "(", type: TokenType.ParenOpen },
        { content: ")", type: TokenType.ParenClose },
        { content: "{", type: TokenType.BraceOpen },
        { content: "}", type: TokenType.BraceClose },
        { content: "[", type: TokenType.BracketOpen },
        { content: "]", type: TokenType.BracketClose },

        { content: "<", type: TokenType.LessThan },
        { content: ">", type: TokenType.GreaterThan },
        { content: "=", type: TokenType.Equal },
        { content: "+", type: TokenType.Plus },
        { content: "-", type: TokenType.Minus },
        { content: "*", type: TokenType.Asterisk },
        { content: "/", type: TokenType.Slash },
        { content: "%", type: TokenType.Percent },
        { content: ":", type: TokenType.Colon },
        { content: ",", type: TokenType.Comma },
        { content: "!", type: TokenType.ExclamationMark },
        { content: ".", type: TokenType.Dot },
        { content: "|", type: TokenType.Pipe }
    ]);

    const keywordTokens = Object.freeze({
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
            case TokenType.StringLiteral: return "a string";

            case TokenType.TripleDots: return "'...'";

            case TokenType.LessThanEqual: return "'<='";
            case TokenType.GreaterThanEqual: return "'>='";
            case TokenType.DoubleEqual: return "'=='";
            case TokenType.NotEqual: return "'!='";
            case TokenType.ArrowRight: return "'->'";
            case TokenType.DoubleAmpersand: return "'&&'";
            case TokenType.DoublePipe: return "'||'";
            case TokenType.PathSeparator: return "'::'";
            case TokenType.Triangle: return "'|>'";

            case TokenType.ParenOpen: return "'('";
            case TokenType.ParenClose: return "')'";
            case TokenType.BraceOpen: return "'{'";
            case TokenType.BraceClose: return "'}'";
            case TokenType.BracketOpen: return "[";
            case TokenType.BracketClose: return "]";

            case TokenType.LessThan: return "'<'";
            case TokenType.GreaterThan: return "'>'";
            case TokenType.Equal: return "'='";
            case TokenType.Plus: return "'+'";
            case TokenType.Minus: return "'-'";
            case TokenType.Asterisk: return "'*'";
            case TokenType.Slash: return "'/'";
            case TokenType.Percent: return "'%'";
            case TokenType.Colon: return "':'";
            case TokenType.Comma: return "','";
            case TokenType.ExclamationMark: return "'!'";
            case TokenType.Dot: return "'.'";
            case TokenType.Pipe: return "'|'";

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

    const hexadecimalChars = "0123456789ABCDEFabcdef";

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
            for(const mapping of operatorTokens) {
                const matches = i + mapping.content.length <= text.length
                    && text.substring(i, i + mapping.content.length)
                        === mapping.content;
                if(!matches) { continue; }
                output.push(tokenFrom(
                    mapping.type, mapping.content, 
                    path, i, i + mapping.content.length
                ));
                i += mapping.content.length;
                madeFixed = true;
                break;
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
                const content = text.substring(start, i);
                let keywordType = keywordTokens[content];
                output.push(tokenFrom(
                    keywordType === undefined? TokenType.Identifier : keywordType, 
                    content, path, start, i
                ));
                continue;
            }
            if(text[i] === '"') {
                const start = i;
                i += 1;
                let content = "";
                let isEscaped = false;
                for(; text[i] !== '"' || isEscaped; i += 1) {
                    if(i >= text.length) {
                        errors.push(message.from(
                            message.warning(`Unclosed string literal`),
                            message.code({ path, start, end: text.length })
                        ));
                        break;
                    }
                    const c = text[i];
                    if(!isEscaped) {
                        isEscaped = c === '\\';
                        if(!isEscaped) { content += c; }
                        continue;
                    }
                    switch(c) {
                        case '"': content += '"'; break;
                        case '\n': break;
                        case 'n': content += '\n'; break;
                        case 'r': content += '\r'; break;
                        case 'x': {
                            const s = i + 1;
                            const e = i + 3;
                            const isValid = e <= text.length
                                && hexadecimalChars.includes(text[s])
                                && hexadecimalChars.includes(text[s + 1]);
                            if(!isValid) {
                                errors.push(message.from(
                                    message.error(`Invalid hexadecimal escape sequence`),
                                    message.code({ path, start: i, end: Math.min(text.length, e) })
                                ));
                            }
                            content += String.fromCharCode(parseInt(text.substring(s, e), 16))
                            i += 2;
                        } break;
                        default: content += c; break;
                    }
                    isEscaped = false;
                }
                i += 1;
                output.push(tokenFrom(
                    TokenType.StringLiteral, content,
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
                    ? "the end of the file" : tokenDescription(this.curr().type);
                let msg = message.from(
                    message.error(`Did not expect ${token} here`),
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
        "(": 1, ".": 1,
        "*": 3, "/": 3, "%": 3,
        "+": 4, "-": 4, 
        "<": 5, ">": 5, "<=": 5, ">=": 5,
        "==": 6, "!=": 6,
        "&&": 8, 
        "||": 9,
        "|>": 10
    });

    const unaryOpPrec = Object.freeze({
        "-": 2, "!": 2
    });

    const NodeType = makeEnum(
        "FunctionType",
    
        "Path",
        "IntLiteral",
        "FloatLiteral",
        "BoolLiteral",
        "UnitLiteral",
        "StringLiteral",
        "FunctionLiteral",
    
        "Multiplicative",
        "Additive",
        "Comparative",
        "Negation",
        "MemberAccess",
        "Call",
        "PipedCall",
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
        "%": NodeType.Multiplicative,
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

    function parseGivenTypeArgs(state) {
        if(state.curr().type !== TokenType.BracketOpen) { return undefined; }
        state.next();
        let typeArgs = [];
        while(state.curr().type !== TokenType.BracketClose) {
            typeArgs.push(parseType(state));
            state.assertType(TokenType.Comma, TokenType.BracketClose);
            if(state.curr().type === TokenType.Comma) {
                state.next();
            }
        }
        state.next();
        return typeArgs;
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
                const typeArgs = parseGivenTypeArgs(state);
                return {
                    type: NodeType.Path, value: path,
                    path: start.path, start: start.start, end: start.end,
                    typeArgs
                };
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
            case TokenType.StringLiteral: {
                state.next();
                return valueNodeFrom(NodeType.StringLiteral, value, start);
            }
            case TokenType.Pipe:
            case TokenType.DoublePipe: {
                let args = [];
                if(state.curr().type === TokenType.Pipe) {
                    state.next();
                    while(state.curr().type !== TokenType.Pipe) {
                        state.assertType(TokenType.Identifier);
                        args.push({ name: state.curr().content, type: null });
                        state.next();
                        state.assertType(TokenType.Comma, TokenType.Pipe);
                        if(state.curr().type === TokenType.Comma) {
                            state.next();
                        }
                    }
                    state.assertType(TokenType.Pipe);
                    state.next();
                } else {
                    state.next();
                }
                let body = null;
                let end = null;
                if(state.curr().type === TokenType.BraceOpen) {
                    state.next();
                    body = parseStatementList(state);
                    state.assertType(TokenType.BraceClose);
                    end = state.curr().end;
                    state.next();
                } else {
                    const value = parseExpression(state);
                    body = [{
                        type: NodeType.Return, value,
                        path: value.path, start: value.start,
                        end: value.end
                    }];
                    end = value.end;
                }
                return {
                    type: NodeType.FunctionLiteral, args, body,
                    path: start.path, start: start.start, end
                };
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
                case TokenType.Triangle: {
                    state.next();
                    const call = parseExpression(state, binaryOpPrec["|>"]);
                    if(call.type !== NodeType.Call) {
                        throw message.from(
                            message.error("Attempt to pipe into non-call expression"),
                            message.code({
                                path: collected.path, 
                                start: collected.start, end: call.end
                            })
                        );
                    }
                    call.type = NodeType.PipedCall;
                    call.args.splice(0, 0, collected);
                    collected = call;
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
        if(state.curr().content === "Fun") {
            const start = state.curr();
            state.next();
            state.assertType(TokenType.ParenOpen);
            state.next();
            let argTypes = [];
            while(state.curr().type !== TokenType.ParenClose) {
                argTypes.push(parseType(state));
                state.assertType(TokenType.Comma, TokenType.ParenClose);
                if(state.curr().type === TokenType.Comma) {
                    state.next();
                }
            }
            state.assertType(TokenType.ParenClose);
            let returnType = { 
                type: NodeType.Path, value: "Unit", 
                path: start.path, start: start.start, end: state.curr().end
            };
            state.next();
            if(state.curr().type === TokenType.ArrowRight) {
                state.next();
                returnType = parseType(state);
            }
            return {
                type: NodeType.FunctionType, argTypes, returnType,
                path: start.path, start: start.start, end: returnType.end
            };
        }
        const start = state.curr();
        let mutable = state.curr().type === TokenType.KeywordMut;
        if(mutable) {
            state.next();
        }
        switch(state.curr().type) {
            case TokenType.Identifier: {
                const path = parsePath(state);
                const typeArgs = parseGivenTypeArgs(state);
                return {
                    type: NodeType.Path, value: path, mutable,
                    path: start.path, start: start.start, end: start.end,
                    typeArgs
                };
            }
        }
        state.reportUnexpected("a type");
    }

    function parseTypeArgList(state) {
        if(state.curr().type !== TokenType.BracketOpen) { return []; }
        state.next();
        let args = [];
        while(state.curr().type !== TokenType.BracketClose) {
            state.assertType(TokenType.Identifier);
            args.push(state.curr().content);
            state.next();
            state.assertType(TokenType.Comma, TokenType.BracketClose);
            if(state.curr().type === TokenType.Comma) {
                state.next();
            }
        }
        state.assertType(TokenType.BracketClose);
        state.next();
        return args;
    }

    function parseArgumentList(state, allowMissing = false, allowVarC = false) {
        state.assertType(TokenType.ParenOpen);
        state.next();
        let args = [];
        while(true) {
            if(allowVarC) {
                state.assertType(TokenType.Identifier, TokenType.ParenClose, TokenType.TripleDots);
            } else {
                state.assertType(TokenType.Identifier, TokenType.ParenClose);
            }
            if(state.curr().type === TokenType.ParenClose) { break; }
            const isVarC = allowVarC
                && state.curr().type === TokenType.TripleDots;
            if(isVarC) { state.next(); }
            state.assertType(TokenType.Identifier);
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
            args.push({ name: name.content, type, isVarC });
            if(isVarC) {
                state.assertType(TokenType.ParenClose);
            }
            state.assertType(
                TokenType.Comma, TokenType.ParenClose
            );
            if(state.curr().type === TokenType.Comma) {
                state.next();
            }
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
            const name = parsePath(state);
            const typeArgs = parseTypeArgList(state);
            const args = parseArgumentList(state, false, true);
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
                state.assertType(TokenType.StringLiteral);
                body = state.curr().content;
                state.next();
            }
            return {
                type: NodeType.Function, isPublic, isExternal, 
                name, typeArgs, args, returnType, body,
                path: start.path, start: start.start, end
            };
        };
        const parseStructure = isPublic => {
            assertTopLevel(true);
            state.assertType(TokenType.KeywordStruct);
            state.next();
            const name = parsePath(state);
            let end = state.curr().end;
            const typeArgs = parseTypeArgList(state);
            const members = parseArgumentList(state);
            if(members.length > 0) { 
                end = members.at(-1).type.end; 
            } 
            return {
                type: NodeType.Structure, isPublic,
                name, typeArgs, members,
                path: start.path, start: start.start, end
            };
        };
        const parseEnumeration = isPublic => {
            assertTopLevel(true);
            state.assertType(TokenType.KeywordEnum);
            state.next();
            const name = parsePath(state);
            let end = state.curr().end;
            const typeArgs = parseTypeArgList(state);
            const members = parseArgumentList(state, true);
            if(members.length > 0) {
                end = members.at(-1).type.end;
            }
            return {
                type: NodeType.Enumeration, isPublic,
                name, typeArgs, members,
                path: start.path, start: start.start, end
            };
        };
        const parseVariable = (isPublic, isExternal) => {
            const isMutable = state.curr().type 
                == TokenType.KeywordMut;
            state.next();
            let name;
            if(topLevel) {
                name = parsePath(state);
            } else {
                state.assertType(TokenType.Identifier);
                name = state.curr().content;
                state.next();
            }
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
                    const pathContinues = () => state.curr().type === TokenType.Identifier 
                        || state.curr().type === TokenType.Asterisk;
                    while(pathContinues()) {
                        const isWildcard = state.curr().type === TokenType.Asterisk;
                        path.push(state.curr().content);
                        state.next();
                        if(state.curr().type === TokenType.PathSeparator && !isWildcard) {
                            state.next();
                            continue;
                        }
                        let usages = [];
                        if(state.curr().type === TokenType.KeywordAs && !isWildcard) {
                            state.next();
                            state.assertType(TokenType.Identifier);
                            usages.push({ 
                                pattern: state.curr().content, replacement: path.join("::") 
                            });
                            state.next();
                        } else {
                            const end = path.at(-1);
                            usages.push({ 
                                pattern: end, replacement: path.join("::") 
                            });
                        }
                        return usages;
                    }
                    state.assertType(TokenType.ParenOpen);
                    state.next();
                    let usages = [];
                    while(state.curr().type !== TokenType.ParenClose) {
                        usages.push(...parseUsages(path));
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

    function createCheckerState(messages) {
        return {
            module: "",
            usages: {},
            symbols: {},
            scopes: [],
            messages,

            enterScope: function(typeArgs = null) {
                this.scopes.push({
                    variables: {},
                    returnType: null,
                    typeArgs,
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
            findTypeArgs: function() {
                for(let i = this.scopes.length - 1; i >= 0; i -= 1) {
                    const scope = this.scopes[i];
                    const typeArgs = scope.typeArgs;
                    if(typeArgs !== null) { return typeArgs; }
                }
                return {};
            },
            
            clone: function() {
                let r = createCheckerState(this.messages);
                r.module = this.module;
                r.usages = JSON.parse(JSON.stringify(this.usages));
                r.scopes = JSON.parse(JSON.stringify(this.scopes));
                r.symbols = this.symbols;
                r.messages = this.messages;
                return r;
            }
        };
    }

    function nodeAsSource(node) {
        return { path: node.path, start: node.start, end: node.end };
    };

    const Type = makeEnum(
        "Unit",
        "Integer",
        "Float",
        "Boolean",
        "String",
        "Struct",
        "Enum",
        "Function",
        "List"
    );

    const builtinTypes = Object.freeze({
        "Unit": { type: Type.Unit, argC: 0, mutable: false },
        "Int": { type: Type.Integer, argC: 0, mutable: false },
        "Float": { type: Type.Float, argC: 0, mutable: false },
        "Bool": { type: Type.Boolean, argC: 0, mutable: false },
        "String": { type: Type.String, argC: 0, mutable: false },
        "List": { type: Type.List, argC: 1, mutable: true }
    });

    function typeFromNode(node, state) {
        switch(node.type) {
            case NodeType.Path: {
                const path = expandUsages(node.value, state);
                const typeArgs = node.typeArgs === undefined
                    ? [] : node.typeArgs.map(t => typeFromNode(t, state));
                const typeScope = state.findTypeArgs();
                if(typeScope[node.value] !== undefined) {
                    if(node.mutable) {
                        throw message.from(
                            message.error(
                                `Attempt to specify mutability on a type argument`
                            ),
                            message.code(node)
                        );
                    }
                    if(typeArgs.length > 0) {
                        throw message.from(
                            message.error(
                                `Attempt to pass type arguments to a type argument`
                            ),
                            message.code(node)
                        );
                    }
                    return typeScope[node.value];
                }
                const builtin = builtinTypes[node.value];
                if(builtin !== undefined) {
                    if(node.mutable && !builtin.mutable) {
                        throw message.from(
                            message.error(`Attempt to specify the `
                                + `immutable type '${node.value}' as mutable`
                            ),
                            message.code(node)
                        );
                    }
                    if(typeArgs.length !== builtin.argC) {
                        throw message.from(
                            message.error(`'${node.value}'`
                                + ` expects ${builtin.argC} argument`
                                + (builtin.argC === 1? '' : 's')
                                + `, but ${typeArgs.length} `
                                + (typeArgs.length === 1? "was" : "were")
                                + ` provided`
                            ),
                            message.code(node)
                        );
                    }
                    return { 
                        type: builtin.type, node: nodeAsSource(node), typeArgs,
                        mutable: node.mutable
                    }; 
                }
                const s = instantiateSymbol(
                    node, path, typeArgs, 
                    [NodeType.Structure, NodeType.Enumeration],
                    state
                )
                if(s === null) {
                    throw message.from(
                        message.error(`Unknown type '${node.value}'`),
                        message.code(node)
                    );
                }
                let r = { 
                    type: null, name: path, typeArgs, mutable: node.mutable,
                    node: nodeAsSource(node) 
                };
                if(node.mutable && s.s.node.type === NodeType.Enumeration) {
                    throw message.from(
                        message.error(`Attempt to specify the`
                            + `immutable type '${node.value}' as mutable`
                        ),
                        message.code(node)
                    );
                }
                switch(s.s.node.type) {
                    case NodeType.Structure: r.type = Type.Struct; break;
                    case NodeType.Enumeration: r.type = Type.Enum; break;
                    default: throw message.internalError(
                        `Unhandled symbol type ${s.type}`
                    )
                }
                return r;
            }
            case NodeType.FunctionType: {
                const arguments = node.argTypes
                    .map(n => typeFromNode(n, state));
                const returned = typeFromNode(node.returnType, state);
                return {
                    type: Type.Function, arguments, returned, node: nodeAsSource(node)
                };
            }
        }
        throw message.internalError(`Unhandled node type ${node.type} in 'typeFromNode'`);
    }

    const defaultUsages = Object.freeze([
        { pattern: "*", replacement: "std::*" }
    ]);

    function handleModules(node, state) {
        const addUsage = (usage) => {
            if(usage.pattern !== "*") {
                state.usages[usage.pattern] = usage.replacement;
                return;
            }
            const prefixParts = usage.replacement
                .split("::").slice(0, -1);
            const prefix = prefixParts.join("::");
            for(const path of allSymbolPaths(state)) {
                if(!path.startsWith(prefix)) { continue; }
                const pathParts = path.split("::");
                if(pathParts.length <= prefixParts.length) { continue; }
                const full = pathParts.slice(0, prefixParts.length + 1).join("::");
                const pattern = pathParts[prefixParts.length];
                state.usages[pattern] = full;
            }
        };
        switch(node.type) {
            case NodeType.Module: {
                state.module = node.name;
                state.usages = {};
                defaultUsages.forEach(addUsage);
                addUsage({ pattern: "*", replacement: (node.name + "::*") });
                break;
            }
            case NodeType.Usage: {
                node.usages.forEach(addUsage);
                break;
            }
        }
    }

    function allSymbolPaths(state) {
        return Object.keys(state.symbols);
    }

    function hasSymbol(path, state) {
        return state.symbols[path] !== undefined;
    }

    function assertSymbolUnique(node, path, state) {
        if(!hasSymbol(path, state)) { return; }
        throw message.from(
            message.error(`The symbol '${path}' exists more than once`),
            message.code(node),
            message.note("There may only be one symbol of the same name in the same module")
        );
    };

    const instanceKeyOf = typeArgs => typeArgs.map(displayType).join(", ");

    function instantiateSymbol(
        usageNode, path, typeArgs, allowedTypes, callerState,
        givenArgTypes = null, expectedReturnType = null, givenEnumVariantName = null
    ) {
        const s = callerState.symbols[path];
        if(s === undefined) { return null; }
        const state = s.checker.clone();
        const node = s.node;
        if(!allowedTypes.includes(node.type)) {
            return null;
        }
        let inferredTypeArgs = typeArgs;
        if(inferredTypeArgs === undefined) {
            inferredTypeArgs = new Array(s.typeArgs.length).fill(null);
            if(givenArgTypes !== null) {
                switch(node.type) {
                    case NodeType.Structure: {
                        const argC = Math.min(
                            givenArgTypes.length, s.node.members.length
                        );
                        for(let i = 0; i < argC; i += 1) {
                            const given = givenArgTypes[i];
                            if(given === null) { continue; }
                            inferTypeArguments(
                                s.node.members[i].type, given, 
                                s.typeArgs, inferredTypeArgs, state
                            );
                        }
                        break;
                    }
                    case NodeType.Enumeration: {
                        if(givenEnumVariantName === null) { break; }
                        if(givenArgTypes.length !== 1) { break; }
                        for(const member of s.node.members) {
                            if(member.name !== givenEnumVariantName) { continue; }
                            inferTypeArguments(
                                member.type, givenArgTypes[0],
                                s.typeArgs, inferredTypeArgs, state
                            );
                            break;
                        }
                        break;
                    }
                    case NodeType.Function: {
                        const argC = Math.min(
                            givenArgTypes.length, s.node.args.length
                        );
                        for(let argI = 0; argI < argC; argI += 1) {
                            const arg = s.node.args[argI];
                            if(arg.isVarC === true) {
                                const gArgC = givenArgTypes.length;
                                const gArgT = givenArgTypes[argI];
                                const gListT = {
                                    type: Type.List, node: nodeAsSource(gArgT.node),
                                    typeArgs: [gArgT]
                                };
                                for(let i = argI; i < gArgC; i += 1) {
                                    inferTypeArguments(
                                        arg.type, gListT, 
                                        s.typeArgs, inferredTypeArgs, state
                                    );
                                }
                                break;
                            }
                            inferTypeArguments(
                                arg.type, givenArgTypes[argI], 
                                s.typeArgs, inferredTypeArgs, state
                            );
                        }
                        break;
                    }
                    case NodeType.Variable: break;
                }
            }
            if(expectedReturnType !== null) {
                switch(node.type) {
                    case NodeType.Structure:
                    case NodeType.Enumeration: {
                        const src = usageNode;
                        const result = {
                            type: NodeType.Path, value: path,
                            path: src.path, start: src.start, end: src.end,
                            typeArgs: s.typeArgs.map(t => {
                                return {
                                    type: NodeType.Path, value: t,
                                    path: src.path, start: src.start, end: src.end
                                };
                            })
                        };
                        inferTypeArguments(
                            result, expectedReturnType, 
                            s.typeArgs, inferredTypeArgs, state
                        );
                        break;
                    }
                    case NodeType.Function: {
                        inferTypeArguments(
                            s.node.returnType, expectedReturnType, 
                            s.typeArgs, inferredTypeArgs, state
                        );
                        break;
                    }
                    case NodeType.Variable: break;
                }
            }
            const uninferred = inferredTypeArgs.indexOf(null);
            if(uninferred !== -1) {
                throw message.from(
                    message.error(`Not enough context to infer type argument `
                        + `'${s.typeArgs[uninferred]}' of symbol '${path}'`),
                    message.code(usageNode),
                    message.note(`'${path}' is defined here:`),
                    message.code(node)
                );    
            }
        }
        if(inferredTypeArgs.length !== s.typeArgs.length) {
            throw message.from(
                message.error(`The symbol '${path}' takes ${s.typeArgs.length}`
                    + " type argument" + (s.typeArgs.length === 1? "" : "s")
                    + `, but ${inferredTypeArgs.length} ` 
                    + (inferredTypeArgs.length === 1? "was" : "were") + " provided"
                ),
                message.code(usageNode),
                message.note(`'${path}' is defined here:`),
                message.code(node)
            );
        }
        const instanceKey = instanceKeyOf(inferredTypeArgs);
        let instance = s.instances[instanceKey];
        if(instance === undefined) {
            const namedTypeArgs = {};
            for(const i in inferredTypeArgs) {
                namedTypeArgs[s.typeArgs[i]] = inferredTypeArgs[i];
            }
            try {
                switch(node.type) {
                    case NodeType.Structure: 
                    case NodeType.Enumeration: {
                        state.enterScope(namedTypeArgs);
                        instance = { s, members: null, typeArgs: inferredTypeArgs };
                        s.instances[instanceKey] = instance;
                        instance.members = node.members.map(m => {
                            return {
                                name: m.name,
                                type: typeFromNode(m.type, state)
                            };
                        });
                        state.exitScope();
                        break;
                    }
                    case NodeType.Function: {
                        state.enterScope(namedTypeArgs);
                        const scope = state.scope();
                        const returnType = typeFromNode(node.returnType, state);
                        scope.returnType = returnType;
                        const argTypes = node.args.map(arg => {
                            const argType = typeFromNode(arg.type, state);
                            scope.variables[arg.name] = {
                                type: argType, isMutable: false, node: nodeAsSource(node)
                            };
                            return { name: arg.name, type: argType, isVarC: arg.isVarC };
                        });
                        instance = { 
                            s, argTypes, returnType, typeArgs: inferredTypeArgs
                        };
                        s.instances[instanceKey] = instance;
                        if(!node.isExternal) {
                            instance.checkedBody
                                = JSON.parse(JSON.stringify(node.body));
                            for(const statement of instance.checkedBody) {
                                checkTypes(statement, state);
                            }
                        }
                        const alwaysReturns = state.exitScope();
                        const missingReturn = !node.isExternal
                            && !alwaysReturns && returnType.type !== Type.Unit;
                        if(missingReturn) {
                            throw message.from(
                                message.error(`Function '${node.name}' does not always return a value`),
                                message.note(`The function specifies '${displayType(returnType)}' as the return type here:`),
                                message.code(node.returnType),
                                message.note(`However, the end of the function can be reached, which is only allowed if the function returns 'Unit':`),
                                message.code(
                                    node.body.length === 0? node : node.body.at(-1)
                                )
                            );
                        }
                        break;
                    }
                    case NodeType.Variable: {
                        state.enterScope(namedTypeArgs);
                        const exp = node.valueType === null? null
                            : typeFromNode(node.valueType, state);
                        const got = node.value === null? null
                            : checkTypes(node.value, state, exp);
                        if(got !== null && exp !== null) {
                            assertTypesEqual(exp, got, node);
                        }
                        const type = got !== null? got : exp;
                        node.fullPath = path;
                        instance = { s, type, typeArgs: inferredTypeArgs };
                        state.exitScope();
                        break;
                    }
                }
                if(instance === undefined) {
                    throw message.internalError(`Unhandled symbol type ${node.type}`);
                }
                s.instances[instanceKey] = instance;
                instance.instanceI = s.instanceC;
                s.instanceC += 1;
            } catch(error) {
                const expandError = error.sections !== undefined 
                    && inferredTypeArgs.length >= 1;
                if(!expandError) { throw error; }
                let dTypeArgs = ""; 
                for(const i in inferredTypeArgs) {
                    if(i >= 1 && i == inferredTypeArgs.length - 1) { 
                        dTypeArgs += " and "; 
                    } else if(i >= 1) { dTypeArgs += ", "; }
                    dTypeArgs += `'${s.typeArgs[i]}=${displayType(inferredTypeArgs[i])}'`;
                }
                error.sections.push(
                    message.note(`'${path}' is instantiated using ${dTypeArgs} here:`),
                    message.code(usageNode)
                );
                throw error;
            }
        }
        return instance;
    }

    function collectSymbolNames(statements, state) {
        for(const node of statements) {
            handleModules(node, state);
            switch(node.type) {
                case NodeType.Structure:
                case NodeType.Enumeration:
                case NodeType.Function:
                case NodeType.Variable: {
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    assertSymbolUnique(node, path, state);
                    state.symbols[path] = null;
                }
            }
        }
    }

    function collectSymbols(statements, state) {
        for(const node of statements) {
            handleModules(node, state);
            switch(node.type) {
                case NodeType.Structure:
                case NodeType.Enumeration:
                case NodeType.Function:
                case NodeType.Variable: {
                    const path = state.module.length === 0
                        ? node.name : state.module + "::" + node.name;
                    node.fullPath = path;
                    const typeArgs = node.typeArgs === undefined
                        ? [] : node.typeArgs;
                    state.symbols[path] = {
                        name: node.name,
                        node,
                        typeArgs,
                        instances: {},
                        instanceC: 0,
                        checker: state.clone()
                    };
                }
            }
        }
    }

    function checkBaseSymbols(state) {
        for(const path in state.symbols) {
            const s = state.symbols[path];
            if(s.typeArgs.length >= 1) { continue; }
            instantiateSymbol(s.node, path, [], [s.node.type], state);  
        }
    }
       
    
    function pathOfType(t) {
        switch(t.type) {
            case Type.Unit: return "std::Unit";
            case Type.Integer: return "std::Int";
            case Type.Float: return "std::Float";
            case Type.Boolean: return "std::Bool";
            case Type.String: return "std::String";
            case Type.List: return "std::List";
            case Type.Function: return "std::Fun";
            case Type.Struct: case Type.Enum: return t.name;
        }
        throw message.internalError(`Unhandled type type ${t.type}`);
    }

    function expandUsages(path, state) {
        const inModule = state.module.length === 0
            ? path : state.module + "::" + path;
        if(hasSymbol(inModule, state)) { return inModule; }
        const typeScope = state.findTypeArgs();
        const pathSegs = path.split("::");
        const start = pathSegs.at(0);
        const expansion = typeScope[start] !== undefined
            ? pathOfType(typeScope[start])
            : state.usages[start];
        if(expansion === undefined) { return path; }
        let result = expansion; 
        if(pathSegs.length > 1) {
            result += "::" + pathSegs.slice(1).join("::");
        }
        return result;
    }

    function assertSymbolExposed(node, symbolPath, symbol, state) {
        if(symbol.node.isPublic) { return; }
        if(symbol.checker.module === state.module) { return; }
        throw message.from(
            message.error(`'${symbolPath}' is not public but accessed from a different module`),
            message.code(node),
            message.note(`'${symbolPath}' is defined here:`),
            message.code(symbol.node),
            message.note(`The access is in '${state.module}', which is only valid if '${symbolPath}' is declared as public`)
        );
    }

    function displayType(t) {
        const typeArgs = () => t.typeArgs === undefined? ""
            : t.typeArgs.length === 0? ""
            : "[" + t.typeArgs.map(displayType).join(", ") + "]";
        let r = t.mutable === true? "mut " : "";
        switch(t.type) {
            case Type.Unit: r += "Unit"; break;
            case Type.Integer: r += "Int"; break;
            case Type.Float: r += "Float"; break;
            case Type.Boolean: r += "Bool"; break;
            case Type.String: r += "String"; break;
            case Type.Struct: 
            case Type.Enum: r += t.name + typeArgs(); break;
            case Type.Function: {
                const a = t.arguments.map(displayType).join(", ");
                const b = displayType(t.returned);
                r += `Fun(${a}) -> ${b}`;
                break;
            }
            case Type.List: r += "List" + typeArgs(); break;
            default: {
                console.warn(`displayType: unhandled type ${t.type}`);
                return `<unhandled type: ${t.type}>`;
            }
        }
        return r;
    }

    function typesEqual(exp, got) {
        if(typeof exp !== "object" || exp === null) { return false; }
        if(typeof got !== "object" || got === null) { return false; }
        if(exp.type !== got.type) { return false; }
        if(exp.name !== got.name) { return false; }
        if(exp.mutable === true && got.mutable !== true) { return false; }
        const expTAC = exp.typeArgs === undefined
            ? 0 : exp.typeArgs.length;
        const gotTAC = got.typeArgs === undefined
            ? 0 : got.typeArgs.length;
        if(expTAC !== gotTAC) { return false; }
        for(let i = 0; i < expTAC; i += 1) {
            if(!typesEqual(exp.typeArgs[i], got.typeArgs[i])) { return false; }
        }
        if(exp.type === Type.Function) {
            if(exp.arguments.length !== got.arguments.length) {
                return false;
            }
            for(let i = 0; i < exp.arguments.length; i += 1) {
                if(!typesEqual(exp.arguments[i], got.arguments[i])) { return false; }
            }
            if(!typesEqual(exp.returned, got.returned)) { return false; }
        }
        return true;
    }

    function assertTypesEqual(exp, got, source) {
        if(typesEqual(exp, got)) { return; }
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

    function inferTypeArguments(exp, got, typeArgNames, inferredArgs, state) {
        // just check that the type is correct
        const dummyTypeArgs = {};
        for(const name of typeArgNames) {
            dummyTypeArgs[name] = { type: Type.Struct, name, node: nodeAsSource(exp) };
        }
        state.enterScope(dummyTypeArgs);
        typeFromNode(exp, state);
        state.exitScope();
        if(got === null) { return; }
        // 'exp' = TYPE NODE, 'got' = TYPE INSTANCE
        const infer = (exp, got) => {
            switch(exp.type) {
                case NodeType.Path: {
                    const typeNameI = typeArgNames.indexOf(exp.value);
                    if(typeNameI !== -1) {
                        inferredArgs[typeNameI] = got;
                        return;
                    }
                    if(exp.typeArgs === undefined) { return; }
                    if(got.typeArgs === undefined) { return; }
                    if(exp.typeArgs.length === 0) { return; }
                    if(exp.typeArgs.length !== got.typeArgs.length) { return; }
                    for(let i = 0; i < got.typeArgs.length; i += 1) {
                        infer(exp.typeArgs[i], got.typeArgs[i]);
                    }
                    break;
                }
                case NodeType.FunctionType: {
                    if(exp.argTypes.length !== got.arguments.length) { return; }
                    for(let i = 0; i < got.arguments.length; i += 1) {
                        infer(exp.argTypes[i], got.arguments[i]);
                    }
                    infer(exp.returnType, got.returned);
                    break;
                }
                default: throw message.internalError(
                    `Unhandled type node type ${exp.type}`
                );
            }
        };
        infer(exp, got, typeArgNames, inferredArgs);
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

    function assertFunctionType(t, node) {
        if(t.type === Type.Function) { return; }
        const gotD = displayType(t);
        throw message.from(
            message.error(`Expected function type, but got '${gotD}'`),
            message.code(node),
            message.note(`'${gotD}' originates from here:`),
            message.code(t.node)
        );
    }

    function assertListType(t, node) {
        if(t.type === Type.List) { return t.typeArgs[0]; }
        const gotD = displayType(t);
        throw message.from(
            message.error(`Expected list, but got '${gotD}'`),
            message.code(node),
            message.note(`'${gotD}' originates from here:`),
            message.code(t.node)
        );
    }

    function assertMatchingArgC(expected, got, called, node, calledSymbol) {
        const isVarC = expected.length >= 1 && expected.at(-1).isVarC === true;
        const expC = isVarC? expected.length - 1 : expected.length;
        const gotC = got.length;
        if(isVarC && gotC >= expC) { return; }
        if(expC === gotC) { return; }
        throw message.from(
            message.error(called
                + ` expects ` + (isVarC? "at least " : "")
                + `${expC} argument${expC === 1? '' : 's'},` 
                + ` but ${gotC} ${gotC == 1? "was" : "were"} provided`
            ),
            message.code(node),
            message.note(`${called} is defined here:`),
            message.code(calledSymbol.node)
        );
    };
    
    function assertMatchingArgTypes(expected, got, state) {
        for(let argI = 0; argI < expected.length; argI += 1) {
            const exp = expected[argI].type;
            if(expected[argI].isVarC) {
                const valT = assertListType(exp, exp.node);
                for(let i = argI; i < got.length; i += 1) {
                    const given = checkTypes(got[i], state, valT);
                    assertTypesEqual(valT, given, got[i]);
                }
                break;
            }
            const given = checkTypes(got[argI], state, exp);
            assertTypesEqual(exp, given, got[argI]);
        }
    };

    function getPassedTypeArguments(node, state) {
        if(node.typeArgs === undefined) { return undefined; }
        return node.typeArgs.map(n => typeFromNode(n, state));
    }

    function getPassedArgTypes(nodes, state) {
        return nodes.map(n => {
            try {
                return checkTypes(JSON.parse(JSON.stringify(n)), state.clone());
            } catch(e) {
                return null;
            }
        });
    }

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
                    if(node.value.includes("::")) { break; }
                    if(expected.type === Type.Enum) {
                        const enumeration = instantiateSymbol(
                            node, expected.name, expected.typeArgs, 
                            [NodeType.Enumeration], state
                        );
                        let found = false;
                        for(const memberI in enumeration.members) {
                            const member = enumeration.members[memberI];
                            if(member.name !== node.value) { continue; }
                            node.value = expected.name + "::" + member.name;
                            found = true;
                            break;
                        }
                        if(found) { break; }
                    }
                    const asLocal = state.findLocalVariable(node.value);
                    if(asLocal !== null) { break; }
                    pattern.variables.push({
                        name: (node.value === "_"? null : node.value),
                        path, type: expected
                    });
                    return expected;
                }
                case NodeType.Call: {
                    if(node.called.type !== NodeType.Path) { break; }
                    const calledPath = expandUsages(node.called.value, state);
                    const typeArgs = getPassedTypeArguments(node.called, state);
                    const asFunction = instantiateSymbol(
                        node, calledPath, typeArgs, [NodeType.Function], state,
                        null, expected
                    );
                    if(asFunction !== null) { break; }
                    const asStruct = instantiateSymbol(
                        node, calledPath, typeArgs, 
                        [NodeType.Structure], state,
                        null, expected
                    );
                    if(asStruct !== null) {
                        assertTypesEqual(
                            expected, 
                            { 
                                type: Type.Struct, name: calledPath, node: nodeAsSource(node), 
                                typeArgs: asStruct.typeArgs, mutable: true
                            }, 
                            node
                        );
                        assertSymbolExposed(node, calledPath, asStruct.s, state);
                        assertMatchingArgC(
                            asStruct.members, node.args,
                            `The structure '${calledPath}'`, node, asStruct.s
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
                    const variant = rawPathElems.at(-1);
                    let enumPath = null;
                    if(rawPathElems.length === 1) { 
                        if(expected.type !== Type.Enum) { break; }
                        const enumeration = instantiateSymbol(
                            node, expected.name, expected.typeArgs, 
                            [NodeType.Enumeration], state
                        );
                        for(const memberI in enumeration.members) {
                            const member = enumeration.members[memberI];
                            if(member.name !== variant) { continue; }
                            enumPath = expected.name;
                            break;
                        }
                    }
                    if(enumPath === null) {
                        enumPath = expandUsages(
                            rawPathElems.slice(0, -1).join("::"), state
                        );
                    }
                    const asEnum = instantiateSymbol(
                        node, enumPath, typeArgs, [NodeType.Enumeration], state,
                        null, expected
                    );
                    if(asEnum !== null) {
                        assertTypesEqual(
                            expected, 
                            { 
                                type: Type.Enum, name: enumPath, node: nodeAsSource(node), 
                                typeArgs: asEnum.typeArgs
                            }, 
                            node
                        );
                        assertSymbolExposed(node, enumPath, asEnum.s, state);
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
            return checkTypes(node, state, expected);
        };
        const got = check();
        assertTypesEqual(expected, got, node);
    }

    const PatternValue = makeEnum(
        "Unit",
        "Bool",
        "Enum",
        "Struct",
        "Any"
    );

    function patternValuesOf(type, state, seenTypes = []) {
        switch(type.type) {
            case Type.Unit: return [{ type: PatternValue.Unit }];
            case Type.Boolean: return [
                { type: PatternValue.Bool, value: "true" },
                { type: PatternValue.Bool, value: "false" }
            ];
            case Type.Enum: {
                if(seenTypes.includes(type.name)) { break; }
                let output = [];
                const mems = instantiateSymbol(
                    type.node, type.name, type.typeArgs, [NodeType.Enumeration], 
                    state
                ).members;
                for(const memI in mems) {
                    const vals = patternValuesOf(
                        mems[memI].type, state, [...seenTypes, type.name]
                    ).map(value => {
                        return {
                            type: PatternValue.Enum, 
                            name: type.name,
                            typeArgs: type.typeArgs,
                            variant: memI, value,
                            node: type.node
                        };
                    });
                    output.push(...vals);
                }
                return output;
            }
            case Type.Struct: {
                if(seenTypes.includes(type.name)) { break; }
                let output = [];
                const mems = instantiateSymbol(
                    type.node, type.name, type.typeArgs, [NodeType.Structure],
                    state
                ).members;
                for(const memI in mems) {
                    const vals = patternValuesOf(
                        mems[memI].type, state, [...seenTypes, type.name]
                    );
                    if(output.length === 0) { 
                        output.push(...vals.map(v => [v]));
                        continue;
                    }
                    const prev = output;
                    output = [];
                    for(const p of prev) {
                        for(const v of vals) {
                            output.push([...p, v]);
                        }
                    }
                }
                return output.map(members => {
                    return {
                        type: PatternValue.Struct, 
                        name: type.name, members,
                        typeArgs: type.typeArgs,
                        node: type.node
                    };
                });
            };
        }
        return [{ type: PatternValue.Any }];
    }

    function displayPatternValue(value, state) {
        const typeArgs = () => value.typeArgs === undefined? ""
            : "[" + value.typeArgs.map(displayType).join(", ") + "]";
        switch(value.type) {
            case PatternValue.Unit: return "unit";
            case PatternValue.Bool: return value.value;
            case PatternValue.Enum: {
                const enumeration = instantiateSymbol(
                    value.node, value.name, value.typeArgs, [NodeType.Enumeration],
                    state
                );
                const variant = enumeration.members[value.variant].name;
                const val = displayPatternValue(value.value, state);
                return `${value.name}::${variant}${typeArgs()}(${val})`;
            }
            case PatternValue.Struct: {
                const structure = instantiateSymbol(
                    value.node, value.name, value.typeArgs, [NodeType.Structure],
                    state
                );
                const members = value.members
                    .map(v => displayPatternValue(v, state)).join(", ");
                return `${value.name}}${typeArgs()}(${members})`;
            }
            case PatternValue.Any: { return "all values"; }
        }
        console.warn(`Unhandled pattern value type ${value.type}!`);
        return "<UNHANDLED PATTERN VALUE!>";
    }

    function patternHandlesValue(pattern, path, value, state) {
        const pathEq = (lhs, rhs) => {
            if(lhs.length !== rhs.length) { return false; }
            for(const i in lhs) {
                const a = lhs[i];
                const b = rhs[i];
                if(a.type !== b.type) { return false; }
                switch(a.type) {
                    case PatternPath.StructMember:
                    case PatternPath.EnumMember:
                        if(a.name !== b.name) { return false; }
                        break;
                }
            }
            return true;
        };
        for(const variable of pattern.variables) {
            if(pathEq(path, variable.path)) { return true; }
        }
        switch(value.type) {
            case PatternValue.Struct: {
                const members = instantiateSymbol(
                    value.node, value.name, value.typeArgs, [NodeType.Structure],
                    state
                ).members;
                for(const memI in value.members) {
                    const memPath = [...path, { 
                        type: PatternPath.StructMember,
                        path: value.name, 
                        name: members[memI].name
                    }];
                    const memHandled = patternHandlesValue(
                        pattern, memPath, value.members[memI], state
                    );
                    if(!memHandled) { return false; }
                }
                return true;
            }
            case PatternValue.Any:
                return false;
        }
        for(const cond of pattern.conditions) {
            if(!pathEq(path, cond.path)) { continue; }
            switch(value.type) {
                case PatternValue.Unit: {
                    let matches = cond.type === PatternCondition.Value
                        && cond.value.type === NodeType.UnitLiteral;
                    if(matches) { return true; }
                    continue;
                }
                case PatternValue.Bool: {
                    let matches = cond.type === PatternCondition.Value
                        && cond.value.type === NodeType.BoolLiteral
                        && cond.value.value === value.value;
                    if(matches) { return true; }
                    continue;
                }
                case PatternValue.Enum: {
                    switch(cond.type) {
                        case PatternCondition.Value: {
                            let matches = cond.value.type === NodeType.EnumerationInit
                                && cond.value.fullPath === value.name;
                            if(matches) { return true; }
                            break;
                        }
                        case PatternCondition.EnumVariant: {
                            const memPath = () => {
                                const members = instantiateSymbol(
                                    value.node, value.name, value.typeArgs,
                                    [NodeType.Enumeration], state
                                ).members;
                                return [...path, { 
                                    type: PatternPath.EnumMember,
                                    path: value.name, 
                                    name: members[cond.variant].name
                                }];
                            };
                            let matches = cond.variant === value.variant
                                && patternHandlesValue(
                                    pattern, memPath(), value.value, state
                                );
                            if(matches) { return true; }
                            break;
                        }
                    }
                    continue;
                }
                case PatternValue.Struct: 
                case PatternValue.Any: 
                    return false;
                default: 
                    throw message.internalError(
                        `Unhandled pattern value type ${value.type}!`
                    );
            }
        }
        return false;
    }

    function checkTypes(node, state, expected = null, assignment = false) {
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
                    const typeArgs = getPassedTypeArguments(node, state);
                    const global = instantiateSymbol(
                        node, path, typeArgs, [NodeType.Variable], state
                    );
                    if(global !== null) {
                        assertSymbolExposed(node, path, global.s, state);
                        node.fullPath = path;
                        assertImmutable(global);
                        return global.type;
                    }
                    assertReadOnly();
                    const func = instantiateSymbol(
                        node, path, typeArgs, [NodeType.Function], state,
                        expected === null? null : expected.arguments, 
                        expected === null? null : expected.returned
                    );
                    if(func !== null) {
                        assertSymbolExposed(node, path, func.s, state);
                        node.fullPath = path;
                        node.instanceKey = instanceKeyOf(func.typeArgs);
                        const arguments = func.argTypes.map(a => a.type);
                        const returned = func.returnType;
                        return {
                            type: Type.Function, arguments, returned,
                            node: nodeAsSource(node)
                        };
                    }
                    const pathElems = node.value.split("::");
                    if(pathElems.length > 1) {
                        const enumPath = expandUsages(
                            pathElems.slice(0, -1).join("::"), state
                        );
                        const variant = pathElems.at(-1);
                        const enumeration = instantiateSymbol(
                            node, enumPath, typeArgs, [NodeType.Enumeration], state,
                            null, expected
                        );
                        if(enumeration !== null) {
                            assertSymbolExposed(
                                node, enumPath, enumeration.s, state
                            );
                            node.fullPath = enumPath;
                            const value = { type: Type.Unit, node: nodeAsSource(node) };
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
                                    type: Type.Enum, name: enumPath, node: nodeAsSource(node), 
                                    typeArgs: enumeration.typeArgs
                                };
                            }
                            throw message.from(
                                message.error(`Creation of unknown enum variant '${path}' attempted`),
                                message.code(node),
                                message.note(`'${enumPath}' originates from here:`),
                                message.code(enumeration.s.node)
                            );
                        }
                    }
                    throw message.from(
                        message.error(`Access of unknown variable '${node.value}'`),
                        message.code(node)
                    );
                }
                case NodeType.IntLiteral: {
                    assertReadOnly();
                    return { type: Type.Integer, node: nodeAsSource(node) };
                }
                case NodeType.FloatLiteral: {
                    assertReadOnly();
                    return { type: Type.Float, node: nodeAsSource(node) };
                }
                case NodeType.BoolLiteral: {
                    assertReadOnly();
                    return { type: Type.Boolean, node: nodeAsSource(node) };
                }
                case NodeType.UnitLiteral: {
                    assertReadOnly();
                    return { type: Type.Unit, node: nodeAsSource(node) };
                }
                case NodeType.StringLiteral: {
                    assertReadOnly();
                    return { type: Type.String, node: nodeAsSource(node) };
                }
                case NodeType.FunctionLiteral: {
                    if(expected === null) {
                        throw message.from(
                            message.error("Insufficient context for function literal"),
                            message.code(node),
                            message.note("Function literals can only be used if their types can be determined based on context."),
                            message.note("Consider adding type annotations to resolve this issue.")
                        );
                    }
                    assertFunctionType(expected, node);
                    if(expected.arguments.length !== node.args.length) {
                        const expectedD = displayType(expected);
                        throw message.from(
                            message.error(`${expectedD}`
                                + ` expects ${expected.arguments.length} argument`
                                + (expected.arguments.length === 1? '' : 's')
                                + `, but ${node.args.length} `
                                + (node.args.length === 1? "was" : "were")
                                + ` provided`
                            ),
                            message.code(node),
                            message.note(`'${expectedD}' originates from here:`),
                            message.code(expected.node)
                        );
                    }
                    state.enterScope();
                    state.scope().returnType = expected.returned;
                    const scope = state.scope();
                    for(const argI in expected.arguments) {
                        const exp = expected.arguments[argI];
                        const arg = node.args[argI];
                        arg.type = exp;
                        scope.variables[arg.name] = {
                            type: exp, isMutable: false, node: nodeAsSource(node)
                        };
                    }
                    for(const statement of node.body) {
                        checkTypes(statement, state);
                    }
                    const alwaysReturns = state.exitScope();
                    const missingReturn = !alwaysReturns && expected.returned.type !== Type.Unit
                    if(missingReturn) {
                        throw message.from(
                            message.error(`Function does not always return a value`),
                            message.note(`The function type '${displayType(expected)}' specifies '${displayType(expected.returned)}' as the return type here:`),
                            message.code(expected.returnType),
                            message.note(`However, the end of the function can be reached, which is only allowed if the function returns 'Unit':`),
                            message.code(
                                node.body.length === 0? node : node.body.at(-1)
                            )
                        );
                    }
                    return expected;
                }
                case NodeType.Multiplicative:
                case NodeType.Additive:
                case NodeType.Comparative: {
                    assertReadOnly();
                    const lhs = checkTypes(node.lhs, state);
                    const rhs = checkTypes(node.rhs, state, lhs);
                    assertTypesEqual(lhs, rhs, node);
                    const op = node.op;
                    if(op != "==" && op != "!=") {
                        assertNumberType(lhs, node);
                    }
                    return node.type === NodeType.Comparative
                        ? { type: Type.Boolean, node: nodeAsSource(node) } : lhs;
                }
                case NodeType.Negation: {
                    assertReadOnly();
                    let value;
                    if(node.op === "-") {
                        value = checkTypes(node.value, state);
                        assertNumberType(value, node, node);
                    } else {
                        const bool = { type: Type.Boolean, node: nodeAsSource(node) };
                        value = checkTypes(node.value, state, bool);
                        assertTypesEqual(value, bool, node);
                    }
                    return value;
                }
                case NodeType.MemberAccess: {
                    const accessed = checkTypes(node.accessed, state);
                    if(accessed.type !== Type.Struct) {
                        throw message.from(
                            message.error(
                                `Access of member ${node.name} of the non-struct `
                                    + `type '${displayType(accessed)}'`
                            ),
                            message.code(node),
                            message.note(`'${displayType(accessed)}' originates from here:`),
                            message.code(accessed.node)
                        );
                    }
                    if(assignment && accessed.mutable !== true) {
                        const accessedD = displayType(accessed);
                        throw message.from(
                            message.error(`Assignment to property of object behind `
                                + `non-mutable reference '${accessedD}'`
                            ),
                            message.code(node),
                            message.note(`'${accessedD}' originates from here:`),
                            message.code(accessed.node),
                            message.note(`'mut ${accessedD}' would be required for this to work`)
                        );
                    }
                    const struct = instantiateSymbol(
                        node, accessed.name, accessed.typeArgs, [NodeType.Structure],
                        state
                    );
                    assertSymbolExposed(node, accessed.name, struct.s, state);
                    for(const member of struct.members) {
                        if(member.name !== node.name) { continue; }
                        return member.type;
                    }
                    throw message.from(
                        message.error(
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
                        const typeArgs = getPassedTypeArguments(node.called, state);
                        const argTypes = getPassedArgTypes(node.args, state);
                        const asFunction = instantiateSymbol(
                            node.called, path, typeArgs, [NodeType.Function], state,
                            argTypes, expected
                        );
                        if(asFunction !== null) {
                            assertSymbolExposed(node, path, asFunction.s, state);
                            node.called.fullPath = path;
                            node.called.instanceKey
                                = instanceKeyOf(asFunction.typeArgs);
                            assertMatchingArgC(
                                asFunction.argTypes, node.args,
                                `The function '${path}'`, node, asFunction.s
                            );
                            assertMatchingArgTypes(asFunction.argTypes, node.args, state);
                            return asFunction.returnType;
                        }
                        const asStruct = instantiateSymbol(
                            node.called, path, typeArgs, [NodeType.Structure], state,
                            argTypes, expected
                        );
                        if(asStruct !== null) {
                            assertSymbolExposed(node, path, asStruct.s, state);
                            node.fullPath = path;
                            assertMatchingArgC(
                                asStruct.members, node.args,
                                `The structure '${path}'`, node, asStruct.s
                            );
                            assertMatchingArgTypes(asStruct.members, node.args, state);
                            node.type = NodeType.StructureInit;
                            return {
                                type: Type.Struct, name: path, node: nodeAsSource(node), 
                                typeArgs: asStruct.typeArgs, mutable: true
                            };
                        }
                        const pathElems = node.called.value.split("::");
                        if(pathElems.length > 1) {
                            const enumPath = expandUsages(
                                pathElems.slice(0, -1).join("::"), state
                            );
                            const variant = pathElems.at(-1);
                            const asEnum = instantiateSymbol(
                                node.called, enumPath, typeArgs, 
                                [NodeType.Enumeration], state,
                                argTypes, expected, variant
                            );
                            if(asEnum !== null) {
                                assertSymbolExposed(
                                    node, enumPath, asEnum.s, state
                                );
                                node.fullPath = enumPath;
                                if(node.args.length !== 1) {
                                    throw message.from(
                                        // 'were' always works, since the error only happens
                                        // if there is a non-1 number of arguments
                                        message.error(
                                            `Enums variants take one value, but ${node.args.length} were provided`
                                        ),
                                        message.code(node)
                                    );
                                }
                                for(const memberI in asEnum.members) {
                                    const member = asEnum.members[memberI];
                                    if(member.name !== variant) { continue; }
                                    const value = checkTypes(node.args[0], state, member.type);
                                    assertTypesEqual(member.type, value, node);
                                    node.type = NodeType.EnumerationInit;
                                    node.variant = memberI;
                                    return {
                                        type: Type.Enum, name: enumPath, 
                                        node: nodeAsSource(node), typeArgs: asEnum.typeArgs
                                    };
                                }
                                throw message.from(
                                    message.error(`Creation of unknown enum variant '${path}' attempted`),
                                    message.code(node),
                                    message.note(`'${enumPath}' originates from here:`),
                                    message.code(asEnum.s.node)
                                );
                            }
                        }
                    }
                    const called = checkTypes(node.called, state);
                    assertFunctionType(called, node);
                    if(called.arguments.length !== node.args.length) {
                        const calledD = displayType(called);
                        throw message.from(
                            message.error(`${calledD}`
                                + ` expects ${called.arguments.length} argument`
                                + (called.arguments.length === 1? '' : 's')
                                + `, but ${node.args.length} `
                                + (node.args.length === 1? "was" : "were")
                                + ` provided`
                            ),
                            message.code(node),
                            message.note(`'${calledD}' originates from here:`),
                            message.code(called.node)
                        );
                    }
                    for(const argI in called.arguments) {
                        const exp = called.arguments[argI];
                        const given = checkTypes(node.args[argI], state, exp);
                        assertTypesEqual(exp, given, node.args[argI]);
                    }
                    return called.returned;
                }
                case NodeType.PipedCall: {
                    node.type = NodeType.Call;
                    if(node.called.type !== NodeType.Path) { 
                        return check(); 
                    }
                    const path = expandUsages(node.called.value, state);
                    if(hasSymbol(path, state) || node.called.value.includes("::")) {
                        return check(); 
                    }
                    const selfT = checkTypes(JSON.parse(JSON.stringify(node.args[0])), state.clone());
                    const explTypeArgs = getPassedTypeArguments(
                        node.called, state
                    );
                    let resolved = null;
                    for(const usageAlias in state.usages) {
                        const usedPath = state.usages[usageAlias];
                        const attPath = usedPath + "::" + node.called.value;
                        const s = state.symbols[attPath];
                        if(s === undefined) { continue; }
                        if(s.node.args.length < 1) { continue; }
                        const checker = s.checker.clone();
                        let typeArgs = explTypeArgs;
                        if(typeArgs === undefined) {
                            typeArgs = new Array(s.typeArgs.length).fill(null);
                            inferTypeArguments(
                                s.node.args[0].type, selfT,
                                s.typeArgs, typeArgs, checker
                            );
                        }
                        const namedTypeArgs = {};
                        for(const i in typeArgs) {
                            namedTypeArgs[s.typeArgs[i]] = typeArgs[i];
                        }
                        try {
                            checker.enterScope(namedTypeArgs);
                            const expSelfT = typeFromNode(s.node.args[0].type, checker);
                            checker.exitScope();
                            if(!typesEqual(expSelfT, selfT)) { continue; }
                        } catch(e) {
                            continue;
                        }
                        if(resolved !== null) {
                            throw message.from(
                                message.error(`Ambiguous piped call - both '${resolved}' and '${attPath}' are valid candidates`),
                                message.code(node)
                            );
                        }
                        node.called.value = attPath;
                        node.called.fullPath = attPath;
                        resolved = attPath;
                    }
                    return check();
                }
                case NodeType.IfExpr: {
                    assertReadOnly();
                    const bool = { type: Type.Boolean, node: nodeAsSource(node) };
                    const cond = checkTypes(node.cond, state, bool);
                    assertTypesEqual(bool, cond, node);
                    const ifType = checkTypes(node.ifValue, state);
                    const elseType = checkTypes(node.elseValue, state);
                    assertTypesEqual(ifType, elseType, node);
                    return ifType;
                }

                case NodeType.Variable: {
                    const exp = node.valueType === null? null
                        : typeFromNode(node.valueType, state);
                    const got = node.value === null? null
                        : checkTypes(node.value, state, exp);
                    if(got !== null && exp !== null) {
                        assertTypesEqual(exp, got, node);
                    }
                    const type = exp !== null? exp : got;
                    const scope = state.scope();
                    if(scope === undefined) { return null; }
                    scope.variables[node.name] = {
                        type, isMutable: node.isMutable, node
                    };
                    return null;
                }
                case NodeType.Assignment: {
                    const scope = state.scope();
                    const lhs = checkTypes(node.to, state, null, true);
                    const rhs = checkTypes(node.value, state, lhs);
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
                    const value = checkTypes(node.value, state, returnType);
                    assertTypesEqual(returnType, value, node);
                    state.scope().alwaysReturns = true;
                    return null;
                }
                case NodeType.If: {
                    const bool = { type: Type.Boolean, node: nodeAsSource(node) };
                    const cond = checkTypes(node.cond, state, bool);
                    assertTypesEqual(cond, bool, node);
                    const ifReturns = checkBlock(node.ifBody, state);
                    const elseReturns = checkBlock(node.elseBody, state);
                    state.scope().alwaysReturns |= (ifReturns && elseReturns);
                    return null;
                }
                case NodeType.Match: {
                    const matched = checkTypes(node.matched, state);
                    let allReturn = true;
                    for(const branch of node.branches) {
                        for(const pattern of branch.patterns) {
                            pattern.conditions = [];
                            pattern.variables = [];
                            checkMatchPattern(
                                pattern.node, matched, state, pattern
                            );
                            if(pattern === branch.patterns[0]) { continue; }
                            for(const v of branch.patterns[0].variables) {
                                if(v.name === null) { continue; }
                                if(pattern.variables.some(e => e.name === v.name)) { continue; }
                                throw message.from(
                                    message.error("'match'-pattern has partially defined variables"),
                                    message.note(`'${v.name}' is defined in this pattern:`),
                                    message.code(branch.patterns[0].node),
                                    message.note(`...but not in this pattern:`),
                                    message.code(pattern.node)
                                );
                            }
                            for(const v of pattern.variables) {
                                if(v.name === null) { continue; }
                                if(branch.patterns[0].variables.some(e => e.name === v.name)) { continue; }
                                throw message.from(
                                    message.error("'match'-pattern has partially defined variables"),
                                    message.note(`'${v.name}' is defined in this pattern:`),
                                    message.code(pattern.node),
                                    message.note(`...but not in this pattern:`),
                                    message.code(branch.patterns[0].node)
                                );
                            }
                        }
                        state.enterScope();
                        for(const pattern of branch.patterns) {
                            for(const variable of pattern.variables) {
                                if(variable.name === null) { continue; }
                                const vars = state.scope().variables;
                                if(vars[variable.name] !== undefined) {
                                    assertTypesEqual(
                                        vars[variable.name].type, variable.type, node
                                    );
                                }
                                vars[variable.name] = {
                                    type: variable.type, isMutable: false, node: nodeAsSource(node)
                                };
                            }
                        }
                        for(const statement of branch.body) {
                            checkTypes(statement, state);
                        }
                        allReturn &= state.exitScope();
                    }
                    const possibleVals = patternValuesOf(matched, state);
                    let allHandled = true;
                    for(const val of possibleVals) {
                        let handled = false;
                        for(const branch of node.branches) {
                            for(const pattern of branch.patterns) {
                                handled |= patternHandlesValue(pattern, [], val, state);
                                if(handled) { break; }
                            }
                            if(handled) { break; }
                        }
                        if(handled) { continue; }
                        const dVal = displayPatternValue(val, state);
                        state.messages.push(message.from(
                            message.warning(`'match' does not handle ${dVal}`),
                            message.code(node),
                            message.note("Add a default branch by using '_' to capture all other values")
                        ));
                        allHandled = false;
                    }
                    state.scope().alwaysReturns |= (allReturn && allHandled);
                    return null;
                }

                case NodeType.Function:
                case NodeType.Structure:
                case NodeType.StructureInit:
                case NodeType.EnumerationInit:
                case NodeType.Enumeration:
                case NodeType.Module:
                case NodeType.Usage:
                    return node.valueType;
            }
            throw message.internalError(`Unhandled node type ${node.type} in 'checkTypes'`);
        };
        let valueType = check();
        if(valueType === null) { 
            valueType = { type: Type.Unit, node: nodeAsSource(node) };
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



    // Codegen 

    const runtime = `

// Generated by the Quill compiler from Quill source code.
// Check https://github.com/schwalbe-t/quill for more details.
    
function quill$$eq(a, b) {
    if(typeof a !== typeof b) { return false; }
    if(typeof a !== "object") { return a === b; }
    for(const a_prop in a) {
        if(!Object.hasOwn(b, a_prop)) { continue; }
    }
    for(const b_prop in b) {
        if(!Object.hasOwn(a, b_prop)) { return false; }
    }
    for(const prop in a) {
        if(!quill$$eq(a[prop], b[prop])) { return false; }
    }
    return true;
}
    \n`;

    function createGeneratorState(checker) {
        return {
            checker,
            nextVarNumber: 0,
            nextMatchedNumber: 0,
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

            allocName: function() {
                const i = this.nextVarNumber;
                this.nextVarNumber += 1;
                return `local${i}`;
            },
            alloc: function() {
                const scope = this.scope();
                const variable = this.allocName();
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
                const s = state.checker.symbols[node.fullPath];
                if(!node.fullPath) {
                    throw message.from(
                        message.error(`Path missing on AST node`),
                        message.code(node)
                    );
                }
                let r = manglePath(node.fullPath);
                if(s.node.type === NodeType.Function) {
                    const inst = s.instances[node.instanceKey];
                    if(!inst) {
                        throw message.from(
                            message.error(`Instance ${node.instanceKey} of ${node.fullPath} not found`),
                            message.code(node)
                        );
                    }
                    r += `$$${inst.instanceI}`;
                }
                if(into === null) { return r; }
                state.scope().output += `${into} = ${r};\n`
                return into;
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
            case NodeType.StringLiteral: {
                const out = intoOrAlloc();
                state.scope().output += `${out} = ${JSON.stringify(node.value)};\n`;
                return out;
            }
            case NodeType.FunctionLiteral: {
                state.enterScope();
                const args = node.args
                    .map((n, i) => {
                        const name = state.allocName();
                        state.scope().aliases[n.name] = name;
                        return name;
                    })
                    .join(", ");
                node.body.forEach(n => generateCode(n, state));
                const body = state.scope().output;
                const vars = state.exitScope();
                const out = intoOrAlloc();
                state.scope().output 
                    += `${out} = (${args}) => {\n`
                    + `${vars}${body}`
                    + `}\n`;
                return out;
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
                const r = `${accessed}.${node.name}`;
                if(into === null) { return r; }
                state.scope().output += `${into} = ${r};\n`
                return into;
            }
            case NodeType.Call: {
                const called = generateCode(node.called, state);
                const args = node.args
                    .map(n => generateCode(n, state))
                    .join(", ");
                const out = intoOrAlloc();
                state.scope().output += `${out} = ${called}(${args});\n`;
                return out;
            }
            case NodeType.StructureInit: {
                const struct = state.checker.symbols[node.fullPath];
                const args = node.args.map(n => generateCode(n, state));
                const out = intoOrAlloc();
                state.scope().output += `${out} = {`;
                for(const memberI in args) {
                    const name = struct.node.members[memberI].name;
                    if(memberI > 0) { state.scope().output += ","; }
                    state.scope().output += ` ${name}: ${args[memberI]}`;
                }
                state.scope().output += ` };\n`;
                return out;
            }
            case NodeType.EnumerationInit: {
                const value = generateCode(node.args[0], state);
                const out = intoOrAlloc();
                state.scope().output += `${out} = { tag: ${node.variant}, value: ${value} };\n`;
                return out;
            }
            case NodeType.IfExpr: {
                const cond = generateCode(node.cond, state);
                const out = intoOrAlloc();
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
                    const to = state.alloc();
                    const value = generateCode(node.value, state);
                    state.scope().output += `${to} = ${value};\n`;
                    state.scope().aliases[node.name] = to;
                }
                return null;
            }
            case NodeType.Assignment: {
                const to = generateCode(node.to, state);
                const value = generateCode(node.value, state);
                state.scope().output += `${to} = ${value};\n`;
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
                    const vars = branch.patterns[0].variables;
                    state.enterScope();
                    out += `const body${branchI} = (`;
                    let hadVar = false;
                    for(const varI in vars) {
                        const name = vars[varI].name;
                        if(name === null) { continue; }
                        if(hadVar) { out += ", "; }
                        hadVar = true;
                        const matchI = state.nextMatchedNumber;
                        state.nextMatchedNumber += 1;
                        out += `matched${matchI}`;
                        state.scope().aliases[name] = `matched${matchI}`;
                    }
                    out += `) => {\n`;
                    branch.body.forEach(n => generateCode(n, state));
                    const body = state.scope().output;
                    out += state.exitScope();
                    out += `${body}return null;\n}\n`;
                }
                out += `let returned = null;\n`;
                let hadBranch = false;
                for(const branchI in node.branches) {
                    const branch = node.branches[branchI];
                    for(const pattern of branch.patterns) {
                        if(hadBranch) { out += `else `; }
                        hadBranch = true;
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
                        out += `if(`;
                        if(pattern.conditions === undefined) {
                            throw message.from(
                                message.error(`Branch [${branchI}] pattern conditions undefined`),
                                message.code(node)
                            );
                        }
                        if(pattern.conditions.length >= 1) {
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
                            
                        } else {
                            out += "true";
                        }
                        out += `) { returned = body${branchI}(`;
                        const vars = Object.keys(pattern.variables);
                        let hadVar = false;
                        for(const varI in vars) {
                            const name = pattern.variables[vars[varI]].name;
                            if(name === null) { continue; }
                            if(hadVar) { out += ", "; }
                            hadVar = true;
                            out += matched;
                            generatePath(pattern.variables[vars[varI]].path);
                        }
                        out += `); }\n`;
                    }
                }
                state.scope().output += out + `if(returned !== null) { return returned; }\n}\n`;
                return null;
            }
            case NodeType.Function:
            case NodeType.Module:
            case NodeType.Usage:
            case NodeType.Structure:
            case NodeType.Enumeration:
            case NodeType.PipedCall:
                return null;
        }
        throw message.internalError(`Unhandled node type ${node.type} in 'generateCode'`);
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
            switch(node.type) {
                case NodeType.Structure:
                case NodeType.Enumeration:
                case NodeType.Variable:
                    break;
                case NodeType.Function: {
                    const s = state.checker.symbols[node.fullPath];
                    for(const instanceKey in s.instances) {
                        const inst = s.instances[instanceKey];
                        let args = null;
                        let impl = null;
                        if(node.isExternal) {
                            args = node.args.map(a => a.name).join(", ");
                            impl = node.body;
                        } else {
                            state.enterScope();
                            args = node.args
                                .map(a => {
                                    const name = state.allocName();
                                    state.scope().aliases[a.name] = name;
                                    return (a.isVarC? "..." : "") + name;
                                })
                                .join(", ");
                            inst.checkedBody
                                .forEach(n => generateCode(n, state));
                            const body = state.scope().output;
                            const vars = state.exitScope();
                            impl = "\n" + vars + body;
                        }
                        state.scope().output
                            += `function ${manglePath(node.fullPath)}`
                            + `$$${inst.instanceI}`
                            + `(${args}) {`
                            + impl
                            + `}\n`;
                    }
                    break;
                }
            }
        }
        const body = state.scope().output;
        const vars = state.exitScope();
        return vars + body;   
    }
    


    // Driver

    function compile(sources) {
        const hasError = errors => errors.some(e => message.isError(e));
        const makeError = errors => {
            return { success: false, messages: errors, code: null };
        };
        const makeSuccess = (errors, code) => {
            return { success: true, messages: errors, code };
        };
        let errors = [];
        let code = runtime;
        const checker = createCheckerState(errors);
        let nodes = {};
        // tokenizing, parsing and symbol name collection
        for(const path in sources) {
            const text = sources[path];
            if(text.length == 0) { continue; }
            const tokens = tokenize(text, path, errors);
            const parser = createParserState(tokens);
            try {
                const statements = parseStatementList(parser, true);
                nodes[path] = statements;
                collectSymbolNames(statements, checker);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        if(hasError(errors)) { return makeError(errors); }
        // collect full symbol info
        for(const path in nodes) {
            const statements = nodes[path];
            checker.reset();
            try {
                collectSymbols(statements, checker);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        if(hasError(errors)) { return makeError(errors); }
        // check symbols fully
        checker.reset();
        try {
            checkBaseSymbols(checker);
        } catch(error) {
            if(error.sections === undefined) { throw error; }
            errors.push(error);
        }
        if(hasError(errors)) { return makeError(errors); }
        // code generation
        const generator = createGeneratorState(checker);
        for(const path in nodes) {
            const statements = nodes[path];
            try {
                code += generateVariables(statements, generator);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        for(const path in nodes) {
            const statements = nodes[path];
            try {
                code += generateSymbols(statements, generator);
            } catch(error) {
                if(error.sections === undefined) { throw error; }
                errors.push(error);
            }
        }
        if(hasError(errors)) { return makeError(errors); }
        return makeSuccess(errors, code);
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
