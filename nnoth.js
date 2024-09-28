
import {
    $and, $or, $maybe, $separate,
    $kw, $token, $symbol, $type, $process as $branch, $indent,
    $bracket,
    $symbols,
} from './parser_builder.js'
import { TT, SYNTAX, Fail, isTruthy, isFalsy, } from "./util.js"

//some frequent token
const __ = $token(TT.IDENTIFIER, "_")
const comma = $symbol(",")
const LR = $bracket("(")
const RR = $bracket(")")
const LB = $bracket("[")
const RB = $bracket("]")
const LC = $bracket("{")
const RC = $bracket("}")
const LS = $bracket("<")
const RS = $bracket(">")
const Enter = $maybe($indent())
const ___ = Enter;
//

// used for reflex, causes some performance loss. but it's the only way?
const reflex = {}
export const prima = (slice, swc) => reflex.prima(slice, swc)
export const expression = (slice, swc) => reflex.expression(slice, swc)
export const stmt = (slice, fn_ind) => reflex.stmt(slice, fn_ind)
export const stmtblock = (slice, ind) => reflex.stmtblock(slice, ind)
export const rest = (slice, swc) => reflex.rest(slice, swc)
export const _stmts = (slice, ind) => reflex._stmts(slice, ind)
export const equal_indent_block = (slice, swc) => reflex.equal_indent_block(slice, swc);

const typemark = $branch($and($symbol(":"), $maybe($type(TT.IDENTIFIER)))
    , result => {
        return { type: SYNTAX.typemark, value: result[1][0].value }
    })
export const signal = $type(TT.ATOM)
export const atom = signal;

export let tuple_literal = $branch($and(
    LR,
    $separate($or(rest, prima), comma, { once: false, auto_unfold: false }),
    RR),
    result => {
        return { type: SYNTAX.tuple, body: result.slice(1, -1)[0] }
    })
// used in expansion

const array_literal = $branch($and(
    LB,
    $separate($or(rest, prima), $symbol(","), { once: true, auto_unfold: false }),
    RB), result => {
        return { type: SYNTAX.array, body: result.slice(1, -1) }
    })

