export const SIGN = {
    SPACE: 0,
    ENTER: 1,
    NUMBER: 2,
    IDENTIFIER: 3,
    SYMBOL: 4,
    BRACKET: 5,
    STRING: 6,
    SEMI: 8,

    LP: "(",
    RP: ")",

    EOF: 127
}
export const SYNTAX = {
    ...SIGN, PARENTHESE: 20,
    CHAIN: 21,MEMBER:22,APPLY:23,COMMA:24,UNARY:25,BINARY:26,ASSIGN:27,STMT:28,FUNC:30,ARGS:29,STMTBLOCK:31,IFSTMT:32,WHILESTMT:33
,
    RETURN :40,BREAK:41,CONTINUE:42
}
export function testChar(tokens, n, comment = "") {
    //显示固定位置的字符
    let headStr = "[testChar]:" + comment + Array((10 - comment.length) > 0 ? 10 - comment.length : 0).fill("-").join("") + "@" + n
    console.log(headStr)
    console.log(" ", tokens?.[n - 3])
    console.log(" ", tokens?.[n - 2])
    console.log(" ", tokens?.[n - 1])
    console.log(">", tokens?.[n])
    console.log(" ", tokens?.[n + 1])
    console.log(Array(headStr.length).fill("-").join(""))
}
import { tokenize } from "./tokenizer.js"
export function testText(source, func) {
    let tokens=colleToken(source);
    let res = func(tokens, 0);
    if (!res) return false;
    if (tokens.length != res.offset) return false;
    //匹配失败就失败，匹配不完全也失败
    return true;
}
export function colleToken(source){
    let tokens = []
    for (let  i of tokenize(source)) {
        if ((i[0] != SIGN.SPACE) && (i[0] != SIGN.ENTER))
            tokens.push(i);
    };
    return tokens;
}
export function parse(source, func) {
    let tokens=colleToken(source);
    let res = func(tokens, 0);
    if (!res) return false;
    return res;
}
export function _seq(seq = [], callback, hard = false) {
    return function (tokens, offset) {
        let gap = 0, coll = [];
        for (let i in seq) {
            let res = seq[i](tokens, offset + gap);
            if (!res) {
                if (hard && seq >= 1) return new Error("Illegal Grammar for _seq")
                return false;
            }
            gap += res.offset ?? 1;
            coll.push(res);
        }

        return callback(coll, tokens)
    }
}

export function _collector(mainpart, divider, wrapper) {
    return function (stream, p = 0) {
        let coll = [], gap = 0;

        let res = mainpart(stream, p + gap);
        while (res) {
            coll.push(res);
            gap += res.offset;
            let division = divider(stream, p + gap)
            if (!division) {
                break;
            }
            gap += division.offset ?? 1;//TODO
            res = mainpart(stream, p + gap);
        }

        return [coll, gap];
    }
}

export function _eq(n, arr) {
    return n?.[0] == arr[0] && n?.[1] == arr[1]
}