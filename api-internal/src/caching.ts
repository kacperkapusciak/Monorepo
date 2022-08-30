import { Db } from 'mongodb'
// import config from './config'
import { RequestContext } from './types'

import NodeCache from 'node-cache'
const nodeCache = new NodeCache()

const cacheType = process.env.CACHE_TYPE === 'local' ? 'local' : 'redis'

type DynamicComputeCall = (...args: any[]) => Promise<any>

type ArgumentTypes<F> = F extends (...args: infer A) => Promise<any> ? A : never

type ResultType<F> = F extends (...args: any[]) => infer P
    ? P extends Promise<infer R>
        ? R
        : never
    : never

/**
 * Compute a cache key from a function and its arguments,
 * the function should have a name in order to generate a proper key.
 */
export const computeKey = (func: Function, funcOptions?: any) => {
    const serializedOptions = funcOptions
        ? Object.keys(funcOptions)
              .map((key: string) => {
                  const argument = funcOptions[key]
                  return typeof argument === 'function' ? argument.name : JSON.stringify(argument)
              })
              .join(', ')
        : ''

    if (func.name === '') {
        // enforce regular function usage over arrow functions, to have a proper cache key
        // console.trace is used to be able to know where the call comes from
        console.trace(
            `found a function without name, please consider using a regular function instead of an arrow function to solve this issue as it can lead to cache mismatch`
        )
    }

    return `func_${func.name}(${serializedOptions})`
}

/**
 * Cache results in a dedicated Redis db to improve performance,
 * if the result isn't already available in the db, it will be created.
 */
export const useCache = async <F extends DynamicComputeCall>(options: {
    func: F
    context: RequestContext
    funcOptions?: any
    // args?: ArgumentTypes<F>
    key?: string
}): Promise<ResultType<F>> => {
    const startedAt = new Date()
    const { func, context, key: providedKey, funcOptions = {} } = options
    const key = providedKey ?? computeKey(func, funcOptions)
    const { redisClient, isDebug = false } = context
    const disableCache = process.env.DISABLE_CACHE
    let value, verb

    const enableCache = !disableCache && !isDebug

    const settings = { isDebug, disableCache, cacheType }
    const settingsLogs = JSON.stringify(settings)

    if (enableCache) {
        const existingResult = await getCache(key, context)
        if (existingResult) {
            verb = 'using cache'
            value = existingResult
        } else {
            verb = 'computing and caching result'
            // always pass context to cached function just in case it's needed
            value = await func({ ...funcOptions, context })
            if (value) {
                // in case previous cached entry exists, delete it
                await setCache(key, JSON.stringify(value), context)
            }
        }
    } else {
        verb = 'computing result'
        value = await func(funcOptions)
    }
    const finishedAt = new Date()
    console.log(
        `> ${verb} for key: ${key} in ${
            finishedAt.getTime() - startedAt.getTime()
        }ms ( ${settingsLogs} )`
    )
    return value
}

export const getCache = async (key: string, context: RequestContext) => {
    if (cacheType === 'local') {
        return nodeCache.get(key)
    } else {
        const value = await context.redisClient.get(key)
        return JSON.parse(value)
    }
}

export const setCache = async (key: string, value: any, context: RequestContext) => {
    if (cacheType === 'local') {
        nodeCache.set(key, value)
    } else {
        await context.redisClient.set(key, JSON.stringify(value))
    }
}

export const clearCache = async (db: Db) => {
    // const collection = db.collection(config.mongo.cache_collection)
    // const result = await collection.deleteMany({})
    // return result
}