import { SIGN, SYNTAX, _seq, _collector, _eq } from './util.js'
export function PrimaryExpression(tokens, offset = 0) {
    let firstToken = tokens[offset]; if (!firstToken) return false;
    if (
        firstToken[0] == SIGN.IDENTIFIER
        || firstToken[0] == SIGN.STRING
        || firstToken[0] == SIGN.NUMBER
    ) {
        return { value: firstToken[1], offset: 1, type: firstToken[0] }
    } else if (_eq(firstToken, [SIGN.BRACKET, SIGN.LP])) {
        let exp_res = Expression(tokens, offset + 1); if (!exp_res) return new Error("Illegal Grammar for Bracket:no Expression");
        if (!_eq(tokens[offset + exp_res.offset + 1], [SIGN.BRACKET, SIGN.RP])) return new Error("Illegal Grammar:Unclosed Bracket");
        return { type: SYNTAX.PARENTHESE, offset: 2 + exp_res.offset, content: exp_res }
    }
    return false;
}
////////////////////////////
function memberRear(tokens, offset) {
    let n = tokens[offset]; if (!n || !_eq(n, [SIGN.SYMBOL, "."])) return false;
    let name = tokens[offset + 1]; if (!name || name[0] != SIGN.IDENTIFIER) return false;

    let rear = memberRear(tokens, offset + 2) || applyRear(tokens, offset + 2);
    if (!rear) return {
        type: SYNTAX.MEMBER,
        offset: 1 + (name.offset ?? 1),
        name: name[1]
    }

    return {
        type: SYNTAX.MEMBER,
        name: name[1],
        rear,
        offset: 2 + rear.offset
    }
}
function applyRear(tokens, offset) {
    let leftParen = tokens[offset]; if (!leftParen || !_eq(leftParen, [SIGN.BRACKET, "("])) return false;

    let params = Expression(tokens, offset + 1);

    let rightParen = tokens[offset + (params.offset ?? 0) + 1]; if (!rightParen || !_eq(rightParen, [SIGN.BRACKET, ")"])) return false;

    let rear = applyRear(tokens, offset + (params.offset ?? 0) + 2) || memberRear(tokens, offset + (params.offset ?? 0) + 2);
    if (rear) return {
        type: SYNTAX.APPLY,
        params,
        rear,
        offset: 2 + (params.offset ?? 0) + + rear.offset
    };
    else return {
        type: SYNTAX.APPLY,
        params,
        offset: 2 + (params.offset ?? 0)
    }
}
export function ChainExpression(tokens, offset = 0) {
    //非常丑陋
    let firstToken = PrimaryExpression(tokens, offset); if (!firstToken) return false;
    let rear = memberRear(tokens, offset + 1) || applyRear(tokens, offset + 1);
    if (!rear) return firstToken;
    return _rearrange({ type: SYNTAX.CHAIN, object: firstToken, rear: rear, offset: rear.offset + firstToken.offset });
}
export function _rearrange(n) {

    let chain = [], finalOffset = n.offset, iter = n.rear;
    while (iter) { chain.push(iter); iter = iter.rear || iter.property; }

    let backed = n.object;

    for (let i of chain) {

        switch (i.type) {
            case SYNTAX.MEMBER:

                backed = {
                    object: backed,
                    type: SYNTAX.MEMBER,
                    property: i.name
                }
                break;
            case SYNTAX.APPLY:
                backed = {
                    object: backed,
                    type: SYNTAX.APPLY,
                    params: i.params
                }
                break;
        }

    }

    backed.offset = finalOffset;
    return backed;
}
export function UnaryExpression(tokens, offset = 0) {
    let operand = tokens[offset];
    let checkOp = i => i?.[1] == "!" || i?.[1] == "~"
    if (!operand || !checkOp(operand)) return false;
    let value = UnaryExpression(tokens, offset + 1) || ChainExpression(tokens, offset + 1);
    if (!value) return false;

    return { type: SYNTAX.UNARY, value, offset: value.offset + 1, operand: operand[1] }

}

