import { SYNTAX, SIGN } from "./util.js"
export function asCtoJS(n) {
    switch (n?.type) {
        case SIGN.IDENTIFIER:
        case SIGN.NUMBER:
            return n.value
            break;
        case SIGN.STRING:
            return '"' + n.value.replace(/"/g, '\\"') + '"';
            break;
        case SYNTAX.PARENTHESE:
            return "(" + asCtoJS(n.content) + ")"
            break;
        case SYNTAX.EXPRESSION:
            return JSON.stringify(n);
            break;
        case SYNTAX.MEMBER:
            return asCtoJS(n.object) + "." + n.property
            break;
        case SYNTAX.APPLY:
            return asCtoJS(n.object) + "(" + asCtoJS(n.params) + ")"
            break;
        case SYNTAX.COMMA:
            return n.content.map(i => asCtoJS(i)).join(",")
        case SYNTAX.UNARY:
            return n.operand + asCtoJS(n.value)
            break;
        case SYNTAX.BINARY:
            return asCtoJS(n.left) + " " + n.operand + " " + asCtoJS(n.right)
            break;
        case SYNTAX.ASSIGN:
            return "let " + asCtoJS(n.id) + "=" + asCtoJS(n.value)
            break;
        case SYNTAX.STMT:
            return asCtoJS(n.body) + ";";
            break;
        case SYNTAX.FUNC:
            return "function " + n.name + asCtoJS(n.args) + asCtoJS(n.body)
            break;
        case SYNTAX.ARGS:
            return "(" + n.content.map(i => asCtoJS(i)).join(",") + ")";
            break;
        case SYNTAX.STMTBLOCK:
            return "{\n" +
                n.content.map(i => asCtoJS(i)).join("") + "\n}"
            break;
        case SYNTAX.IFSTMT:
            return "if" + asCtoJS(n.condition) + asCtoJS(n.body)
            break;
        case SYNTAX.WHILESTMT:
            return "while" + asCtoJS(n.condition) + asCtoJS(n.body)
            break;
        case SYNTAX.BREAK:
        return "break"
            break;
        case SYNTAX.CONTINUE:
            return "continue;"
        case SYNTAX.RETURN:
            return "return "+asCtoJS(n.value)
            break;
        default: return JSON.stringify(n)
    }
}