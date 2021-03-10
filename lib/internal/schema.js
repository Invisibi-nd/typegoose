"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._buildSchema = void 0;
const mongoose = require("mongoose");
const logSettings_1 = require("../logSettings");
const typegoose_1 = require("../typegoose");
const constants_1 = require("./constants");
const data_1 = require("./data");
const processProp_1 = require("./processProp");
const utils_1 = require("./utils");
/**
 * Private schema builder out of class props
 * -> If you discover this, don't use this function, use Typegoose.buildSchema!
 * @param cl The not initialized Class
 * @param sch Already Existing Schema?
 * @param opt Options to override
 * @param isFinalSchema If it's the final schema to be built (defaults to `true`).
 * @returns Returns the Build Schema
 * @private
 */
function _buildSchema(cl, sch, opt, isFinalSchema = true, overwriteOptions) {
    var _a, _b, _c, _d;
    utils_1.assertionIsClass(cl);
    utils_1.assignGlobalModelOptions(cl); // to ensure global options are applied to the current class
    // Options sanity check
    opt = utils_1.mergeSchemaOptions(utils_1.isNullOrUndefined(opt) || typeof opt !== 'object' ? {} : opt, cl);
    const name = utils_1.getName(cl);
    logSettings_1.logger.debug('_buildSchema Called for %s with options:', name, opt);
    /** Simplify the usage */
    // DEV: here we support existingMongoose instance's schema
    const Schema = (_b = (_a = overwriteOptions === null || overwriteOptions === void 0 ? void 0 : overwriteOptions.existingMongoose) === null || _a === void 0 ? void 0 : _a.Schema) !== null && _b !== void 0 ? _b : mongoose.Schema;
    const ropt = (_c = Reflect.getMetadata(constants_1.DecoratorKeys.ModelOptions, cl)) !== null && _c !== void 0 ? _c : {};
    const schemaOptions = Object.assign({}, (_d = ropt === null || ropt === void 0 ? void 0 : ropt.schemaOptions) !== null && _d !== void 0 ? _d : {}, opt);
    const decorators = Reflect.getMetadata(constants_1.DecoratorKeys.PropCache, cl.prototype);
    if (!utils_1.isNullOrUndefined(decorators)) {
        for (const decorator of decorators.values()) {
            processProp_1.processProp(decorator);
        }
    }
    if (!data_1.schemas.has(name)) {
        data_1.schemas.set(name, {});
    }
    if (!(sch instanceof Schema)) {
        sch = new Schema(data_1.schemas.get(name), schemaOptions);
    }
    else {
        sch = sch.clone();
        sch.add(data_1.schemas.get(name));
    }
    sch.loadClass(cl);
    if (isFinalSchema) {
        /** Get Metadata for Nested Discriminators */
        const disMap = Reflect.getMetadata(constants_1.DecoratorKeys.NestedDiscriminators, cl);
        if (disMap instanceof Map) {
            for (const [key, discriminators] of disMap) {
                logSettings_1.logger.debug('Applying Nested Discriminators for:', key, discriminators);
                const path = sch.path(key);
                utils_1.assertion(!utils_1.isNullOrUndefined(path), new Error(`Path "${key}" does not exist on Schema of "${name}"`));
                utils_1.assertion(typeof path.discriminator === 'function', new Error(`There is no function called "discriminator" on schema-path "${key}" on Schema of "${name}"`));
                for (const { type: child, value: childName } of discriminators) {
                    const childSch = utils_1.getName(child) === name ? sch : typegoose_1.buildSchema(child);
                    const discriminatorKey = childSch.get('discriminatorKey');
                    if (childSch.path(discriminatorKey)) {
                        childSch.paths[discriminatorKey].options.$skipDiscriminatorCheck = true;
                    }
                    path.discriminator(utils_1.getName(child), childSch, childName);
                }
            }
        }
        // Hooks
        {
            /** Get Metadata for PreHooks */
            const preHooks = Reflect.getMetadata(constants_1.DecoratorKeys.HooksPre, cl);
            if (Array.isArray(preHooks)) {
                preHooks.forEach((obj) => sch.pre(obj.method, obj.func));
            }
            /** Get Metadata for PreHooks */
            const postHooks = Reflect.getMetadata(constants_1.DecoratorKeys.HooksPost, cl);
            if (Array.isArray(postHooks)) {
                postHooks.forEach((obj) => sch.post(obj.method, obj.func));
            }
        }
        /** Get Metadata for Virtual Populates */
        const virtuals = Reflect.getMetadata(constants_1.DecoratorKeys.VirtualPopulate, cl);
        if (virtuals instanceof Map) {
            for (const [key, options] of virtuals) {
                logSettings_1.logger.debug('Applying Virtual Populates:', key, options);
                sch.virtual(key, options);
            }
        }
        /** Get Metadata for indices */
        const indices = Reflect.getMetadata(constants_1.DecoratorKeys.Index, cl);
        if (Array.isArray(indices)) {
            for (const index of indices) {
                logSettings_1.logger.debug('Applying Index:', index);
                sch.index(index.fields, index.options);
            }
        }
        /** Get Metadata for Query Methods */
        const queryMethods = Reflect.getMetadata(constants_1.DecoratorKeys.QueryMethod, cl);
        if (queryMethods instanceof Map) {
            for (const [funcName, func] of queryMethods) {
                logSettings_1.logger.debug('Applying Query Method:', funcName, func);
                sch.query[funcName] = func;
            }
        }
        /** Get Metadata for indices */
        const plugins = Reflect.getMetadata(constants_1.DecoratorKeys.Plugins, cl);
        if (Array.isArray(plugins)) {
            for (const plugin of plugins) {
                logSettings_1.logger.debug('Applying Plugin:', plugin);
                sch.plugin(plugin.mongoosePlugin, plugin.options);
            }
        }
        // this method is to get the typegoose name of the model/class if it is user-handled (like buildSchema, then manually mongoose.model)
        sch.method('typegooseName', () => {
            return name;
        });
    }
    // add the class to the constructors map
    data_1.constructors.set(name, cl);
    return sch;
}
exports._buildSchema = _buildSchema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2ludGVybmFsL3NjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsZ0RBQXdDO0FBQ3hDLDRDQUEyQztBQWEzQywyQ0FBNEM7QUFDNUMsaUNBQStDO0FBQy9DLCtDQUE0QztBQUM1QyxtQ0FBZ0k7QUFFaEk7Ozs7Ozs7OztHQVNHO0FBQ0gsU0FBZ0IsWUFBWSxDQUMxQixFQUFLLEVBQ0wsR0FBMEIsRUFDMUIsR0FBNEIsRUFDNUIsZ0JBQXlCLElBQUksRUFDN0IsZ0JBQWdDOztJQUVoQyx3QkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVyQixnQ0FBd0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLDREQUE0RDtJQUUxRix1QkFBdUI7SUFDdkIsR0FBRyxHQUFHLDBCQUFrQixDQUFDLHlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFM0YsTUFBTSxJQUFJLEdBQUcsZUFBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRXpCLG9CQUFNLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVwRSx5QkFBeUI7SUFDekIsMERBQTBEO0lBQzFELE1BQU0sTUFBTSxHQUFHLE1BQUEsTUFBQSxnQkFBZ0IsYUFBaEIsZ0JBQWdCLHVCQUFoQixnQkFBZ0IsQ0FBRSxnQkFBZ0IsMENBQUUsTUFBTSxtQ0FBSSxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQzdFLE1BQU0sSUFBSSxHQUFrQixNQUFBLE9BQU8sQ0FBQyxXQUFXLENBQUMseUJBQWEsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLG1DQUFJLEVBQUUsQ0FBQztJQUN0RixNQUFNLGFBQWEsR0FBRyxN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