export function MultiDivExpression(tokens, offset = 0) {
    let left = UnaryExpression(tokens, offset) || ChainExpression(tokens, offset);
    if (!left) return false;

    let operand = tokens[offset + left.offset];
    let checkOp = i => i?.[1] == "*" || i?.[1] == "/"
    if (!operand || !checkOp(operand)) { return left }
    let right = Expression(tokens, offset + (left.offset ?? 1) + 1);
    if (!right) return new Error("Illegal Grammar for Expression");
    return { type: SYNTAX.BINARY, left, right, offset: left.offset + 1 + right.offset, operand: operand[1] }
}
export function AddSubExpression(tokens, offset = 0) {
    let left = MultiDivExpression(tokens, offset);
    if (!left) return false;

    let operand = tokens[offset + left.offset];


    let checkOp = i => i?.[1] == "+" || i?.[1] == "-"
    if (!operand || !checkOp(operand)) { return left }
    let right = Expression(tokens, offset + (left.offset ?? 1) + 1);
    if (!right) return new Error("Illegal Grammar for Expression");
    return { type: SYNTAX.BINARY, left, right, offset: left.offset + 1 + right.offset, operand: operand[1] }
}
export function CompExpression(tokens, offset = 0) {
    let left = AddSubExpression(tokens, offset);
    if (!left) return false;

    let operand1 = tokens[offset + left.offset], operand2 = tokens[offset + left.offset + 1];


    let checkOp = (i1, i2) => i1 && i2 && i1?.[1] == "=" && i2?.[1] == "=";
    if (!checkOp(operand1, operand2)) return left;
    let right = Expression(tokens, offset + (left.offset ?? 1) + 2);
    if (!right) return new Error("Illegal Grammar for Expression");
    return { type: SYNTAX.BINARY, left, right, offset: left.offset + 2 + right.offset, operand: operand1[1] + operand2[1] }

}
export function AssignExpression(tokens, offset = 0) {

    let letName = CompExpression(tokens, offset); if (!letName) return false;
    let assignSym = tokens[offset + 1]; if (!assignSym || !assignSym[0] == SIGN.SYMBOL || assignSym[1] != "=") return letName;

    let expr = CompExpression(tokens, offset + 2);
    if (!expr) return false;
    return { type: SYNTAX.BINARY, left: letName, right: expr, offset: 2 + expr.offset, operand: "=" }
}
let _collexpr = _collector(AssignExpression, (t, i) => { return t[i]?.[0] == SIGN.SYMBOL && t[i]?.[1] == "," ? { offset: 1 } : false })
export function CommaExpression(tokens, offset = 0) {
    let res = _collexpr(tokens, offset)
    if (!res) return false;
    if (res[0].length == 1) return res[0][0]
    return { type: SYNTAX.COMMA, content: res[0], offset: res[1] }

}

export let _declargs = _collector(PrimaryExpression, (t, i) => {
    return t[i]?.[1] == "," ? { offset: 1 } : false
})
export function Expression(tokens, offset = 0) {
    return CommaExpression(tokens, offset)
}
export function AssignStmt(tokens, offset = 0) {
    let letKeyword = tokens[offset]; if (!letKeyword || !letKeyword[0] == SIGN.IDENTIFIER || letKeyword[1] != "let") return false;
    let emm = AssignExpression(tokens, offset + 1);
    if (!emm) return new Error("Illegal Grammar for AssignStmt")
    return { type: SYNTAX.ASSIGN, id: emm.left, value: emm.right, offset: 1 + emm.offset }
}

export function _funcArgs(tokens, offset = 0) {
    let n = tokens[offset]; if (!n) { return false; }
    if (!(n[0] == SIGN.BRACKET && n[1] == "(")) { return false; }

    let pa = _declargs(tokens, offset + 1); if (!pa) return false;

    let end = tokens[offset + pa[1] + 1];
    if (!(end?.[0] == SIGN.BRACKET && end?.[1] == ")")) { return false; }

    return {
        type: SYNTAX.ARGS, content: pa[0], offset: pa[1] + 2
    }
}
export function FuncDecl(tokens, offset = 0) {
    let startiden = tokens[offset]; if (!startiden || !(startiden[0] == SIGN.IDENTIFIER && startiden[1] == "fn")) return false;
    let funcname = tokens[offset + 1]; if (!funcname) return false;

    let fnargs = _funcArgs(tokens, offset + 2);

    if (!fnargs) return new Error("Illegal grammar:args");

    let fnbody = StmtBlock(tokens, fnargs.offset + 2 + offset);
    if (!fnbody) {
        ; return new Error("Illegal grammar:body");
    }
    return {
        type: SYNTAX.FUNC, name: funcname[1], args: fnargs, body: fnbody, offset: fnbody.offset + fnargs.offset + 2
    }
}


