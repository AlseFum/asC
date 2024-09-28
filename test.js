import { test1,test_item } from "./test1.js";
import {fndecl, program,stmt} from "./nnoth.js";
//simple test
test1()
import fs from "fs"
import path from "path";
function readDirectory(dir,callback) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            return console.error(`无法读取目录: ${err}`);
        }

        files.forEach(file => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    return console.error(`无法获取文件信息: ${err}`);
                }

                if (stats.isDirectory()) {
                    // 如果是目录，递归读取
                    readDirectory(filePath);
                } else {
                    // 如果是文件，输出文件路径
                    callback(filePath);
                }
            });
        });
    });
}

// 使用示例
const directoryPath = './usecase'; // 替换为你的目录路径
readDirectory(directoryPath,i=>{
    fs.readFile(i,(err,data)=>{
        if(err) throw err
       if(0) test_item(data.toString(),program,"File testing:"+i)
    })
});
