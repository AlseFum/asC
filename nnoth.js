import { tk } from "./tokenize.js"
import {
    isTruthy, isFalsy, collect,
    $and, $or, $maybe, $separate,
    $kw, $token, $symbol, $type, $process,$indent,
    $bracket,
    $symbols,
} from './parser.js'
import { jlog, SIGN, fail } from "./util.js"

// used for reflex,thou it causes some performance loss, but it's the only way?
const reflex = {}


const __ = $token(SIGN.IDENTIFIER, "_")
const comma = $symbol(",")

const prima = (slice, swc) => reflex.prima(slice, swc)
const expression = (slice, swc) => reflex.expression(slice, swc)

const typemark = $process($and($symbol(":"), $maybe($type(SIGN.IDENTIFIER)))
    , result => {
        return { type: "typemark", value: result[1][0].value }
    })

let tuple_literal = $process($and(
    $token(SIGN.BRACKET, "("),
    $separate(prima, $symbol(","), { once: false, auto_unfold: false }),
    $token(SIGN.BRACKET, ")")),
    result => {
        return { type: "tuple", body: result.slice(1, -1)[0] }
    })
const rest = $and($symbols("..."), expression)
const array_literal = $process($and(
    $token(SIGN.BRACKET, "["),
    $separate(prima, $symbol(","), { once: true, auto_unfold: false }),
    $maybe(rest),
    $token(SIGN.BRACKET, "]")), result => {
        return { type: "array", body: result.slice(1, -1) }
    })

const object_literal = $process(
    $and(
        $token(SIGN.BRACKET, "{"),
        $separate(
            $and($type(SIGN.IDENTIFIER),
                $maybe(typemark), $symbol("="), expression), $symbol(","), { once: true, auto_unfold: false }),
        $token(SIGN.BRACKET, "}")),
    result => {

        return {
            type: "object", body: result[1].map(
                i => {
                    return {
                        key: i[0]?.value
                        , type: i[1]?.[0]?.value ?? undefined
                        , value: i[3]
                    }
                })
        }
    })
const braced_prima = $process($and(
    $token(SIGN.BRACKET, "("),
    expression,
    $token(SIGN.BRACKET, ")")), result => {
        return result.slice(1, -1)[0]
    }
)
reflex.prima = $or(
    $type(SIGN.IDENTIFIER),
    $type(SIGN.NUMBER),
    $type(SIGN.STRING),
    braced_prima,
    tuple_literal,
    array_literal,
    object_literal, __,
)

const chain = slice => reflex.chain(slice)
//TODO
reflex.chain = $process($and(
    prima, $maybe($or(
        $and($symbol("."), prima),
        $and($token(SIGN.BRACKET, "["), prima, $token(SIGN.BRACKET, "]")),
        $and($token(SIGN.BRACKET, "("),
            $maybe($separate(expression, comma, { once: true, auto_unfold: false })),
            $token(SIGN.BRACKET, ")"))
    ))
)
    , result => {

        if (isFalsy(result[1])) return result[0];
        else {
            let results = []
            let todo = result[1].map(i => {
                return { type: i[0]?.value, value: i[1][0] }
            })
            results = todo;
            return {
                type: "chain", value: [result[0], ...results]
            }
        }
    }
)




const unary = slice => reflex.unary(slice);
reflex.unary = $process($and(
    $maybe($or(
        $symbol("~"),
        $symbol("&"),
        $symbol("-"),
    )),
    chain), result => {
        return isFalsy(result[0]) ? result[1] : { type: "unary", prefix: result[0].map(p => p.value), value: result[1] }
    }
)


const multi = slice => reflex.multi(slice)
reflex.multi = $process($and(
    unary, $maybe($and($symbol("*"), unary))
), result => {
    return isFalsy(result[1]) ? result[0] : { type: "multi", value: [result[0], ...result[1].map(i => 0 || { op: i[0].value, value: i[1] })] }
})
reflex.binary = $process($and(
    multi, $maybe($and($symbol("+"), multi))
), result => {
    return isFalsy(result[1]) ? result[0] : { type: "binary", value: [result[0], ...result[1].map(i => 0 || { op: i[0].value, value: i[1] })] }
})
const binary = slice => reflex.binary(slice)

