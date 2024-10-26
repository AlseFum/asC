function frame() {
    return [itemname, ind, { comment: "capture" }, [0, 0, "loc"]]
}
const itemname = 0
const ind = 1
const capture = 2
const loc = 3
function Solver(pts, options, slices) {
    let frames = [];
    let pointer = 0;
    frames.push(["Entry", 0, {}, []]);
    //topframe
    let tf = (n) => n ? frames[frames.length - 1][n] : frames[frames.length - 1];
    let curItem = (n) => n ? pts[tf()[itemname]][n] : pts[tf()[itemname]];

    let finishCurrentFrame = () => {
        let result = tf(capture);
        if (curItem().onProceed) {
            result = curItem().onProceed(result);
        }
        frames.pop()
        setCapture(result);
    }
    let getCapName = () => {
        let req = curItem(seq)[tf(ind)]
        switch (typeof req) {
            case "string":
                return req.slice(req.lastIndexOf(":"))
            case "object":
                if (Array.isArray(req)) {
                    if (req[req.length - 1].startsWith(":"))
                        return req.slice(1)
                    else return false;
                } else {
                    return req.name;
                }
            default: return false;
        }
    }
    let setCapture = (result) => {
        let result = tf(capture)
        if (curItem("onProceed")) { result = curItem("onProceed")(result) }
        frames.pop()
        curItem(capture)[getCapName()] = result;
    }
    let check = () => {
        check: {
            switch (typeof pts[top[0]][top[1]]) {
                case "string": break;
                case "object": break;
            }
        }
    }
    let parseReq = () => { }
    let once = (slice, then) => {
        switch (typeof then) {
            case "string":
                let d = parseReq(then);
                if (slice.get(pointer)[0] == d.type) return true;
                break;
            case "Object":
                if (Array.isArray(then)) {

                } else {

                };
            default: break;
        }
    }
    let goSeq = () => {
        pointer++;
        check(pts[top[0]][top[1]], slices);
        if (false) onfail;
        if (true) onprocess;

        switch (typeof pts[tf[itemname]].seq[tf[ind]]) {
            case "string": let result = matchSeq(slices, pointer, pts[tf[itemname]].seq[tf[ind]]);

                if (result.gap == -1) onfail();
                else {
                    pointer += result.gap;
                    tf[ind]++;

                    if (capture) setCapture;
                }
                break;
            case "object":
                if (Array.isArray(pts[tf[itemname]].seq[tf[ind]])) {
                    for (let i of nextchoice) {
                        if (checkmatched) {
                            newframe; break;
                        }
                    }
                } else {
                    checknextslice(slice, pointer);
                    frames.push([itemname, balabala])
                }

                break;

        }
    }
    let safe = 100000000000;
    mainloop: while (pointer < slices.length && safe-- > 0) {
        //每次处理一个frame，或者进入下一个frame
        if (tf(ind) >= curItem().seq.length) { finishCurrentFrame(); break; } else {
            let goresult=goSeq();
            if(goresult="enteringnext"){}
        }
    }

    return frames;
}
function pattern(arg = {}) {
    return arg;
}
pattern({
    name: "some",
    seq: ["a", { name: "b", valid: "d" }, ["branch1", "branch2", "branch3", ":label"]],
    onfail() { },
    onproceed() { }
})
//how to define Item?
//string: 