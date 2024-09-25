import {  Fail, jlog ,SIGN, SYNTAX} from "./util.js"
import { collect, tk } from "./tokenize.js"

import { pipe ,tuple_literal} from "./nnoth.js"
import { $and, $symbols,$symbol,$kw } from "./parser.js"

jlog(collect("a,b/**/"))
console.log("test finished")