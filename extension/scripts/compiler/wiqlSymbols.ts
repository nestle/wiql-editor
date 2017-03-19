export abstract class Symbol { }
/** symbols generated by the lexer */
export abstract class Token extends Symbol {
    readonly endColumn: number;
    // include line and column numbers for better debugging.
    constructor(readonly line: number, readonly startColumn: number, readonly text: string) {
        super();
        this.endColumn = text.length + startColumn;
    }
}
// Keywords
export class Select extends Token { }
export class From extends Token { }
export class Where extends Token { }
export class OrderBy extends Token { }
export class Asc extends Token { }
export class Desc extends Token { }
export class Asof extends Token { }
export class Not extends Token { }
export class Ever extends Token { }
export class In extends Token { }
export class Like extends Token { }
export class Under extends Token { }
export class WorkItems extends Token { }
export class WorkItemLinks extends Token { }
export class And extends Token { }
export class Or extends Token { }
export class Contains extends Token { }
export class Words extends Token { }
export class Group extends Token { }
export class True extends Token { }
export class False extends Token { }
// Operators
export class RParen extends Token { }
export class LParen extends Token { }
export class RSqBracket extends Token { }
export class LSqBracket extends Token { }
export class Comma extends Token { }
export class Equals extends Token { }
export class NotEquals extends Token { }
export class GreaterThan extends Token { }
export class LessThan extends Token { }
export class GreaterOrEq extends Token { }
export class LessOrEq extends Token { }
export class Minus extends Token { }
export class Plus extends Token { }

export class UnexpectedToken extends Token { }
export class String extends Token { }
export class NonterminatingString extends Token { }
export class Identifier extends Token { }
export class Digits extends Token { }
export class Variable extends Token { }

export class Mode extends Token { }
export class MustContain extends Token { }
export class MayContain extends Token { }
export class DoesNotContain extends Token { }
export class Source extends Token { }
export class Target extends Token { }
export class Dot extends Token { }
export class Recursive extends Token { }
export class ReturnMatchingChildren extends Token { }
export class EOF extends Token {
    constructor(line: number, startColumn: number, readonly prev: Token) {
        super(line, startColumn, "");
    }
}

export abstract class SymbolTree extends Symbol {
    constructor(readonly inputs: Symbol[]) {
        super();
    }
    /**
     * Error checkers work better if each tree symbol has its component types as properties
     * so we want to create properties with the relevant data for each SymbolTree 
     * and autowire it by tye type of type of the property
     * 
     * However typescript does not type reflection that can handle union types during refelction
     * so we have to manually wire the properties of each symbol tree in each constructor.
     */
    protected getInput(types: Function | Function[], occurance = 1): any {
        let count = 0;
        if (types instanceof Function) {
            types = [types];
        }
        for (let input of this.inputs) {
            for (let type of types) {
                if (input instanceof type && ++count === occurance) {
                    return input;
                }
            }
        }
        return null;
    }
}

export class Number extends SymbolTree {
    public readonly digits: Digits;
    public readonly minus?: Minus;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.digits = super.getInput(Digits);
        this.minus = super.getInput(Minus);
    }

}
export class Field extends SymbolTree {
    public readonly identifier: Identifier;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.identifier = super.getInput(Identifier);
    }
}
export class ContainsWords extends SymbolTree {
    public readonly contains: Contains;
    public readonly words: Words;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.contains = super.getInput(Contains);
        this.words = super.getInput(Words);
    }
}
export class InGroup extends SymbolTree { }
export class DateTime extends SymbolTree {
    public readonly dateString: String;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.dateString = super.getInput(String);
    }
}
export class OrderByFieldList extends SymbolTree {
    public readonly field: Field;
    public readonly ascDesc?: Asc | Desc;
    public readonly restOfList?: OrderByFieldList;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.field = super.getInput(Field);
        this.ascDesc = super.getInput([Asc, Desc]);
        this.restOfList = super.getInput(OrderByFieldList);
    }
}
export class FieldList extends SymbolTree {
    public readonly field: Field;
    public readonly restOfList?: FieldList;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.field = super.getInput(Field);
        this.restOfList = super.getInput(FieldList);
    }
}
export class ConditionalOperator extends SymbolTree {
    public readonly conditionToken: Equals | NotEquals | GreaterThan | GreaterOrEq | LessThan | LessOrEq | Contains | ContainsWords | Like | Under | InGroup | Ever;
    public readonly ever?: Ever;
    public readonly not?: Not;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.conditionToken = super.getInput([Equals, NotEquals, GreaterThan, GreaterOrEq, LessThan, LessOrEq, Contains, ContainsWords, Like, Under, InGroup, Ever]);
        this.ever = super.getInput([Ever]);
        this.not = super.getInput([Not]);
    }
}
export class Value extends SymbolTree {
    public readonly value: Number | String | DateTime | Variable | True | False | Field;
    public readonly operator?: Plus | Minus;
    public readonly num?: Number;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.value = super.getInput([Number, String, DateTime, Variable, True, False, Field]);
        this.operator = super.getInput([Plus, Minus]);
        this.num = super.getInput(Number);
    }
}
export class ValueList extends SymbolTree {
    public readonly value: Value;
    public readonly restOfList?: ValueList;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.value = super.getInput(Value);
        this.restOfList = super.getInput(ValueList);
    }
}
/** Combines the expression[1 - 4] from ebnf into one */
export class LogicalExpression extends SymbolTree {
    public readonly condition: ConditionalExpression;
    public readonly everNot?: Ever | Not;
    public readonly orAnd?: And | Or;
    public readonly expression?: LogicalExpression;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.condition = super.getInput(ConditionalExpression);
        this.everNot = super.getInput([Ever, Not]);
        this.orAnd = super.getInput([And, Or]);
        this.expression = super.getInput(LogicalExpression);
    }
}
export class ConditionalExpression extends SymbolTree {
    public readonly expression?: LogicalExpression;

