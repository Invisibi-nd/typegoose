"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processProp = void 0;
const logSettings_1 = require("../logSettings");
const typegoose_1 = require("../typegoose");
const constants_1 = require("./constants");
const data_1 = require("./data");
const errors_1 = require("./errors");
const utils = require("./utils");
/**
 * Function that is the actual processing of the prop's (used for caching)
 * @param input All the options needed for prop's
 */
function processProp(input) {
    var _a, _b, _c;
    const { key, target } = input;
    const name = utils.getName(target);
    const rawOptions = Object.assign({}, input.options);
    let Type = Reflect.getMetadata(constants_1.DecoratorKeys.Type, target, key);
    const propKind = (_a = input.whatis) !== null && _a !== void 0 ? _a : detectWhatIsIt(Type);
    logSettings_1.logger.debug('Starting to process "%s.%s"', name, key);
    utils.assertion(typeof key === 'string', new Error(`Property Key in typegoose cannot be an symbol! (${name}.${String(key)})`));
    optionDeprecation(rawOptions);
    {
        // soft errors & "type"-alias mapping
        switch (propKind) {
            case constants_1.WhatIsIt.NONE:
                break;
            case constants_1.WhatIsIt.ARRAY:
                // set the "Type" to undefined, if "ref" or "refPath" are defined, otherwise the "refType" will be wrong
                if (('ref' in rawOptions || 'refPath' in rawOptions) && !('type' in rawOptions)) {
                    Type = undefined;
                }
                break;
            case constants_1.WhatIsIt.MAP:
                break;
        }
    }
    if (!utils.isNullOrUndefined(rawOptions.type)) {
        logSettings_1.logger.info('Prop Option "type" is set to ', rawOptions.type);
        const gotType = utils.getType(rawOptions.type);
        Type = gotType.type;
        if (gotType.dim > 0) {
            rawOptions.dim = gotType.dim;
        }
        delete rawOptions.type;
    }
    // prevent "infinite" buildSchema loop / Maximum Stack size exceeded
    if (Type === target.constructor) {
        throw new TypeError('It seems like the type used is the same as the target class, which is not supported\n' +
            `Please look at https://github.com/typegoose/typegoose/issues/42 for more information [E004]`);
    }
    // map to correct buffer type, otherwise it would result in "Mixed"
    if (Type === typegoose_1.mongoose.Types.Buffer) {
        Type = typegoose_1.mongoose.Schema.Types.Buffer;
    }
    // confirm that "WhatIsIt" is an ARRAY and that the Type is still an *ARRAY and set them to Mixed
    // for issues like https://github.com/typegoose/typegoose/issues/300
    if (propKind === constants_1.WhatIsIt.ARRAY && detectWhatIsIt(Type) === constants_1.WhatIsIt.ARRAY) {
        logSettings_1.logger.debug('Type is still *ARRAY, defaulting to Mixed');
        Type = typegoose_1.mongoose.Schema.Types.Mixed;
    }
    if (utils.isNotDefined(Type)) {
        typegoose_1.buildSchema(Type);
    }
    if ('discriminators' in rawOptions) {
        logSettings_1.logger.debug('Found option "discriminators" in "%s.%s"', name, key);
        const gotType = utils.getType(rawOptions.discriminators, true);
        utils.assertion(gotType.dim === 1, new Error(`"PropOptions.discriminators" dosnt support Arrays higher and lower than 1 (got "${gotType.dim}" dimensions at "${name}.${key}") [E020]`));
        const discriminators = gotType.type.map((val, index) => {
            if (utils.isConstructor(val)) {
                return { type: val };
            }
            if (typeof val === 'object') {
                if (!('type' in val)) {
                    throw new Error(`"${name}.${key}" discriminator index "${index}" is an object, but does not contain the "type" property!`);
                }
                return val;
            }
            throw new Error(`"${name}.${key}" discriminators index "${index}" is not an object or an constructor!`);
        });
        const disMap = new Map((_b = Reflect.getMetadata(constants_1.DecoratorKeys.NestedDiscriminators, target.constructor)) !== null && _b !== void 0 ? _b : []);
        disMap.set(key, discriminators);
        Reflect.defineMetadata(constants_1.DecoratorKeys.NestedDiscriminators, disMap, target.constructor);
        delete rawOptions.discriminators;
    }
    // allow setting the type asynchronously
    if ('ref' in rawOptions) {
        const gotType = utils.getType(rawOptions.ref);
        utils.assertion(gotType.dim === 0, new Error(`"PropOptions.ref" dosnt support Arrays (got "${gotType.dim}" dimensions at "${name}.${key}") [E021]`));
        rawOptions.ref = gotType.type;
        utils.assertion(!utils.isNullOrUndefined(rawOptions.ref), new Error(`Option "ref" for "${name}.${key}" is null/undefined! [E005]`));
        rawOptions.ref =
            typeof rawOptions.ref === 'string'
                ? rawOptions.ref
                : utils.isConstructor(rawOptions.ref)
                    ? utils.getName(rawOptions.ref)
                    : rawOptions.ref;
    }
    if (utils.isWithVirtualPOP(rawOptions)) {
        if (!utils.includesAllVirtualPOP(rawOptions)) {
            throw new errors_1.NotAllVPOPElementsError(name, key);
        }
        const virtuals = new Map((_c = Reflect.getMetadata(constants_1.DecoratorKeys.VirtualPopulate, target.constructor)) !== null && _c !== void 0 ? _c : []);
        virtuals.set(key, rawOptions);
        Reflect.defineMetadata(constants_1.DecoratorKeys.VirtualPopulate, virtuals, target.constructor);
        return;
    }
    if ('justOne' in rawOptions) {
        logSettings_1.logger.warn(`Option "justOne" is defined in "${name}.${key}" but no Virtual-Populate-Options!\n` +
            'Look here for more: https://typegoose.github.io/typegoose/docs/api/virtuals#virtual-populate');
    }
    const schemaProp = utils.initProperty(name, key, propKind);
    if (!utils.isNullOrUndefined(rawOptions.set) || !utils.isNullOrUndefined(rawOptions.get)) {
        utils.assertion(typeof rawOptions.set === 'function', new TypeError(`"${name}.${key}" does not have a set function! [E007]`));
        utils.assertion(typeof rawOptions.get === 'function', new TypeError(`"${name}.${key}" does not have a get function! [E007]`));
        // use an compiled Schema if the type is an Nested Class
        const useType = data_1.schemas.has(utils.getName(Type)) ? typegoose_1.buildSchema(Type) : Type;
        switch (propKind) {
            case constants_1.WhatIsIt.ARRAY:
                schemaProp[key] = Object.assign(Object.assign({}, schemaProp[key][0]), utils.mapArrayOptions(rawOptions, useType, target, key));
                return;
            case constants_1.WhatIsIt.MAP:
                const mapped = utils.mapOptions(rawOptions, useType, target, key);
                schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), mapped.outer), { type: Map, of: Object.assign({ type: useType }, mapped.inner) });
                return;
            case constants_1.WhatIsIt.NONE:
                schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), rawOptions), { type: useType });
                return;
            default:
                /* istanbul ignore next */ // ignore because this case should really never happen (typescript prevents this)
                throw new Error(`"${propKind}"(whatis(primitive)) is invalid for "${name}.${key}" [E013]`);
        }
    }
    // use "Type" if it is an suitable ref-type, otherwise default back to "ObjectId"
    const refType = utils.isAnRefType(Type) ? Type : typegoose_1.mongoose.Schema.Types.ObjectId;
    if ('ref' in rawOptions) {
        const ref = rawOptions.ref;
        delete rawOptions.ref;
        switch (propKind) {
            case constants_1.WhatIsIt.ARRAY:
                schemaProp[key] = utils.createArrayFromDimensions(rawOptions, Object.assign(Object.assign(Object.assign({}, schemaProp[key][0]), { type: refType, ref }), rawOptions), name, key);
                break;
            case constants_1.WhatIsIt.NONE:
                schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), { type: refType, ref }), rawOptions);
                break;
            default:
                throw new TypeError(`"ref" is not supported for "${propKind}"! (${name}, ${key})`);
        }
        return;
    }
    const refPath = rawOptions.refPath;
    if (refPath) {
        utils.assertion(typeof refPath === 'string', new TypeError(`"refPath" for "${name}, ${key}" should be of type String! [E008]`));
        delete rawOptions.refPath;
        switch (propKind) {
            case constants_1.WhatIsIt.ARRAY:
                schemaProp[key] = utils.createArrayFromDimensions(rawOptions, Object.assign(Object.assign(Object.assign({}, schemaProp[key][0]), { type: refType, refPath }), rawOptions), name, key);
                break;
            case constants_1.WhatIsIt.NONE:
                schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), { type: refType, refPath }), rawOptions);
                break;
            default:
                throw new TypeError(`"refPath" is not supported for "${propKind}"! (${name}, ${key})`);
        }
        return;
    }
    // check if Type is actually a real working Type
    if (utils.isNullOrUndefined(Type) || typeof Type !== 'function') {
        throw new errors_1.InvalidTypeError(name, key, Type);
    }
    const enumOption = rawOptions.enum;
    if (!utils.isNullOrUndefined(enumOption)) {
        // check if the supplied value is already "mongoose-consumeable"
        if (!Array.isArray(enumOption)) {
            if (Type === String || Type === typegoose_1.mongoose.Schema.Types.String) {
                rawOptions.enum = Object.entries(enumOption) // get all key-value pairs of the enum
                    // no reverse-filtering because if it is full of strings, there is no reverse mapping
                    .map(([enumKey, enumValue]) => {
                    // convert key-value pairs to an mongoose-usable enum
                    // safeguard, this should never happen because TypeScript only sets "design:type" to "String"
                    // if the enum is full of strings
                    if (typeof enumValue !== 'string') {
                        throw new errors_1.NotStringTypeError(name, key, enumKey, typeof enumValue);
                    }
                    return enumValue;
                });
            }
            else if (Type === Number || Type === typegoose_1.mongoose.Schema.Types.Number) {
                rawOptions.enum = Object.entries(enumOption) // get all key-value pairs of the enum
                    // filter out the "reverse (value -> name) mappings"
                    // https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings
                    .filter(([enumKey, enumValue], _i, arr) => {
                    // safeguard, this should never happen because typescript only sets "design:type" to "Number"
                    // if the enum is full of numbers
                    if (utils.isNullOrUndefined(enumValue) || arr.findIndex(([k]) => k === enumValue.toString()) <= -1) {
                        // if there is no reverse mapping, throw an error
                        throw new errors_1.NotNumberTypeError(name, key, enumKey, typeof enumValue);
                    }
                    return typeof enumValue === 'number';
                })
                    .map(([enumKey, enumValue]) => {
                    // convert key-value pairs to an mongoose-useable enum
                    if (typeof enumValue !== 'number') {
                        throw new errors_1.NotNumberTypeError(name, key, enumKey, typeof enumValue);
                    }
                    return enumValue;
                });
            }
            else {
                // this will happen if the enum type is not "String" or "Number"
                // most likely this error happened because the code got transpiled with babel or "tsc --transpile-only"
                throw new Error(`Invalid type used for enums!, got: "${Type}" (${name}.${key}) [E012]` +
                    "Is the code transpiled with Babel or 'tsc --transpile-only' or 'ts-node --transpile-only'?\n" +
                    'See https://typegoose.github.io/typegoose/docs/api/decorators/prop/#enum');
            }
        }
    }
    if (!utils.isNullOrUndefined(rawOptions.addNullToEnum)) {
        rawOptions.enum = Array.isArray(rawOptions.enum) ? rawOptions.enum : [];
        rawOptions.enum.push(null);
        delete rawOptions.addNullToEnum;
    }
    {
        let included = utils.isWithStringValidate(rawOptions);
        if (!utils.isString(Type)) {
            // warn if String-Validate options are included, but is not string
            utils.warnNotCorrectTypeOptions(name, key, 'String', 'String-Validate', included);
        }
        included = utils.isWithStringTransform(rawOptions);
        if (!utils.isString(Type)) {
            // warn if String-Transform options are included, but is not string
            utils.warnNotCorrectTypeOptions(name, key, 'String', 'String-Transform', included);
        }
        included = utils.isWithNumberValidate(rawOptions);
        if (!utils.isNumber(Type)) {
            // warn if Number-Validate options are included, but is not number
            utils.warnNotCorrectTypeOptions(name, key, 'Number', 'Number-Validate', included);
        }
        included = utils.isWithEnumValidate(rawOptions);
        if (!utils.isString(Type) && !utils.isNumber(Type)) {
            // warn if "enum" is included, but is not Number or String
            utils.warnNotCorrectTypeOptions(name, key, 'String | Number', 'extra', included);
        }
    }
    /** Is this Type (/Class) in the schemas Map? */
    const isInSchemas = data_1.schemas.has(utils.getName(Type));
    if (utils.isPrimitive(Type)) {
        if (utils.isObject(Type, true)) {
            utils.warnMixed(target, key);
        }
        switch (propKind) {
            case constants_1.WhatIsIt.ARRAY:
                schemaProp[key] = Object.assign(Object.assign({}, schemaProp[key][0]), utils.mapArrayOptions(rawOptions, Type, target, key));
                return;
            case constants_1.WhatIsIt.MAP:
                const mapped = utils.mapOptions(rawOptions, Type, target, key);
                schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), mapped.outer), { type: Map, of: Object.assign({ type: Type }, mapped.inner) });
                return;
            case constants_1.WhatIsIt.NONE:
                schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), rawOptions), { type: Type });
                return;
            default:
                /* istanbul ignore next */ // ignore because this case should really never happen (typescript prevents this)
                throw new Error(`"${propKind}"(whatis(primitive)) is invalid for "${name}.${key}" [E013]`);
        }
    }
    // If the 'Type' is not a 'Primitive Type' and no subschema was found treat the type as 'Object'
    // so that mongoose can store it as nested document
    if (utils.isObject(Type) && !isInSchemas) {
        utils.warnMixed(target, key);
        logSettings_1.logger.warn('if someone can see this message, please open an new issue at https://github.com/typegoose/typegoose/issues with reproduction code for tests');
        schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), rawOptions), { type: typegoose_1.mongoose.Schema.Types.Mixed });
        return;
    }
    const virtualSchema = typegoose_1.buildSchema(Type);
    switch (propKind) {
        case constants_1.WhatIsIt.ARRAY:
            schemaProp[key] = Object.assign(Object.assign({}, schemaProp[key][0]), utils.mapArrayOptions(rawOptions, virtualSchema, target, key, Type));
            return;
        case constants_1.WhatIsIt.MAP:
            const mapped = utils.mapOptions(rawOptions, virtualSchema, target, key, Type);
            schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), mapped.outer), { type: Map, of: Object.assign({ type: virtualSchema }, mapped.inner) });
            return;
        case constants_1.WhatIsIt.NONE:
            schemaProp[key] = Object.assign(Object.assign(Object.assign({}, schemaProp[key]), rawOptions), { type: virtualSchema });
            return;
        default:
            /* istanbul ignore next */ // ignore because this case should really never happen (typescript prevents this)
            throw new Error(`"${propKind}"(whatis(subSchema)) is invalid for "${name}.${key}" [E013]`);
    }
}
exports.processProp = processProp;
/**
 * Check for deprecated options, and if needed process them
 * @param options
 */
