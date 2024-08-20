import {  Fail, jlog ,SIGN} from "./util.js"
import { tk } from "./tokenize.js"
import { collect, isTruthy, isFalsy,  $symbol, slice } from "./parser.js"
import { $maybe, $kw, $or, $and ,$token,$separate} from "./parser.js"
// jlog($and($kw("a"),$kw("b"))(collect(tk("a b")),true))
// jlog($or($kw("a"),$kw("b"))(collect(tk("a b")),true))
// jlog($maybe($kw("a"))(collect(tk("")),true))
import { slice_by_iter } from "./parser.js"

console.log("test finished")