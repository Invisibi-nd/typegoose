import type { BeAnObject, IndexOptions } from './types';
/**
 * Defines an index (most likely compound) for this schema.
 * @param fields Which fields to give the Options
 * @param options Options to pass to MongoDB driver's createIndex() function
 * @example Example:
 * ```
 * @index({ article: 1, user: 1 }, { unique: true })
 * class Name {}
 * ```
 */
export declare function index<T = BeAnObject>(fields: T, options?: IndexOptions<T>): ClassDecorator;
export { index as Index };
