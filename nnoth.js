
import {
    $and, $or, $maybe, $separate,
    $kw, $token, $symbol, $type, $process as $branch, $indent, $bracket, $symbols,
} from './parser_builder.js'
import { TT, SYNTAX, Fail, isTruthy, isFalsy, } from "./util.js"

//#### some frequent token
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

export const varname = $type(TT.IDENTIFIER);
export const backtick = $type(TT.BACKTICK);
//atom is specified backtick
export const atom = backtick;

//#### used for reflex, causes some performance loss. but it's the only way?
const reflex = {}
export const prima = (slice, swc) => reflex.primitive(slice, swc)
export const expression = (slice, swc) => reflex.expression(slice, swc)
export const stmt = (slice, fn_ind) => reflex.stmt(slice, fn_ind)
export const stmtblock = (slice, ind) => reflex.block(slice, ind)
export const rest = (slice, swc) => reflex.rest(slice, swc)
export const _stmts = (slice, ind) => reflex._stmts(slice, ind)
export const typemark = (slice, swc) => reflex.typemark(slice, swc)
export const indent_block = (slice, swc) => reflex.indent_block(slice, swc);
export const typename = (slice, swc) => reflex.typename(slice, swc)
//#### inferior units
reflex.typename = $branch($and($type(TT.IDENTIFIER), $maybe($and(LS, $separate(typename, comma, { once: true }), RS))), result => { })
reflex.typemark = $branch($and($symbol(":"), $maybe(typename))
    , result => {
        return { type: SYNTAX.typemark, value: result[1][0].value }
    })

const pair_key = $or(atom, varname, $type(TT.STRING))
//#### primitives
export let tuple_literal = $branch($and(
    LR,
    $separate($or(rest, prima), comma, { auto_unfold: false }),
    RR),
    result => {
        return { type: SYNTAX.tuple, body: result.slice(1, -1)[0] }
    })


const array_literal = $branch($and(
    LB,
    $maybe($separate($or(rest, prima), $symbol(","), { once: true, auto_unfold: false, loose: true })),
    RB), result => {
        return { type: SYNTAX.array, body: result.slice(1, -1) }
    })

const record_literal = $branch(
    $and(
        LC,
        $separate(
            $and(pair_key, ___,
                $maybe(typemark), ___, $symbol("="), ___, expression),
            comma, { once: true, auto_unfold: false }),
        RC),
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
reflex.rest = $branch($and($symbols("..."), $or(varname, tuple_literal, array_literal, record_literal))
    , result => {
        return { type: SYNTAX.rest, body: result[1] }
    })
const braced_prima = $branch($and(
    LR, ___,
    expression, ___,
    RR), result => {
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
), ___, $symbols(".."), ___, expression)
    , result => {
        return { type: SYNTAX.range, start: result[0], end: result[3] }
    }
)
export let tuple_dir = $branch($and(
    LR, ___, $type(TT.IDENTIFIER), ___, $kw("for"), ___, $type(TT.IDENTIFIER), ___, $kw("in"), ___, range_literal, ___, $maybe($kw("if"), ___, expression, ___, $maybe($kw("else"), ___, expression)), RR
))
reflex.primitive = $or(
    range_literal,
    $type(TT.IDENTIFIER),
    $type(TT.NUMBER),
    $type(TT.STRING),
    braced_prima,
    tuple_literal,
    array_literal,
    record_literal, atom,
    __,
)
//#### flow
export const pipe = $branch(
    $and(tuple_literal, $maybe($and($symbol("-"), $bracket(">"), prima)))
)

