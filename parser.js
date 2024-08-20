//一种：多线程，从根开始解析funcdecl
//一种，单线程，最简单的
//基础模型：堆栈式地堆叠表达式，在构造rule的时候加入一些减少重复识别的过程
import { SIGN, Fail, jlog, isTruthy, isFalsy, } from "./util.js"
export function $and(...fns) {
    return function (slice, fn_ind) {
        let gap = 0, results = [];
        for (let i = 0; i < fns.length; i++) {
            if (gap > slice.length) return Fail;
            let result = fns[i](slice.peek(gap), fn_ind);
            if (isFalsy(result)) return Fail;

            gap += result[1];
            results.push(result[2]);
        }

        return [true, gap, results];
    }
}
export function $or(...fns) {
    return function (slice, fn_ind) {
        for (let fn of fns) {
            let result = fn(slice, fn_ind);
            if (isTruthy(result)) { return result; }
        }
        return Fail
    }
}

export function $maybe(fn) {
    return function (slice, fn_ind) {
        let results = [], result = [true, 0], gap = 0;
        while (isTruthy(result) && (gap < slice.length||!slice.done)) {
            result = fn(slice.peek(gap), fn_ind);
            if (isTruthy(result)) {
                gap += result[1];
                results.push(result[2])
            }//AUTOMATICALLY BREAK;
        }
        //to be refactored
        if (results.length == 0) return [true, 0, Fail]
        return [true, gap, isTruthy(results[0]) || results[0] != false ? results : Fail]
    }
}

export function $separate(
    fn, separator,
    { once = false, loose = true, auto_unfold = true } = {}) {
    //once :fn could appear just once
    return function (slice, fn_ind) {
        let results = []
        //fnOrSep = 0 means fn, 1 means separator to be recved
        let fnOrSep = 0;

        let result = (fnOrSep ? separator : fn)(slice, fn_ind);
        if (isFalsy(result)) return Fail;

        let gap = result[1];
        while (isTruthy(result) && (gap <= slice.length||slice.done==false)) {

            if (fnOrSep == 0) results.push(result[2])//ignore separator
            
            fnOrSep=!fnOrSep;

            result = (fnOrSep ? separator : fn)(slice.peek(gap), fn_ind);
            gap += result[1];
        }
        //some times you can't leave a single separator like a + b +
        if (!loose && fnOrSep == 0) return Fail
        //1 1+3 all are valid
        if (results.length == 1) {
            if (once) 
                return [true, gap, auto_unfold ? results[0] : results]
            else return Fail}

        if (results.length <= 0) return Fail
        return [true, gap, results];
    }
}
export const $req = (label, headfn, bodyfn, errfn = console.log) => {
    return function (slice, fn_ind) {
        let headrs = headfn(slice, fn_ind);
        if (isFalsy(headrs)) return Fail;

        let gap = headrs[1];
        let bodyrs = bodyfn(slice.peek(gap), fn_ind);
        if (isFalsy(bodyrs)) {
            errfn(label, " required!")
            return Fail;
        }
        gap += bodyrs[1];
        return [true, gap, [headrs[2], bodyrs[2]]];
    }
}
////////////////////////////////////////////////
//to process the data
export const $process = (primifn, ...handlers) => {
    return function (slice,
        fn_ind = 0
    ) {
        if (fn_ind == 0) return primifn(slice, fn_ind);
        else {
            let primi = primifn(slice, fn_ind);
            if (isFalsy(primi)) return Fail;
            return [primi[0], primi[1],( handlers[fn_ind - 1]??(i=>i))(primi[2]) ?? Fail];
        }
    };
}
//////////////////////////////////////////////
export const $token = (type, value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return Fail
        return $1[0] == type && $1[1] == value ? [true, 1, { type, value: $1[1] }] : Fail
    }
}
export const $type = type => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return [false, 0]
        return $1[0] == type ? [true, 1, { type, value: $1[1] }] : Fail
    }
}
export const $value = value => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return [false, 0]
        return $1[1] == value ? [true, 1, { type: $1[0], value }] : Fail
    }
}
export const $kw = (value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return Fail
        return $1[0] == SIGN.IDENTIFIER && $1[1] == value ? [true, 1, { type: SIGN.IDENTIFIER, value: $1[1] }] : Fail
    }
}

export const $symbol = (value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return Fail
        return $1[0] == SIGN.SYMBOL && $1[1] == value ? [true, 1, { type: SIGN.SYMBOL, value: $1[1] }] : Fail
    }
}
export const $symbols = (value) => {
    return function (slice,fn_ind) {
        for (let i = 0; i < slice.length; i++) {
            let $1 = slice.get(i)
            if (!$1) return Fail
            if (!($1[0] == SIGN.SYMBOL && $1[1] == value[i])) return Fail

            if (i == value.length - 1) return [true, i + 1, { type: SIGN.SYMBOL, value: value }]
        }
        return Fail
    }
}
export const $bracket = (value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return Fail
        return $1[0] == SIGN.BRACKET && $1[1] == value ? [true, 1, { type: SIGN.BRACKET, value: $1[1] }] : Fail
    }
}

export const $indent = _ => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return Fail
        return $1[0] == SIGN.INDENT ? [true, 1, { type: SIGN.INDENT, value: $1[1] }] : Fail
    }
}