    public readonly field?: Field;

    public readonly conditionalOperator?: ConditionalOperator;
    public readonly inOperator?: In;
    public readonly value?: Value;

    public readonly not?: Not;
    public readonly valueList?: ValueList;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.expression = super.getInput(LogicalExpression);
        this.field = super.getInput(Field);
        this.conditionalOperator = super.getInput(ConditionalOperator);
        this.inOperator = super.getInput(In);
        this.value = super.getInput(Value);
        this.not = super.getInput(Not);
        this.valueList = super.getInput(ValueList);
    }
}
export class FlatSelect extends SymbolTree {
    public readonly fieldList: FieldList;
    public readonly whereExp?: LogicalExpression;
    public readonly orderBy?: OrderByFieldList;
    public readonly asOf?: DateTime;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.fieldList = super.getInput(FieldList);
        this.whereExp = super.getInput(LogicalExpression);
        this.orderBy = super.getInput(OrderByFieldList);
        this.asOf = super.getInput(DateTime);
    }
}
export class SourcePrefix extends SymbolTree {
    public readonly source: Source;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.source = super.getInput(Source);
    }
}
export class TargetPrefix extends SymbolTree {
    public readonly target: Target;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.target = super.getInput(Target);
    }
}
export class LinkCondition extends SymbolTree {
    public readonly expression?: LinkExpression;

    public readonly prefix?: SourcePrefix | TargetPrefix;
    public readonly field?: Field;

    public readonly conditionalOperator?: ConditionalOperator;
    public readonly inOperator?: In;
    public readonly value?: Value;

    public readonly not?: Not;
    public readonly valueList?: ValueList;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.expression = super.getInput(LinkExpression);
        this.prefix = super.getInput([SourcePrefix, TargetPrefix]);
        this.field = super.getInput(Field);
        this.conditionalOperator = super.getInput(ConditionalOperator);
        this.inOperator = super.getInput(In);
        this.value = super.getInput(Value);
        this.not = super.getInput(Not);
        this.valueList = super.getInput(ValueList);
    }
}
export class LinkExpression extends SymbolTree {
    public readonly condition: LinkCondition;
    public readonly everNot?: Ever | Not;
    public readonly orAnd?: And | Or;
    public readonly expression?: LinkExpression;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.condition = super.getInput(LinkCondition);
        this.everNot = super.getInput([Ever, Not]);
        this.orAnd = super.getInput([And, Or]);
        this.expression = super.getInput(LinkExpression);
    }
}
export class LinkOrderByFieldList extends SymbolTree {
    public readonly prefix?: SourcePrefix | TargetPrefix;
    public readonly field: Field;
    public readonly ascDesc: Asc | Desc;
    public readonly restOfList?: LinkOrderByFieldList;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.prefix = super.getInput([SourcePrefix, TargetPrefix]);
        this.field = super.getInput(Field);
        this.ascDesc = super.getInput([Asc, Desc]);
        this.restOfList = super.getInput([LinkOrderByFieldList]);
    }
}
export class OneHopSelect extends SymbolTree {
    public readonly fieldList: FieldList;
    public readonly whereExp?: LinkExpression;
    public readonly orderBy?: LinkOrderByFieldList;
    public readonly asOf?: DateTime;
    public readonly mode?: MustContain | MayContain | DoesNotContain;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.fieldList = super.getInput(FieldList);
        this.whereExp = super.getInput(LinkExpression);
        this.orderBy = super.getInput(LinkOrderByFieldList);
        this.asOf = super.getInput(DateTime);
        this.mode = super.getInput([MustContain, MayContain, DoesNotContain]);
    }
}
export class RecursiveSelect extends SymbolTree {
    public readonly fieldList: FieldList;
    public readonly whereExp?: LinkExpression;
    public readonly orderBy?: LinkOrderByFieldList;
    public readonly asOf?: DateTime;
    public readonly recursive?: Recursive;
    public readonly matchingChildren?: ReturnMatchingChildren;
    constructor(inputs: Symbol[]) {
        super(inputs);
        this.fieldList = super.getInput(FieldList);
        this.whereExp = super.getInput(LinkExpression);
        this.orderBy = super.getInput(LinkOrderByFieldList);
        this.asOf = super.getInput(DateTime);
        this.recursive = super.getInput(Recursive);
        this.matchingChildren = super.getInput(ReturnMatchingChildren);
    }
}
// Link symbols not copied as workItemLink queries are not supported yet

export function getSymbolName(symbolClass: Function): string {
    const str: string = symbolClass.toString();
    const match = str.match(/function (\S+)(?=\()/);
    if (match) {
        return match[1];
    }
    throw new Error("type is not a function");
}
export function isTokenClass(symbolClass: Function): boolean {
    return symbolClass.prototype.__proto__.constructor === Token;
}
