import { tk } from "./tokenize.js"
import {
    $and, $or, $maybe, $separate, $req,
    $kw, $token, $symbol, $type, $process, $indent,
    $bracket,
    $symbols,

} from './parser.js'
import { jlog, SIGN, SYNTAX, Fail, slice_by_iter, isTruthy, isFalsy, assert_truthy, assert_falsy } from "./util.js"
const tokenize = source => slice_by_iter(tk(source))
const tn = tokenize


//fn_ind:0:default tokens


//some frequent token
const __ = $token(SIGN.IDENTIFIER, "_")
const comma = $symbol(",")
const LR = $bracket("(")
const RR = $bracket(")")
//
// used for reflex,thou it causes some performance loss, but it's the only way?
const reflex = {}
const prima = (slice, swc) => reflex.prima(slice, swc)
const expression = (slice, swc) => reflex.expression(slice, swc)
const stmt = slice => reflex.stmt(slice)
const stmtblock = slice => reflex.stmtblock(slice)


const typemark = $process($and($symbol(":"), $maybe($type(SIGN.IDENTIFIER)))
    , result => {
        return { type: SYNTAX.typemark, value: result[1][0].value }
    })

let tuple_literal = $process($and(
    $token(SIGN.BRACKET, "("),
    $separate(prima, $symbol(","), { once: false, auto_unfold: false }),
    $token(SIGN.BRACKET, ")")),
    result => {
        return { type: SYNTAX.tuple, body: result.slice(1, -1)[0] }
    })
const rest = $and($symbols("..."), expression)
const array_literal = $process($and(
    $token(SIGN.BRACKET, "["),
    $separate(prima, $symbol(","), { once: true, auto_unfold: false }),
    $maybe(rest),
    $token(SIGN.BRACKET, "]")), result => {
        return { type: SYNTAX.array, body: result.slice(1, -1) }
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
            type: SYNTAX.object, body: result[1].map(
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
    $maybe($or($symbol("~"), $symbol("&"), $symbol("-"),)),
    chain),
    result => {
        return isFalsy(result[0]) ? result[1] : { type: "unary", prefix: result[0].map(p => p.value), value: result[1] }
    }
)


const multi = slice => reflex.multi(slice)
reflex.multi = $process($and(
    unary, $maybe($and($symbol("*"), unary))
), result => {
    return isFalsy(result[1]) ? result[0] : { type: "multi", value: [result[0], ...result[1].map(i => 0 || { op: i[0].value, value: i[1] })] }
})

const binary = slice => reflex.binary(slice)
reflex.binary = $process($and(
    multi, $maybe($and($symbol("+"), multi))
), result => {
    return isFalsy(result[1]) ? result[0] : { type: "binary", value: [result[0], ...result[1].map(i => 0 || { op: i[0].value, value: i[1] })] }
})
const comparison = $or(
    $and(
        binary,
        $or($bracket("<"), $bracket(">"), $symbol("=")),
        binary),
    binary,)

const expand = $and(prima, $symbol("."), $symbol("."), expression)

reflex.expression = $or(rest, expand, comparison,)

///////////////////////////////////////////////////
const equal_indent_block = $and($symbol(":"), $maybe($indent()),(slice, swc) => {
    let results = []
    let fnOrSep = 0;
    let fn = stmt;
    let indent = undefined;
    let separator = $or($token(SIGN.SEMI), $type(SIGN.INDENT))

    let result = (fnOrSep ? separator : fn)(slice, swc);
    if (isFalsy(result)) return Fail;
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
    if (results.length == 1) return [true, gap, results[0]]

    if (results.length <= 0) return Fail
    return [true, gap, results];
})
reflex.stmtblock = $and(
    $bracket("{"),
    $separate(stmt,
        $or($type(SIGN.SEMI), $type(SIGN.INDENT)), { once: true }),
    $bracket("}"))
const singlestmt = $and(stmt, $or($type(SIGN.SEMI), $type(SIGN.INDENT)))

const _stmts=$or(stmtblock, equal_indent_block, singlestmt)
///////////////////////////////////////////////

const control = $and(
    $or($kw("if"), $kw("while"), $kw("for")),
    $token(SIGN.BRACKET, "("), $separate(stmt, $type(SIGN.SEMI), { once: true }), $token(SIGN.BRACKET, ")"),
    _stmts
)

const assignstmt = $and($kw( "let"), $type(SIGN.IDENTIFIER), $symbol("="), expression)
const iterstmt = $and(array_literal,
    $token(SIGN.BRACKET, "{"),
    $maybe(expression),
    $token(SIGN.BRACKET, "}"))

const jumpstmt = $and($or($kw("break"), $kw("continue"), $kw("return")), $or(_stmts,$indent()))


const fndecl = $and(
    $kw("fn"),
    $type(SIGN.IDENTIFIER),
    LR,
    $maybe($separate($and($type(SIGN.IDENTIFIER), $maybe(typemark)), $symbol(","), { once: true })),
    RR,
    _stmts

)
reflex.stmt = $or(
    control, iterstmt, assignstmt, jumpstmt, expression,fndecl
)
jlog(fndecl(tn(`fn a():a
    b
    b`)))

console.log("finished")