
/*

record Cat(name: str, age: int, hunger: float)
union Option<T>(Some: T, None: unit)
enum Role(Guest, User, Moderator, Admin)

fun add<T>(a: T, b: T) -> T {
    return a + b
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
        "ArrowRight",
        "DoubleAmpersand",
        "DoublePipe",

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

        "KeywordIf",
        "KeywordElse",
        "KeywordFun",
        "KeywordReturn",
        "KeywordVal",
        "KeywordMut",

        "End"
    );

    const fixedTokens = Object.freeze({
        "<=": TokenType.LessThanEqual,
        ">=": TokenType.GreaterThanEqual,
        "==": TokenType.DoubleEqual,
        "->": TokenType.ArrowRight,
        "&&": TokenType.DoubleAmpersand,
        "||": TokenType.DoublePipe,

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

        "if": TokenType.KeywordIf,
        "else": TokenType.KeywordElse,
        "fun": TokenType.KeywordFun,
        "return": TokenType.KeywordReturn,
        "val": TokenType.KeywordVal,
        "mut": TokenType.KeywordMut,

        "true": TokenType.BoolLiteral,
        "false": TokenType.BoolLiteral,
        "unit": TokenType.UnitLiteral
    });

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

    function tokenize(text, path) {
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
            if(isAlphabetic(text[i])) {
                const start = i;
                skipWhile(isAlphanumeric);
                output.push(tokenFrom(
                    TokenType.Identifier, text.substring(start, i),
                    path, start, i
                ));
                continue;
            }
            throw `Unrecognized character: '${text[i]}'`;
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
                this.reportUnexpected();
            },
            reportUnexpected: function() {
                if(this.curr().type == TokenType.End) {
                    throw `Unexpected end of file`;
                }
                throw `Unexpected token: ${this.curr().content}`;
            }
        };
    }

    const binaryOpPrec = Object.freeze({
        "(": 2,
        "*": 3, "/": 3,
        "+": 4, "-": 4, 
        "<": 5, ">": 5, "<=": 5, ">=": 5,
        "==": 6, "!=": 6,
        "&&": 7, 
        "||": 8
    });

    const unaryOpPrec = Object.freeze({
        "-": 2, "!": 2
    });

    const NodeType = makeEnum(
        "Identifier",
        "IntLiteral",
        "FloatLiteral",
        "BoolLiteral",
        "UnitLiteral",
    
        "Multiplicative",
        "Additive",
        "Comparative",
        "Call",
        "IfExpr",

        "Variable",
        "Assignment",
        "Return",
        "If",

        "Function"
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

    function valueNodeFrom(type, value, token) {
        return {
            type, value: value,
            path: token.path, start: token.start, end: token.end
        };
    }

    function parseValue(state) {
        const start = state.curr();
        const value = start.content;
        switch(state.curr().type) {
            case TokenType.Identifier: {
                state.next();
                return valueNodeFrom(NodeType.Identifier, value, start);
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
        state.reportUnexpected();
    }

    function parseExpression(state, precedence = Infinity) {
        let collected = parseValue(state);
        for(;;) {
            const currPrec = binaryOpPrec[state.curr().content];
            if(currPrec === undefined) { return collected; }
            if(currPrec >= precedence) { return collected; }
            if(state.curr().type == TokenType.ParenOpen) {
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
                const token = state.curr().type;
                state.next();
                return {
                    type: NodeType.Identifier, value: token.content,
                    path: token.path, start: token.start, end: token.end
                };
            }
        }
        state.reportUnexpected();
    }

    function parseArgumentList(state) {
        state.assertType(TokenType.ParenOpen);
        state.next();
        let args = [];
        while(state.curr().type == TokenType.Identifier) {
            const name = state.curr().content;
            state.next();
            state.assertType(TokenType.Colon);
            state.next();
            const type = parseType(state);
            args.push({ name, type });
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
                throw `Top-level expression used in local scope`;
            }
            if(!tl && topLevel) {
                throw `Local expression used in top-level scope`;
            }
        };
        switch(state.curr().type) {
            case TokenType.KeywordFun: {
                assertTopLevel(true);
                const start = state.curr();
                state.next();
                state.assertType(TokenType.Identifier);
                const name = state.curr().content;
                state.next();
                const args = parseArgumentList(state);
                let returnType;
                if(state.curr().type == TokenType.ArrowRight) {
                    state.assertType(TokenType.ArrowRight);
                    state.next();
                    returnType = parseType(state);
                } else {
                    returnType = {
                        type: NodeType.Identifier, value: "unit",
                        path: start.path, start: start.start, end: start.end
                    };
                }
                let body;
                let end;
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
                return {
                    type: NodeType.Function, name, args, body,
                    path: start.path, start: start.start, end
                };
            }
            case TokenType.KeywordReturn: {
                const start = state.curr();
                state.next();
                const value = parseExpression(state);
                return {
                    type: NodeType.Return, value,
                    path: start.path, start: start.start, end: value.end
                };
            }
            case TokenType.KeywordVal:
            case TokenType.KeywordMut: {
                const start = state.curr();
                const isMutable = state.curr().type 
                    == TokenType.KeywordMut;
                state.next();
                state.assertType(TokenType.Identifier);
                const name = state.curr().content;
                state.next();
                state.assertType(TokenType.Equal);
                state.next();
                const value = parseExpression(state);
                return {
                    type: NodeType.Variable, isMutable, name, value,
                    path: start.path, start: start.start, end: value.end
                };
            }
            case TokenType.KeywordIf: {
                assertTopLevel(false);
                const start = state.curr();
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



    // Codegen 

    function createGeneratorState() {
        return {
            nextVarNumber: 0,
            scopes: [],

            enterScope: function() {
                this.scopes.push({
                    aliases: {},
                    variables: [],
                    output: ""
                });
            },
            scope: function() {
                return this.scopes.at(-1);
            },
            exitScope: function() {
                const scope = this.scope();
                let vars = "";
                for(const variable of scope.variables) {
                    vars += `let ${variable};\n`;
                }
                this.scopes.pop();
                return vars;
            },
            alloc: function() {
                const i = this.nextVarNumber;
                this.nextVarNumber += 1;
                const scope = this.scope();
                const variable = `local${i}`;
                scope.variables.push(variable);
                return variable;
            }
        };
    }

    function generateCode(node, state, into = null) {
        const into_or_alloc = () => into === null? state.alloc() : into;
        switch(node.type) {
            case NodeType.Identifier: {
                for(let i = state.scopes.length - 1; i >= 0; i -= 1) {
                    const scope = state.scopes[i];
                    if(!Object.hasOwn(scope.aliases, node.value)) { continue; }
                    const value = scope.aliases[node.value];
                    if(into === null) { return value; }
                    state.scope().output += `${into} = ${value};\n`;
                    return into;
                }
                // FALL THROUGH
            }
            case NodeType.IntLiteral:
            case NodeType.FloatLiteral: {
                const out = into_or_alloc();
                state.scope().output += `${out} = ${node.value};\n`;
                return out;
            }
            case NodeType.Multiplicative:
            case NodeType.Additive:
            case NodeType.Comparative: {
                const lhs = generateCode(node.lhs, state);
                const rhs = generateCode(node.rhs, state);
                const out = into_or_alloc();
                state.scope().output += `${out} = ${lhs} ${node.op} ${rhs};\n`;
                return out;
            }
            case NodeType.Call: {
                const called = generateCode(node.called, state);
                const args = node.args
                    .map(n => generateCode(n, state))
                    .join(", ");
                const out = into_or_alloc();
                state.scope().output += `${out} = ${called}(${args});\n`;
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
                const value = generateCode(node.value, state);
                state.scope().aliases[node.name] = value;
                return null;
            }
            case NodeType.Assignment: {
                const to = generateCode(node.to, state);
                const value = generateCode(node.value, state);
                state.scope().output += `${to} = ${value};\n`;
                return null;
            }
            case NodeType.Function: {
                state.enterScope();
                const args = node.args.map((n, i) => `param${i}`).join(", ");
                node.args.forEach((n, i) => {
                    state.scope().aliases[n.name] = `param${i}`;
                });
                node.body.forEach(n => generateCode(n, state));
                const body = state.scope().output;
                const vars = state.exitScope();
                state.scope().output += `function ${node.name}(${args}) {\n`
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
        }
        console.error("Unimplemented node type!");
        console.log(node);
        throw "";
    }

    function generateBlock(nodes, state) {
        state.enterScope();
        nodes.forEach(n => generateCode(n, state));
        const body = state.scope().output;
        const vars = state.exitScope();
        return vars + body;
    }
    


    // Driver

    function compile(sources) {
        let code = "";
        for(const path in sources) {
            const text = sources[path];
            if(text.length == 0) { continue; }
            const tokens = tokenize(text, path);
            const parser = createParserState(tokens);
            const statements = parseStatementList(parser, true);
            const generator = createGeneratorState();
            code += generateBlock(statements, generator);
        }
        return code;
    }

    return {
        TokenType, 
        isAlphabetic, isNumeric, isAlphanumeric, 
        tokenize,
        
        createParserState,
        parseValue, parseExpression, parseType, 
        parseArgumentList, parseStatement, parseStatementList,
        
        generateCode,

        compile
    };
})();

if(typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = quill;
} else {
    (typeof self !== 'undefined' ? self : this).quill = quill;
}