import { FuncDecl, Stmt, StmtBlock, } from "./parser.js";
import { asCtoJS } from "./traverse.js";
import { testChar,testText ,_seq,parse} from "./util.js";
function j(n){return JSON.stringify(n,null,4)}
let exampleCode=`
fn main(args){
    console.log(args);;;;;;;;;;;;;;;;;;;;;;;;;
}
`
console.log(testText(exampleCode,FuncDecl))
let damn=`{console.log(args);}
`
console.log(testText(damn,StmtBlock))
let tr=`
{
    let ui=23;
    console.log(23);
    fn main(args){
        let ddd=66;
        splce(ddd)
    };
}`
console.log(testText(tr,StmtBlock))
let returnExp=`return 1;`
console.log(testText(returnExp,Stmt))

let fi=`{
    fn main(a){
        while(!a+1){
            console.log(a);
            continue;
            a=a+1;
            if(a){break};
        };
        a("d");
        c(wdnmd);
        return "seemed passed"
    };
}`
console.log(testText(fi,StmtBlock))
console.log(asCtoJS(parse(fi,StmtBlock)))

let clip=`{
let a=23;
console.log(a+67+"hello")}`
eval(asCtoJS(parse(clip,StmtBlock)))