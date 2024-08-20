import { SIGN } from './util.js'
function setup(rules) {
    return {
        current_rule: rules.normal ?? function () { },
        recv(input, { no_consume }) {
            let result =
                this.current_rule(input, this, {
                    next_state: s => this.current_rule = rules[s],
                    no_consume
                })

            return result;
        }
    }
}
export function* poll(rules, source) {
    let ssm = setup(rules);
    let ind = 0;
    source += '\0';
    while (ind < source.length) {
        let consume = 1;
        let result = ssm.recv(source[ind], { no_consume: () => { consume = 0 } });
        ind += consume;
        if (result != undefined) yield result
    }

}
//rules:fn:(input,state,{next_state,no_consume})->result|Undone
const normal = (i, s, { next_state, no_consume }) => {
    if (i == " " && !s.cache_id) return [SIGN.SPACE];
    else if (/[A-Za-z$_]/.test(i)) {
        no_consume()
        next_state("normal_identifier");
    }
    else if (/[1-9]/.test(i)) {
        no_consume()
        next_state("normal_number")
    }
    else if (/0/.test(i)) {
        return[SIGN.NUMBER,0]
    }
    else if (i == "\"") {
        next_state("normal_string")
    }
    else if (i == '\n' || i == "\r") {
        next_state("normal_indent")
    }
    else if ("@+-/*&=:!~.,".split("").indexOf(i) != -1) {
        return [SIGN.SYMBOL, i];
    }
    else if ("()[]{}<>".split("").indexOf(i) != -1) {
        return [SIGN.BRACKET, i];
    }
    else if (i == ";") {
        //seemd could be better
        return [SIGN.SEMI]
    }
}
const normal_indent = (i, s, { next_state, no_consume }) => {
    if (s.cache_indent_count === undefined) {
        s.cache_indent_count = 0;
    }
    switch (i) {
        case " ": s.cache_indent_count += 1; break;
        case "\t": s.cache_indent_count += 4; break;
        case "\n": s.cache_indent_count = 0; break;
        case "\r": s.cache_indent_count += 0; break;
        default:
            let c = s.cache_indent_count;
            delete s.cache_indent_count;
            no_consume()
            next_state("normal")
            return [SIGN.INDENT, c];
    }
}
const normal_string = (i, s, { next_state }) => {
    if (i == "\"") {
        let cs = s.cache_string;
        delete s.cache_string
        next_state("normal")
        return [SIGN.STRING, cs]
    } else {
        if (s.cache_string == undefined) s.cache_string = ""
        s.cache_string += i
    }
}
const normal_number = (i, s, { next_state, no_consume }) => {
    if (s.cache_number == undefined) s.cache_number = ""
    if (/[0-9]/.test(i)) s.cache_number += i;
    else if (i == "_") return;
    else if (i == ".") next_state("normal_float");
    else {
        no_consume()
        next_state("normal");
        let sn = s.cache_number;
        delete s.cache_number
        return [SIGN.NUMBER, parseInt(sn)]
    }
}
const normal_float = (i, s, { next_state, no_consume }) => {
    if (s.cache_float == undefined) s.cache_float = ""
    if (/[0-9]/.test(i)) s.cache_float += i;
    else if (i == "_") return;
    else {
        if (s.cache_float.length == 0) {
            //condition like 23.myth
            no_consume()
            next_state("return_dot");
            return;
        }
        no_consume()
        next_state("normal");
        let sn = s.cache_number + "." + s.cache_float;
        delete s.cache_number
        delete s.cache_float
        return [SIGN.NUMBER, parseFloat(sn)]
    }
}
const return_dot = (i, s, { next_state, no_consume }) => {
    if (s.returning_dot == undefined) {
        s.returning_dot = 1;
        no_consume()
        let sn = s.cache_number;
        delete s.cache_number
        return [SIGN.NUMBER, parseInt(sn)]
    } else {
        delete s.returning_dot
        no_consume()
        next_state("normal")
        return [SIGN.SYMBOL, "."]
    }

}
const normal_identifier = (i, s, { next_state, no_consume }) => {
    if (s.cache_id == undefined) s.cache_id = ""
    if (/[A-Za-z$_]/.test(i)) {
        s.cache_id += i
    } else {
        let si = s.cache_id;
        delete s.cache_id;
        no_consume()
        next_state("normal")
        return [SIGN.IDENTIFIER, si];
    }
}
export let sum = {
    normal, normal_indent,
    normal_string,normal_identifier,
    normal_number, normal_float, return_dot
}
export function tk(source) {
    return poll(sum, source)
}
// for (let i of poll(sum, `fn main() {
//     let number = 5;
//     let square = square(number);
//     println!("The square of {} is {}", number, square);
// }

// fn square(x: i32) -> i32 {
//     x * x
// }`)) {
//     console.log(i)
// }