export const chain = $branch($and(
    prima, $maybe($or(
        $and(___, $symbol("."), ___, varname),
        $and(___, LB, ___, prima, ___, RB),
        $and(LR,
            $maybe($separate(expression, comma, { once: true, auto_unfold: false, loose: true })),
            RR)
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
const unary_kw = ["typeof", "in"]
const unary = $branch($and(
    $maybe($or($symbol("~"), $symbol("&"), $symbol("-"), ...unary_kw.map(i => $kw(i)))), ___,
    chain),
    result => {
        return isFalsy(result[0]) ? result[1] : { type: "unary", prefix: result[0].map(p => p.value), value: result[1] }
    }
)
const backward_unary = $and(unary, $maybe($or($symbols("++"), $symbols("--"))))

const multi_kw = ["and", "or"]
const multi = $branch($and(
    backward_unary, $maybe($and(___, $or($symbol("*"), ...multi_kw.map(i => $kw(i))), ___, backward_unary))
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

const binary_kw = ["and", "or"]
const binary = $branch($and(
    multi, $maybe($and(___, $or($symbol("+"), ...binary_kw.map(i => $kw(i))), ___, multi))
))
//extracted
const _compare_body = $and(
    binary, ___,
    $or($bracket("<"), $bracket(">"), $symbol("=")), ___,
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

const assignleft = $or($type(TT.IDENTIFIER), atom, tuple_literal, array_literal, record_literal)
const assignstmt = $branch($and($kw("let"),___, assignleft,___, $symbol("="),___, expression), result => {
    return { type: SYNTAX.let, name: result[1].value, value: result[3] }
})
//#### class. Complicated
const class_def_head = $kw("of")
const class_def_pair = $and($or($type(TT.IDENTIFIER), $type(TT.ATOM)), $symbol(":"), expression)
export const class_def = $branch($and(
    $kw("class"), $maybe(class_def_head), LC, $separate($or(class_def_pair, $symbol(","), { once: true, auto_unfold: false }), RC, _stmts
    )))
//#### control

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

const _arrow = $and($symbol("="), RS)
export const closure = $branch($or(
    $and(
        $symbol("|"), $separate(expression, $symbol(","), { once: true, auto_unfold: false }), $symbol("|"), _stmts
    ),
    $and(LR, $separate(expression, $symbol(","), { once: true, auto_unfold: false }), RR, _arrow, _stmts),
    $and(varname, _arrow, _stmts),
    $and($kw("lambda"), $separate(expression, $symbol(","), { once: true, auto_unfold: false })
        , indent_block,)))


export const fndecl = $branch($and(
    $or($kw("fn"), $kw("def"), $kw("function"), $kw("method"), $kw("func")),
    $or($type(TT.IDENTIFIER), backtick),
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
    return { type: SYNTAX.fn_def, name: result[1].value, args: isFalsy(result[3]) ? false : result[3][0], body: result[5] }
})
reflex.expression = $or(comparison, closure);

export const singlestmt = $branch($and(stmt, $or($type(TT.SEMI), $type(TT.INDENT))), result => [result[0]])
export const line_stmt = $and($symbol(":"), singlestmt)
reflex.indent_block = function (slice, swc) {

    if (slice.get(0)[1] != ":") return Fail
    if (!slice.get(1)) return Fail
    if (slice.get(1)[0] != TT.INDENT) return Fail


    //fnOrSep = 0 means fn, 1 means separator to be recved
    let stmt_or_indent = 0;
    let results = [], cur_indent = -1;
    let result = (stmt_or_indent ? $indent() : stmt)(slice.peek(2), swc);
    if (isFalsy(result)) return Fail;

    let gap = result[1] + 2;
    while (isTruthy(result) && (gap <= slice.length || slice.done == false)) {

        if (stmt_or_indent == 0) {
            results.push(result[2])
        }
        else {
            if (cur_indent == -1) cur_indent = result[2].value;
            else if (cur_indent != result[2].value) break;
        }
        stmt_or_indent = !stmt_or_indent;
        result = (stmt_or_indent ? $indent() : stmt)(slice.peek(gap), swc);
        gap += result[1];

    }
    return [true, gap, results];
}
reflex.block = $branch($and(
    LC,
    $maybe($separate(stmt,
        $or($type(TT.SEMI), $type(TT.INDENT)), { once: true, auto_unfold: false })),
    RC),
    result => 0 || { type: SYNTAX.block, value: result[1] }
)


reflex._stmts = $or(stmtblock, indent_block, singlestmt, line_stmt)
reflex.stmt = $or(
    fndecl, control, assignstmt, jumpstmt, expression
)
export const program = $separate(stmt, $or($type(TT.SEMI), $type(TT.INDENT)), { once: true, auto_unfold: false })