//一种：多线程，从根开始解析funcdecl
//一种，单线程，最简单的
//基础模型：堆栈式地堆叠表达式，在构造rule的时候加入一些减少重复识别的过程
import { SIGN, fail } from "./util.js"
export function isFalsy(n) {
    if (n == undefined) return true;
    return n[0] == false
}
export function isTruthy(n) {
    if (n == undefined) return false;
    return n[0] == true
}
export function slice(origin, start = 0) {
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
            return this.origin.length - this.gap;
        }
    }
}
export function collect(n) {
    return slice(Array.from(n).filter(i => i[0] != SIGN.SPACE))
}

export function $and(...fns) {
    return function (slice, swc) {
        let gap = 0, results = [];
        for (let i = 0; i < fns.length; i++) {
            if (gap > slice.length) return fail;
            let result = fns[i](slice.peek(gap), swc);
            if (isFalsy(result)) return fail;

            gap += result[1];
            results.push(result[2]);
        }

        return [true, gap, results];
    }
}
export function $or(...fns) {
    return function (slice, swc) {
        for (let fn of fns) {
            let result = fn(slice, swc);
            if (isTruthy(result)) { return result; }
        }
        return fail
    }
}

export function $maybe(fn) {
    return function (slice, swc) {
        let results = [], result = [true, 0],gap = 0;
        while (isTruthy(result) && gap < slice.length) {

            result = fn(slice.peek(gap), swc);
            if (isTruthy(result)) {
                gap += result[1];
                results.push(result[2])
            }//AUTOMATICALLY BREAK;
        }
        //to be refactored
        if (results.length == 0) return [true, 0, fail]
        return [true, gap, isTruthy(results[0]) || results[0] != false ? results : fail]
    }
}
//simply copy the $maybe
export function $more(fn) {
    return function (slice, swc) {

        let results = [], result = true;
        let gap = 0;
        while (isTruthy(result) && gap < slice.length) {
            result = fn(slice.peek(gap), swc);
            if (isTruthy(result)) {
                gap += result[1];
                results.push(result[2])
            }
        }
        return [isTruthy(results[0]), gap, isTruthy(results[0]) ? results : false]
    }
}
export function $separate(fn, separator, { once = false, loose = true,auto_unfold = true } = {}) {
    //once :fn could appear just once
    return function (slice, swc) {
        let results = []
        //fnOrSep = 0 means fn, 1 means separator to be recved
        let fnOrSep = 0;

        let result = (fnOrSep ? separator : fn)(slice, swc);
        if (isFalsy(result)) return fail;
        let gap = result[1];
        while (isTruthy(result) && gap <= slice.length) {
            if (fnOrSep == 0) results.push(result[2])//ignore separator
            if (fnOrSep == 0) fnOrSep = 1; else fnOrSep = 0;
            result = (fnOrSep ? separator : fn)(slice.peek(gap), swc);
            gap += result[1];
        }
        //some times you can't leave a single separator like a + b +
        if (!loose && fnOrSep == 0) return fail
        //1 1+3 all are valid
        if (results.length == 1) if (once) return [true, gap, auto_unfold?results[0]:results]

        if (results.length <= 0) return fail
        return [true, gap, results];
    }

}
////////////////////////////////////////////////
//to process the data
export const $process = (primifn, handler) => {
    return function (slice, fold = false) {
        if (fold) return primifn(slice, fold);
        else {
            let primi= primifn(slice, fold);
            if (isFalsy(primi)) return fail;
            return [primi[0],primi[1],handler(primi[2])];
        }
    };
}
//////////////////////////////////////////////
export const $token = (type, value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return fail
        return $1[0] == type && $1[1] == value ? [true, 1, { type, value: $1[1] }] : fail
    }
}
export const $type = type => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return [false, 0]
        return $1[0] == type ? [true, 1, { type, value: $1[1] }] : fail
    }
}
export const $value = value => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return [false, 0]
        return $1[1] == value ? [true, 1, { type: $1[0], value }] : fail
    }
}
export const $kw = (value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return fail
        return $1[0] == SIGN.IDENTIFIER && $1[1] == value ? [true, 1, { type: SIGN.IDENTIFIER, value: $1[1] }] : fail
    }
}

export const $symbol = (value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return fail
        return $1[0] == SIGN.SYMBOL && $1[1] == value ? [true, 1, { type: SIGN.SYMBOL, value: $1[1] }] : fail
    }
}
export const $symbols = (value) => {
    return function (slice) {
        for(let i =0;i<slice.length;i++){
            let $1 = slice.get(i)
            if (!$1) return fail
            if (!($1[0] == SIGN.SYMBOL && $1[1] == value[i])) return fail

            if(i==value.length-1) return [true, i+1, { type: SIGN.SYMBOL, value: value }]
        }
        return fail
    }
}
export const $bracket=(value) => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return fail
        return $1[0] == SIGN.BRACKET && $1[1] == value ? [true, 1, { type: SIGN.BRACKET, value: $1[1] }] : fail
    }
}

export const $indent = _ => {
    return function (slice) {
        let $1 = slice.get(0)
        if (!$1) return fail
        return $1[0] == SIGN.INDENT ? [true, 1, { type: SIGN.INDENT, value: $1[1] }] : fail
    }
}


