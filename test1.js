import { slice, TT } from "./util.js"
import { tokendef, setup } from "./tokenize.js"
import { isFalsy } from "./util.js"
import { pipe, tuple_literal, range_literal, rest, _stmts, atom, chain, singlestmt, expression, stmtblock, indent_block, line_stmt, tuple_dir, stmt, typename, fndecl, comparison, control, prima, closure } from "./nnoth.js"
import { $and, $symbols, $symbol, $kw, $maybe, $indent, $separate } from "./parser_builder.js"
function parse(str) {
    return slice(setup(tokendef).once(str))
}
export function test_item(str, func, label = "[-]", show = false, strict = true) {
    let sliced = parse(str)
    let result = func(sliced)
    let accepted = true;
    if (isFalsy(result)) {
        accepted = false;
    } else if (strict) {
        if (result[1] !== sliced.length) {
            console.log(label + " unmatched:" + result[1] + " but " + sliced.length); accepted = false;
        }
    }
    if (accepted && show) {
        result.log()
    }
    if (!accepted) {
        console.log(label + " fail:", str)
        for (let i = -2; i < 3; i++) {
            console.log(sliced.get(result[1] + i))
        }
        console.log(result)
    }
}

export function test1() {

    test_item("s", $kw("s"), "$kw")
    test_item("a b", $and($kw("a"), $kw("b")), "$and")
    test_item("a,c,b", $separate(prima, $symbol(",")), "$separate")
    test_item("a", $separate(prima, $symbol(","), { once: true }), "$separate once")
    test_item("a,b,c", $separate(prima, $symbol(","), { loose: true }), "$separate loose")
    test_item("(e,f)", pipe, "pipe tuple")
    test_item("(_,_,...(a,b))", tuple_literal, "tuple literal")
    test_item("fn nm(a:a,b:i) {a+78;}", fndecl, "fndecl")
    test_item("fn `aef`(a:a,b:i) a+78;", fndecl, "atom fndecl")
    test_item("...[c,d]", rest, "rest")
    test_item("1..5", range_literal, "range")
    test_item("(e,f)->fn1->fn2", pipe, "pipe")
    test_item("a*b+23>89*56", comparison, "comparison")
    test_item("asef;", singlestmt, "stmt")
    test_item("if a=3:d;", control, "control")
    test_item("fn main(){print(23);}", fndecl, "fndecl")
    test_item(`|x|x+2;`, closure, "closure")
    test_item(`(a,b)=>a+b;`, closure, "closure")
    
    test_item(`u8`, typename, "typename")
    test_item(`mytype<u8,mytype<u8>>`, typename, "typename")
    test_item(`{}`, _stmts, "stmt block")
    test_item(`(x for x in 1..3)`, tuple_dir, "tuple dir")
    test_item(`lambda c,d:
        c+15`, closure, "lambda")
    test_item(`2
        
        +
        
    3`, expression, "indent")

    test_item(`a.b
            .c(1,
            2,3)
            .d`, chain, "new chain")

    test_item(`:56
        `, line_stmt)
    test_item(`{aesf;
            asef;
            asef}`, stmtblock, "stmtblock")
    test_item(`:
        a
        b
        c
        d`, indent_block, "ib")
}