function optionDeprecation(options) { }
/**
 * Detect "WhatIsIt" based on "Type"
 * @param Type The Type used for detection
 */
function detectWhatIsIt(Type) {
    logSettings_1.logger.debug('Detecting WhatIsIt');
    if (Type === Array ||
        Type === typegoose_1.mongoose.Types.Array ||
        Type === typegoose_1.mongoose.Schema.Types.Array ||
        Type === typegoose_1.mongoose.Types.DocumentArray ||
        Type === typegoose_1.mongoose.Schema.Types.DocumentArray) {
        return constants_1.WhatIsIt.ARRAY;
    }
    if (Type === Map || Type === typegoose_1.mongoose.Types.Map || Type === typegoose_1.mongoose.Schema.Types.Map) {
        return constants_1.WhatIsIt.MAP;
    }
    return constants_1.WhatIsIt.NONE;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc1Byb3AuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaW50ZXJuYWwvcHJvY2Vzc1Byb3AudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0RBQXdDO0FBQ3hDLDRDQUFxRDtBQVNyRCwyQ0FBc0Q7QUFDdEQsaUNBQWlDO0FBQ2pDLHFDQUE2RztBQUM3RyxpQ0FBaUM7QUFFakM7OztHQUdHO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLEtBQWdDOztJQUMxRCxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztJQUM5QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25DLE1BQU0sVUFBVSxHQUFpQixNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEUsSUFBSSxJQUFJLEdBQW9CLE9BQU8sQ0FBQyxXQUFXLENBQUMseUJBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pGLE1BQU0sUUFBUSxHQUFHLE1BQUEsS0FBSyxDQUFDLE1BQU0sbUNBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXRELG9CQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsSUFBSSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUUvSCxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUU5QjtRQUNFLHFDQUFxQztRQUNyQyxRQUFRLFFBQVEsRUFBRTtZQUNoQixLQUFLLG9CQUFRLENBQUMsSUFBSTtnQkFDaEIsTUFBTTtZQUNSLEtBQUssb0JB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