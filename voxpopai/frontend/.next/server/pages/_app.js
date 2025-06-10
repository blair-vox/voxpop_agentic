"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "(pages-dir-node)/./src/lib/albAuth.tsx":
/*!*****************************!*\
  !*** ./src/lib/albAuth.tsx ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider),\n/* harmony export */   useALBAuth: () => (/* binding */ useALBAuth),\n/* harmony export */   useAuth: () => (/* binding */ useAuth)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n\n\n// Local-dev stub – always unauthenticated\nconst defaultState = {\n    isAuthenticated: false,\n    user: null,\n    isLoading: false,\n    error: null\n};\nconst AuthCtx = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(defaultState);\nfunction AuthProvider({ children }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(AuthCtx.Provider, {\n        value: defaultState,\n        children: children\n    }, void 0, false, {\n        fileName: \"/Users/bconn/Library/Mobile Documents/com~apple~CloudDocs/Projects/VoxPop_Agentic/voxpopai/frontend/src/lib/albAuth.tsx\",\n        lineNumber: 21,\n        columnNumber: 10\n    }, this);\n}\nfunction useALBAuth() {\n    return (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthCtx);\n}\nconst useAuth = useALBAuth;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9saWIvYWxiQXV0aC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBa0Q7QUFTbEQsMENBQTBDO0FBQzFDLE1BQU1FLGVBQTBCO0lBQzlCQyxpQkFBaUI7SUFDakJDLE1BQU07SUFDTkMsV0FBVztJQUNYQyxPQUFPO0FBQ1Q7QUFFQSxNQUFNQyx3QkFBVVAsb0RBQWFBLENBQVlFO0FBRWxDLFNBQVNNLGFBQWEsRUFBRUMsUUFBUSxFQUFpQztJQUN0RSxxQkFBTyw4REFBQ0YsUUFBUUcsUUFBUTtRQUFDQyxPQUFPVDtrQkFBZU87Ozs7OztBQUNqRDtBQUVPLFNBQVNHO0lBQ2QsT0FBT1gsaURBQVVBLENBQUNNO0FBQ3BCO0FBRU8sTUFBTU0sVUFBVUQsV0FBVyIsInNvdXJjZXMiOlsiL1VzZXJzL2Jjb25uL0xpYnJhcnkvTW9iaWxlIERvY3VtZW50cy9jb21+YXBwbGV+Q2xvdWREb2NzL1Byb2plY3RzL1ZveFBvcF9BZ2VudGljL3ZveHBvcGFpL2Zyb250ZW5kL3NyYy9saWIvYWxiQXV0aC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCB9IGZyb20gJ3JlYWN0JztcblxuaW50ZXJmYWNlIEF1dGhTdGF0ZSB7XG4gIGlzQXV0aGVudGljYXRlZDogYm9vbGVhbjtcbiAgdXNlcjogYW55IHwgbnVsbDtcbiAgaXNMb2FkaW5nOiBib29sZWFuO1xuICBlcnJvcjogRXJyb3IgfCBudWxsO1xufVxuXG4vLyBMb2NhbC1kZXYgc3R1YiDigJMgYWx3YXlzIHVuYXV0aGVudGljYXRlZFxuY29uc3QgZGVmYXVsdFN0YXRlOiBBdXRoU3RhdGUgPSB7XG4gIGlzQXV0aGVudGljYXRlZDogZmFsc2UsXG4gIHVzZXI6IG51bGwsXG4gIGlzTG9hZGluZzogZmFsc2UsXG4gIGVycm9yOiBudWxsLFxufTtcblxuY29uc3QgQXV0aEN0eCA9IGNyZWF0ZUNvbnRleHQ8QXV0aFN0YXRlPihkZWZhdWx0U3RhdGUpO1xuXG5leHBvcnQgZnVuY3Rpb24gQXV0aFByb3ZpZGVyKHsgY2hpbGRyZW4gfTogeyBjaGlsZHJlbjogUmVhY3QuUmVhY3ROb2RlIH0pIHtcbiAgcmV0dXJuIDxBdXRoQ3R4LlByb3ZpZGVyIHZhbHVlPXtkZWZhdWx0U3RhdGV9PntjaGlsZHJlbn08L0F1dGhDdHguUHJvdmlkZXI+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXNlQUxCQXV0aCgpIHtcbiAgcmV0dXJuIHVzZUNvbnRleHQoQXV0aEN0eCk7XG59XG5cbmV4cG9ydCBjb25zdCB1c2VBdXRoID0gdXNlQUxCQXV0aDsgIl0sIm5hbWVzIjpbImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwiZGVmYXVsdFN0YXRlIiwiaXNBdXRoZW50aWNhdGVkIiwidXNlciIsImlzTG9hZGluZyIsImVycm9yIiwiQXV0aEN0eCIsIkF1dGhQcm92aWRlciIsImNoaWxkcmVuIiwiUHJvdmlkZXIiLCJ2YWx1ZSIsInVzZUFMQkF1dGgiLCJ1c2VBdXRoIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/lib/albAuth.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ MyApp)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_albAuth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/albAuth */ \"(pages-dir-node)/./src/lib/albAuth.tsx\");\n\n\n\nfunction MyApp({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_lib_albAuth__WEBPACK_IMPORTED_MODULE_2__.AuthProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"/Users/bconn/Library/Mobile Documents/com~apple~CloudDocs/Projects/VoxPop_Agentic/voxpopai/frontend/src/pages/_app.tsx\",\n            lineNumber: 8,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/Users/bconn/Library/Mobile Documents/com~apple~CloudDocs/Projects/VoxPop_Agentic/voxpopai/frontend/src/pages/_app.tsx\",\n        lineNumber: 7,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQTBCO0FBRW9CO0FBRS9CLFNBQVNFLE1BQU0sRUFBRUMsU0FBUyxFQUFFQyxTQUFTLEVBQVk7SUFDOUQscUJBQ0UsOERBQUNILHNEQUFZQTtrQkFDWCw0RUFBQ0U7WUFBVyxHQUFHQyxTQUFTOzs7Ozs7Ozs7OztBQUc5QiIsInNvdXJjZXMiOlsiL1VzZXJzL2Jjb25uL0xpYnJhcnkvTW9iaWxlIERvY3VtZW50cy9jb21+YXBwbGV+Q2xvdWREb2NzL1Byb2plY3RzL1ZveFBvcF9BZ2VudGljL3ZveHBvcGFpL2Zyb250ZW5kL3NyYy9wYWdlcy9fYXBwLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gJ25leHQvYXBwJztcbmltcG9ydCB7IEF1dGhQcm92aWRlciB9IGZyb20gJy4uL2xpYi9hbGJBdXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTXlBcHAoeyBDb21wb25lbnQsIHBhZ2VQcm9wcyB9OiBBcHBQcm9wcykge1xuICByZXR1cm4gKFxuICAgIDxBdXRoUHJvdmlkZXI+XG4gICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XG4gICAgPC9BdXRoUHJvdmlkZXI+XG4gICk7XG59ICJdLCJuYW1lcyI6WyJSZWFjdCIsIkF1dGhQcm92aWRlciIsIk15QXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("react/jsx-dev-runtime");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(pages-dir-node)/./src/pages/_app.tsx"));
module.exports = __webpack_exports__;

})();