export let IfStmt = _seq([
    (t, i) => t[i]?.[1] == "if" ? { offset: 1 } : false,
    _funcArgs,
    StmtBlock
], (coll, tokens) => {
    return { type: SYNTAX.IFSTMT, condition: coll[1], body: coll[2], offset: coll[1].offset + coll[2].offset + 1 }
})
export let WhileStmt = _seq([
    (t, i) => t[i]?.[1] == "while" ? { offset: 1 } : false,
    CommaExpression,
    StmtBlock
], coll => {
    return { type: SYNTAX.WHILESTMT, condition: coll[1], body: coll[2], offset: coll[1].offset + coll[2].offset + 1 }
})
export let ReturnStmt = _seq([
    (t, i) => t[i]?.[0] == SIGN.IDENTIFIER && t[i]?.[1] == "return" ? { offset: 1 } : false,
    Expression
], (coll, tokens) => {
    return { type: SYNTAX.RETURN, value: coll[1], offset: coll[1].offset + 1 }
})

export let BreakStmt = _seq([(t, i) => t[i]?.[0] == SIGN.IDENTIFIER && t[i][1] == "break"], coll => {
    return { type: SYNTAX.BREAK, offset: 1 }
})
export let ContinueStmt = _seq([(t, i) => t[i]?.[0] == SIGN.IDENTIFIER && t[i][1] == "break"], coll => {
    return { type: SYNTAX.CONTINUE, offset: 1 }
})
export let JumpStmt = function (tokens, offset) {
    return BreakStmt(tokens, offset) || ContinueStmt(tokens, offset) || ReturnStmt(tokens, offset)
}
export let EmptyStmt = function (tokens, offset = 0) {
    return _eq(tokens[offset], [SIGN.SEMI, null]) ? { offset: 0 } : false;
}
export function Stmt(tokens, offset = 0,forceSemicolon=true) {
    let p = FuncDecl(tokens, offset) || IfStmt(tokens, offset) || WhileStmt(tokens, offset) || AssignStmt(tokens, offset) || JumpStmt(tokens, offset) || Expression(tokens, offset) || EmptyStmt(tokens, offset);

    if (!p) return false;
    if (!_eq(tokens[offset + (p.offset ?? 0)], [SIGN.SEMI, null])) {

        if(forceSemicolon)return false;
    }
    return { type: SYNTAX.STMT, body: p, offset: (p.offset ?? 0) + 1 }
}
export function _stmtGroup(tokens, offset = 0) {
    console.log("usling here")
    let gap = 0; let n = Stmt(tokens, offset + gap);
    let coll = [];
    while (n) {
        coll.push(n);
        gap += n.offset;
        n = Stmt(tokens, offset + gap);
    }
    coll.offset = gap;
    return coll
}
export function StmtBlock(tokens, offset = 0) {

    let leftBracket = tokens[offset]; if (!_eq(leftBracket,[SIGN.BRACKET,"{"])) return false;

    let possibleStmts = [], gap = 1;
    let stmt = Stmt(tokens, offset + gap);
    while (stmt) {
        possibleStmts.push(stmt);
        gap += stmt.offset;
        stmt = Stmt(tokens, offset + gap);
    }
    //loose semicolon for last statement
    let lastStmt=Stmt(tokens,offset + gap,false);
    if(lastStmt&&lastStmt.type&&lastStmt.offset>0){

        possibleStmts.push(lastStmt);
        gap+=lastStmt.offset-1;
    }

    let rightBracket = tokens[offset + gap];if (!rightBracket||!_eq(rightBracket,[SIGN.BRACKET,"}"])) {
        return false;
    }
    return {
        type: SYNTAX.STMTBLOCK, content: possibleStmts, offset: gap + 1
    }
}