"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const App = () => {
    const greeting = "Hello World";
    const numberInput = 3;
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h1", { children: [greeting, " is the Hello"] }), (0, jsx_runtime_1.jsx)("p", { children: numberInput })] }));
};
exports.default = App;
