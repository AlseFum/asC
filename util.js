const names = {
    SPACE: "<Space>",
    ENTER: "<Enter>",
    INDENT:"<Indent>",
    NUMBER: "<Number>",
    IDENTIFIER: "<Identifier>",
    SYMBOL: "<Symbol>",
    BRACKET: "<Bracket>",
    STRING: "<String>",
    SEMI: "<Semicolon>",

    EOF: 127
}
export const SIGN={
    sp:names.SPACE,
    id:names.IDENTIFIER,
    str:names.STRING,
    sym:names.SYMBOL,
    br:names.BRACKET,

    ...names
}
export const fail=[false,0]

export function jlog(...args){
    console.log(...args.map(a=>JSON.stringify(a,null,2)))
}
