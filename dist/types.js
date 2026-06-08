"use strict";
// ===== Core Search Engine Types =====
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchIntent = exports.QueryType = void 0;
/** Query types supported by the search engine */
var QueryType;
(function (QueryType) {
    QueryType["BOOLEAN"] = "boolean";
    QueryType["PHRASE"] = "phrase";
    QueryType["FUZZY"] = "fuzzy";
    QueryType["SEMANTIC"] = "semantic";
    QueryType["NATURAL"] = "natural";
})(QueryType || (exports.QueryType = QueryType = {}));
/** Search intent classification */
var SearchIntent;
(function (SearchIntent) {
    SearchIntent["NAVIGATIONAL"] = "navigational";
    SearchIntent["INFORMATIONAL"] = "informational";
    SearchIntent["TRANSACTIONAL"] = "transactional";
})(SearchIntent || (exports.SearchIntent = SearchIntent = {}));
//# sourceMappingURL=types.js.map