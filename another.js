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
    let tf = frames[frames.length - 1];
    mainloop: for (let i = 0; i < slices.length || elsething; i++) {

        if (tf[ind] > pts[tf[itemname]].seq.length) { onprocess(); break; }
        switch (typeof pts[tf[itemname]].seq[tf[ind]]) {
            case "string" :let result = matchSeq(slices, pointer, pts[tf[itemname]].seq[tf[ind]]);

                if (result.gap == -1) onfail();
                else {
                    pointer += result.gap;
                    tf[ind]++;

                    if (capture) setCapture;
                }
                break;
            case "object":
                if(Array.isArray(pts[tf[itemname]].seq[tf[ind]])){
                    for(let i of nextchoice){
                        if(checkmatched){
                            newframe;break;}
                    }
                }else{checknextslice(slice,pointer);
                    frames.push([itemname,balabala])}
                
                break;
            
        }


        for (let j = 0; j < 1000; j++) {
            top = frames[frames.length - 1];
            top[1]++;
            if (capture) top[2].cap1 = "value";

            if (true) processtheframe();
            else failed();
        }
    }
    finishblock: {
        let result = top[2];
        frames.pop()
        top = frames[frames.length - 1]
        top[2][getname(top[2][top[1]])] = result;
    }
    each: {
        pointer++;
        check(pts[top[0]][top[1]], slices);
        if (false) onfail;
        if (true) onprocess;
    }
    check: {
        switch (typeof pts[top[0]][top[1]]) {
            case "string": break;
            case "object": break;
        }
    }
    return frames;
}
function pattern(arg = {}) {
    return arg;
}
pattern({
    name: "some",
    seq: ["a", { name: "b", valid: "d" }, ["branch1 as ", "branch2 as ", "branch3 as "]],
    onfail() { },
    onproceed() { }
})