const record_literal = $branch(
    $and(
        $token(TT.BRACKET, "{"),
        $separate(
            $and($or($type(TT.IDENTIFIER), signal),
                $maybe(typemark), $symbol("="), expression), $symbol(","), { once: true, auto_unfold: false }),
        $token(TT.BRACKET, "}")),
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
reflex.rest = $branch($and($symbols("..."), $or(tuple_literal, array_literal, record_literal))
    , result => {
        return { type: SYNTAX.rest, body: result[1] }
    })
const braced_prima = $branch($and(
    $token(TT.BRACKET, "("),
    expression,
    $token(TT.BRACKET, ")")), result => {
        return result.slice(1, -1)[0]
    }
)
//prima without range itself
export const range_literal = $branch($and($or(
    $type(TT.IDENTIFIER),
    $type(TT.NUMBER),
    $type(TT.STRING),
    braced_prima,
    tuple_literal,
    array_literal,
    record_literal, __,
), $symbol("."), $symbol("."), expression)
    , result => {
        return { type: SYNTAX.range, start: result[0], end: result[3] }
    }
)
reflex.prima = $or(
    range_literal,
    $type(TT.IDENTIFIER),
    $type(TT.NUMBER),
    $type(TT.STRING),
    braced_prima,
    tuple_literal,
    array_literal,
    record_literal,
    __,
)
export const pipe = $branch(
    $and(
        tuple_literal, $maybe($and($symbol("-"), RS, prima)))
    , result => {
        return { type: "pip", body: result[0], next: result[1] };
    })
const chain = $branch($and(
    prima, $maybe($or(
        $and($symbol("."), prima),
        $and($token(TT.BRACKET, "["), prima, $token(TT.BRACKET, "]")),
        $and($token(TT.BRACKET, "("),
            $maybe($separate(expression, comma, { once: true, auto_unfold: false })),
            $token(TT.BRACKET, ")"))
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

const unary = $branch($and(
    $maybe($or($symbol("~"), $symbol("&"), $symbol("-"),)),
    chain),
    result => {

        return isFalsy(result[0]) ? result[1] : { type: "unary", prefix: result[0].map(p => p.value), value: result[1] }
    },

)


const multi = $branch($and(
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

const binary = $branch($and(
    multi, $maybe($and($symbol("+"), multi))
), result => {
    return isFalsy(result[1]) ? result[0] : { type: "binary", value: [result[0], ...result[1].map(i => 0 || { op: i[0].value, value: i[1] })] }
})
const _compare_body = $and(
    binary,
    $or($bracket("<"), $bracket(">"), $symbol("=")),
    binary)
export const comparison = $branch($or(_compare_body, binary),
    result => {
        //just a binary
        if (isFalsy(result[1])) return result;
        else {
            return {
                type: SYNTAX.comparison, left: result[0], op: result[1].value, right: result[2]
            }
        }
    })

export const closure = $branch($or(
    $and(
        $symbol("|"), $separate(expression, $symbol(","), { once: true, auto_unfold: false }), $symbol("|"), _stmts
    ),
    $and(LR, $separate(expression, $symbol(","), { once: true, auto_unfold: false }), RR, $symbol("="), RS, _stmts),
    $and($kw("lambda"), $separate(expression, $symbol(","), { once: true, auto_unfold: false })
        , equal_indent_block)))

reflex.expression = $or(comparison, closure);

//------------------------------------------------------------------------------------------
reflex.equal_indent_block = $branch($and($symbol(":"), $maybe($indent()),
    (slice, swc) => {
        let results = []
        let fnOrSep = 0;
        let fn = stmt;
        let indent = undefined;
        let separator = $or($token(TT.SEMI), $type(TT.INDENT))

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

    ,
    result => result[1] ? { type: SYNTAX.block, value: result[2] } : Fail)


reflex.stmtblock = $branch($and(
    LC,
    $separate(stmt,
        $or($type(TT.SEMI), $type(TT.INDENT)), { once: true, auto_unfold: false }),
    RC),
    result => 0 || { type: SYNTAX.block, value: result[1] }
)
export const singlestmt = $branch($and(stmt, $or($type(TT.SEMI), $type(TT.INDENT))), result => [result[0]])

reflex._stmts = $or(stmtblock, equal_indent_block, singlestmt)

//-------------------------------------------------------------
const class_def_head = $kw("of")
const class_def_pair = $and($or($type(TT.IDENTIFIER), $type(TT.ATOM)), $symbol(":"), expression)
export const class_def = $branch($and(
    $kw("class"), $maybe(class_def_head), LC, $separate($or(class_def_pair, $symbol(","), { once: true, auto_unfold: false }), RC, _stmts
    )))
///////////////////////////////////////////////

export const control = $branch($and(
    $or($kw("if"), $kw("while"), $kw("for")),
    $or($and(
        LR,
        $separate(stmt, $type(TT.SEMI), { once: true, auto_unfold: false }),
        RR),
        _compare_body
    ),
    _stmts
),
    result => {
        let condition;
        if (result[1][1].type == TT.SYMBOL) {
            condition = { type: SYNTAX.comparison, left: result[1][0], right: result[1][2], op: result[1][1].value }
        } else {
            //result[2].type == "comparison"
            condition = result[1][1]
        }
        return { type: result[0].value, condition, body: result[2] }
    })



const jumpstmt = $branch($and($or($kw("break"), $kw("continue"), $kw("return")), $or(stmt, $indent()))
    , result => {
        return { type: SYNTAX[result[0].value], body: result[1] }
    })
const assignleft = $or($type(TT.IDENTIFIER), signal, tuple_literal, array_literal, record_literal)
const assignstmt = $branch($and($kw("let"), assignleft, $symbol("="), expression), result => {
    return { type: SYNTAX.let, name: result[1].value, value: result[3] }
})
//don't hurry of this expression, it's a little bit complex
const iterstmt = $and(array_literal,
    $token(TT.BRACKET, "{"),
    $maybe(expression),
    $token(TT.BRACKET, "}"))

export const fndecl = $branch($and(
    $or($kw("fn"), $kw("def"), $kw("function"), $kw("method"), $kw("func")),
    $or($type(TT.IDENTIFIER), $type(TT.ATOM)),
    LR,
    $maybe(
        $separate(
            $and(
                $type(TT.IDENTIFIER), $maybe(typemark)),
            $symbol(","), { once: true })
    ),
    RR,
    _stmts

), result => {
    //decl: single stmt. defi: stmt blocks
    //yet some complex functions may need separate decl and defi?
    return { type: SYNTAX.fn_def, name: result[1].value, args: isFalsy(result[3]) ? false : result[3][0], body: result[5] }
})
reflex.stmt = $or(
    fndecl, control, iterstmt, assignstmt, jumpstmt, expression, $and($type(TT.SEMI), $maybe($type(TT.SEMI)))
)
export const program = $separate(stmt, $or($type(TT.SEMI), $type(TT.INDENT)), { once: true, auto_unfold: false })