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
const stmt = (slice, fn_ind) => reflex.stmt(slice, fn_ind)
const stmtblock = (slice, ind) => reflex.stmtblock(slice, ind)


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
// used in expansion
const rest = $process($and($symbols("..."), prima)

    , result => {
        return { type: SYNTAX.rest, body: result[1] }
    })
const array_literal = $process($and(
    $token(SIGN.BRACKET, "["),
    $separate(prima, $symbol(","), { once: true, auto_unfold: false }),
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
//prima without range itself
const range_literal = $process($and($or(
    $type(SIGN.IDENTIFIER),
    $type(SIGN.NUMBER),
    $type(SIGN.STRING),
    braced_prima,
    tuple_literal,
    array_literal,
    object_literal, __,
), $symbol("."), $symbol("."), expression)
    , result => {
        return { type: SYNTAX.range, start: result[0], end: result[3] }
    }
)
reflex.prima = $or(
    range_literal,
    $type(SIGN.IDENTIFIER),
    $type(SIGN.NUMBER),
    $type(SIGN.STRING),
    braced_prima,
    tuple_literal,
    array_literal,
    object_literal,
    __,
)

const chain = $process($and(
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
                if (i[0].value === ".")
                    return { type: i[0]?.value, value: i[1].value }
                if (i[0].value === "[")
                    return { type: i[0]?.value, value: i[1] }
                if (i[0].value === "(") {
                    return { type: i[0]?.value, value: i[1][0][0] }
                }
                else return i;
            })
            results = todo;
            return {
                type: "chain", value: [result[0], ...results]
            }
        }
    }
)

const unary = $process($and(
    $maybe($or($symbol("~"), $symbol("&"), $symbol("-"),)),
    chain),
    result => {

        return isFalsy(result[0]) ? result[1] : { type: "unary", prefix: result[0].map(p => p.value), value: result[1] }
    },

)


const multi = $process($and(
    unary, $maybe($and($symbol("*"), unary))
), result => {
    return isFalsy(result[1]) ? result[0] :
        {
            type: "multi",
            value: [result[0], ...result[1].map(
                i => 0 || {
                    op: i[0].value, value: i[1]
                })]
        }
})

const binary = $process($and(
    multi, $maybe($and($symbol("+"), multi))
), result => {
    return isFalsy(result[1]) ? result[0] : { type: "binary", value: [result[0], ...result[1].map(i => 0 || { op: i[0].value, value: i[1] })] }
})
const _compare_body = $and(
    binary,
    $or($bracket("<"), $bracket(">"), $symbol("=")),
    binary)
const comparison = $process($or(_compare_body, binary),
    result => {
        //just a binary
        if (isFalsy(result[1])) return result;
        else {
            return {
                type: SYNTAX.comparison, left: result[0], op: result[1].value, right: result[2]
            }
        }
    })



reflex.expression = $or(comparison,)

///////////////////////////////////////////////////
const equal_indent_block = $process($and($symbol(":"), $maybe($indent()), (slice, swc) => {
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

    , result => result[1] ? { type:SYNTAX.block, value: result[2] } : Fail)
reflex.stmtblock =$process( $and(
    $bracket("{"),
    $separate(stmt,
        $or($type(SIGN.SEMI), $type(SIGN.INDENT)), { once: true ,auto_unfold:false}),
    $bracket("}")),
result=>0||{type:SYNTAX.block, value:result[1]}
)
const singlestmt = $process($and(stmt, $or($type(SIGN.SEMI), $type(SIGN.INDENT))), result => [result[0]])

const _stmts = $or(stmtblock, equal_indent_block, singlestmt)
///////////////////////////////////////////////

const control = $process($and(
    $or($kw("if"), $kw("while"), $kw("for")),
    $or($and(
        LR,
        $separate(stmt, $type(SIGN.SEMI), { once: true, auto_unfold: false }),
        RR),
        _compare_body
    ),
    _stmts
),
    result => {
        let condition;
        if (result[1][1].type == SIGN.SYMBOL) {
            condition = { type: SYNTAX.comparison, left: result[1][0], right: result[1][2], op: result[1][1].value }
        } else {
            //result[2].type == "comparison"
            condition = result[1][1]
        }
        return { type: result[0].value, condition, body: result[2] }
    })



const jumpstmt = $process($and($or($kw("break"), $kw("continue"), $kw("return")), $or(stmt, $indent()))
    , result => {
        return { type: SYNTAX[result[0].value], body: result[1] }
    })
const assignstmt = $process($and($kw("let"), $type(SIGN.IDENTIFIER), $symbol("="), expression),result=>{
    return { type: SYNTAX.let, name: result[1].value, value: result[3] }
})
//don't hurry of this expression, it's a little bit complex
const iterstmt = $and(array_literal,
    $token(SIGN.BRACKET, "{"),
    $maybe(expression),
    $token(SIGN.BRACKET, "}"))

const fndecl = $process($and(
    $kw("fn"),
    $type(SIGN.IDENTIFIER),
    LR,
    $maybe(
        $separate(
            $and(
                $type(SIGN.IDENTIFIER),$maybe(typemark)), 
                $symbol(","), { once: true })
            ),
    RR,
    _stmts

), result => {
    return { type: SYNTAX.fn_def, name: result[1].value, args: isFalsy(result[3]) ? false : result[3][0], body: result[5] }
})
reflex.stmt = $or(
    control, iterstmt, assignstmt, jumpstmt, expression, fndecl
)

jlog($maybe(stmt)(tn("let a=23"),1))
console.log("finished")