const comparison = $or(
    $and(
        binary,
        $or($bracket("<"), $bracket(">"), $symbol("=")),
        binary),
    binary,)

const expand = $and(prima, $symbol("."), $symbol("."), expression)



reflex.expression = $or(rest, expand, comparison,)

const stmt = slice => reflex.stmt(slice)
const stmtblock = slice => reflex.stmtblock(slice)


const equal_indent_block = (slice, swc) => {
    let results = []
    let fnOrSep = 0;
    let fn = stmt;
    let indent = undefined;
    let separator = $or($token(SIGN.SEMI), $type(SIGN.INDENT))

    let result = (fnOrSep ? separator : fn)(slice, swc);
    if (isFalsy(result)) return fail;
    let gap = result[1];
    while (isTruthy(result) && gap <= slice.length) {
        if (fnOrSep == 0) results.push(result[2]); else {
            if (indent == undefined) indent = result[2].value;
            if (indent != result[2].value) break;
        }
        if (fnOrSep == 0) fnOrSep = 1; else fnOrSep = 0;
        result = (fnOrSep ? separator : fn)(slice.peek(gap), swc);
        gap += result[1];
    }
    //some times you can't leave a single separator like a + b +
    if (results.length == 1) return [true, gap, results[0]]

    if (results.length <= 0) return fail
    return [true, gap, results];
}
const control = $and(
    $or($kw("if"), $kw("while"), $kw("for")),
    $token(SIGN.BRACKET, "("), $separate(stmt, $type(SIGN.SEMI), { once: true }), $token(SIGN.BRACKET, ")"),
    $or(stmtblock, $and($symbol(":"), equal_indent_block))
)
const assignstmt=$and(chain, $symbol("="), expression)
const iterstmt = $and(array_literal,
    $token(SIGN.BRACKET, "{"),
    $maybe(expression),
    $token(SIGN.BRACKET, "}"))
reflex.stmt = $or(
    control, iterstmt,assignstmt, expression
)
const jumpstmt=$and($or($kw("break"),$kw("continue"),$kw("return")),$or($indent,expression))

reflex.stmtblock = $or(
    $and(stmt, $or($token(SIGN.SEMI), $type(SIGN.INDENT))),
    $and(
        $token(SIGN.BRACKET, "{"),
        $separate(stmt, $or($token(SIGN.SEMI), $type(SIGN.INDENT)),
            { once: true }),
        $token(SIGN.BRACKET, "}")
    ))
let equalindent1 = `d
    a
    e
b`
let equalindent2 = `d`
// jlog(equal_indent_block(collect(tk(equalindent1)), 0))
// jlog(equal_indent_block(collect(tk(equalindent2)), 0))

const fndecl = slice => reflex.fndecl(slice)
reflex.fndecl = $and(
    $kw("fn"),
    $type(SIGN.IDENTIFIER),
    $token(SIGN.BRACKET, "("),
    $maybe($separate($and($type(SIGN.IDENTIFIER), $maybe(typemark)), $symbol(","), { once: true })),
    $token(SIGN.BRACKET, ")"),
    $or(stmtblock, $and($symbol(":"), equal_indent_block))

)
//     ; (fndecl(collect(tk(`fn a():a
//     b
//     b
//     b
// c`)), 0))

// ;(object_literal(collect(tk("{a:sdf=1,b:=2}")), false))
// ;(prima(collect(tk(`(a)`)), 0))
// ;(unary(collect(tk(`~&~~(aesf)`)), 0))
// ;(binary(collect(tk(`aesf*34*23`)), 0))
// ;(stmt(collect(tk("2+{a=45}.a")),false))
jlog(jumpstmt(collect(tk("return a")), 0))
console.log("finished")