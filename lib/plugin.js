"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugins = exports.plugin = void 0;
const constants_1 = require("./internal/constants");
const utils_1 = require("./internal/utils");
const logSettings_1 = require("./logSettings");
/**
 * Add a Middleware-Plugin
 * @param mongoosePlugin The Plugin to plug-in
 * @param options Options for the Plugin, if any
 */
function plugin(mongoosePlugin, options) {
    // don't check if options is an object, because any plugin could make it anything
    return (target) => {
        var _a, _b;
        logSettings_1.logger.info('Adding plugin "%s" to "%s" with options: "%o"', (_a = mongoosePlugin === null || mongoosePlugin === void 0 ? void 0 : mongoosePlugin.name) !== null && _a !== void 0 ? _a : '<anonymous>', utils_1.getName(target), options);
        const plugins = Array.from((_b = Reflect.getMetadata(constants_1.DecoratorKeys.Plugins, target)) !== null && _b !== void 0 ? _b : []);
        plugins.push({ mongoosePlugin, options });
        Reflect.defineMetadata(constants_1.DecoratorKeys.Plugins, plugins, target);
    };
}
exports.plugin = plugin;
exports.Plugins = plugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvREFBcUQ7QUFDckQsNENBQTJDO0FBQzNDLCtDQUF1QztBQUd2Qzs7OztHQUlHO0FBQ0gsU0FBZ0IsTUFBTSxDQUFxRCxjQUFxQixFQUFFLE9BQWlCO0lBQ2pILGlGQUFpRjtJQUNqRixPQUFPLENBQUMsTUFBVyxFQUFFLEVBQUU7O1FBQ3JCLG9CQUFNLENBQUMsSUFBSSxDQUFDLCtDQUErQyxFQUFFLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLElBQUksbUNBQUksYUFBYSxFQUFFLGVBQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5SCxNQUFNLE9BQU8sR0FBeUIsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFBLE9BQU8sQ0FBQyxXQUFXLENBQUMseUJBQWEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLG1DQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNHLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMxQyxPQUFPLENBQUMsY0FBYyxDQUFDLHlCQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBUkQsd0JBUUM7QUFHa0IseUJBQU8ifQ==