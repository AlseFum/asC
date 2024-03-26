import { SIGN } from "./util.js"
const numberHead = /[0-9]/
const numberBody = /[0-9a-fA-F_]/
const identifierHead = /[$a-zA-Z]/
const identifierBody = /[$a-zA-Z0-9_]/
const symbol = /[\+\-\*\/!@#%^~&*=?<>.,]/
const bracket = /[\{\}\(\)\[\]]/
export function* tokenize(source = "") {
    let offset = 0;
    let ret;
    while (source[offset] != undefined && offset < source.length) {
        if (source[offset] == undefined) {
            ret= SIGN.EOF// ret = [SIGN.EOF]
            //shouldn't reach here
        }
        //enter
        else if (/;/.test(source[offset])) {
            ret = [SIGN.SEMI, null]
        }
        else if (/\n/.test(source[offset])) {
            let gap = 0;
            while (/\s/.test(source[offset])) {
                switch (source[offset]) {
                    case '\t':
                        gap += 4;
                        break;
                    case ' ':
                        gap += 1;
                        break;
                    case '\n':
                        gap = 0;
                        break;
                }
                offset++;
            }
            offset--;
            ret = [SIGN.ENTER, gap]
        }
        //space
        else if (/[^\S\n]/.test(source[offset])) {
            while (/\s/.test(source[offset])) { offset++ };
            offset--;
            ret = [SIGN.SPACE]
        }

        //number
        else if (source[offset] !== undefined && numberHead.test(source[offset])) {
            let mode;
            
            if (source[offset] == '0') {
                switch (source[offset + 1]) {
                    case 'x':
                    case 'X':
                        mode = 16; break;
                    case 'b':
                    case 'B':
                        mode = 2; break;
                    case 'o':
                    case 'O':
                        mode = 8;
                        break;
                    default: return false;
                }
                offset += 2;
            }
            let num = source[offset]; offset++;
            while (source[offset] !== undefined && numberBody.test(source[offset])) {
                let c = source[offset] ?? "";
                num += c != "_" ? c : "";
                offset++;

            }
            
            offset--;
            
            ret = [SIGN.NUMBER, parseInt(num, mode)]
        }
        //identifier
        else if (source[offset] !== undefined && identifierHead.test(source[offset])) {
            let id = source[offset]; offset++;
            let step = 0;
            while (step++ < 48 && source[offset] !== undefined && identifierBody.test(source[offset] ?? 0)) {
                id += source[offset];
                offset++;
            }
            offset--;

            ret = [SIGN.IDENTIFIER, id]


        }
        //symbol
        else if (symbol.test(source[offset])) {
            ret = [SIGN.SYMBOL, source[offset]];
        }
        //bracket
        else if (bracket.test(source[offset])) {
            ret = [SIGN.BRACKET, source[offset]];
        }
        //string
        else if (source[offset] == '"') {
            let str = "", escaping = false;
            offset++;
            while (source[offset] !== undefined && (source[offset] != '"' || escaping)) {
                if (source[offset] == '\\') {
                    escaping = true;
                }
                else if (source[offset] == '"') {
                    if (escaping) {
                        escaping = false
                        str += '"'
                    } else { offset++; break };
                }
                else {
                    str += source[offset];
                }

                offset++;
            }

            ret = [SIGN.STRING, str]

        }
        else {
            console.log("false hit")
            ret = [source[offset]]
        }
        offset++;
        yield ret;

    }
}