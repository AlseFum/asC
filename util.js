const MODE = "dev"//["release","dev","debug"]
const names = {
    SPACE: "<Space>",
    ENTER: "<Enter>",
    INDENT: "<Indent>",
    NUMBER: "<Number>",
    IDENTIFIER: "<Identifier>",
    SYMBOL: "<Symbol>",
    BRACKET: "<Bracket>",
    STRING: "<String>",
    SEMI: "<Semicolon>",
    BACKTICK: "<Backtick>",
    EOF: 127
}
if (MODE == "release") {
    let count = 0;
    for (let i in names) names[i] = count++;
}
export const TokenType = {
    sp: names.SPACE,
    id: names.IDENTIFIER,
    str: names.STRING,
    sym: names.SYMBOL,
    br: names.BRACKET,
    ...names
}
export const TT = TokenType;
export const SYNTAX = {
    tuple: "<tuple>",
    array: "<array>",
    object: "<object>",
    assign: "<assign>", // a = b
    typemark: "<typemark>",
    rest: "<rest>",
    range: "<range>",
    comparison: "<comparison>",
    return: "<return>",
    bracket: "<bracket>",
    block: "<block>",
    continue: "<continue>",
    break: "<break>",
    fn_def: "<Function_definition>",
    let: "<let>",
}
if (MODE == "release") {
    let count = 128;
    for (let i in SYNTAX) SYNTAX[i] = count++;
}
export const Fail = [false, 0]
export function jlog(...args) {
    console.log(...args.map(a => JSON.stringify(a, null, 2)))
}
export function isFalsy(n) {
    if (n == undefined) return true;
    return n[0] == false
}
export function isTruthy(n) {
    if (n == undefined) return false;
    return n[0] == true
}
export function assert_truthy(label = "[Anonymous]", fn, source) {
    if (typeof source == "string") source = slice_by_iter(tk(source))
    let result = fn(source)
    if (isTruthy(result)) return;
    else {
        console.log(label + " assertion failed")
    }
}
export function assert_falsy(label = "[Unnamed]", fn, source) {
    if (typeof source == "string") source = slice_by_iter(tk(source))
    let result = fn(source)
    if (isFalsy(result)) return;
    else {
        console.log(label + " assertion failed")
    }
}
function slice_iter_ref(source, gap) {
    return {
        origin: source.origin,
        gap: gap + (source.gap ?? 0),
        is_slice_ref: true,
        get(n = 0) { return source.get(n + this.gap) },
        peek(n) { return source.peek(n + this.gap) },
        get length() {
            return this.origin.length - this.gap;
        },
        get done() {
            return this.origin.done;
        }
    }
}
export function slice_by_iter(origin_iter, start = 0, { ignore_space = true } = {}) {

    return {
        origin_iter,
        origin: [],
        gap: start,
        done: false,
        draw() {
            let result = origin_iter.next()
            if (result.done) { this.done = true; return; }

            if (ignore_space && result.value[0] == TokenType.SPACE) {
                return this.draw();
            }

            this.origin.push(result.value)
            return result;
        },
        get(n = 0) {

            if (this.origin.length <= this.gap + n) {
                let cont = true;
                while (cont && this.origin.length <= this.gap + n) {
                    let draw_result = this.draw()
                    cont = draw_result != undefined && !draw_result.done
                }
            }
            return this.origin[this.gap + n]
        },
        peek(n) {
            return slice_iter_ref(this, n)
        },
        toJSON() {
            return this.origin.slice(this.gap)
        },
        get length() {
            return this.origin.length - this.gap;
        },
        collect() {
            while (!this.done) {
                this.draw()
            }
            return this;
        }
    }
}
export function slice(origin, start = 0, stop = -1) {
    //sync in a settled array
    return {
        origin: origin.is_slice ? origin.origin : origin,
        is_slice: true,
        gap: start + (origin.gap ?? 0),
        get(n = 0) {
            // let res = this.origin[this.gap + n];
            return this.origin[this.gap + n]
        },
        peek(n) {
            return slice(this, n)
        },
        toJSON() {
            return this.origin.slice(this.gap)
        },
        get length() {
           // if (stop != -1) return stop - this.gap;
            return this.origin.length - this.gap;
        }
    }
}
[Array, Object, Number, String].forEach(cls => {
    cls.prototype.log = function (label) {
        label ? jlog(`${label}:`, this) : jlog(this)
        return this
    }
});