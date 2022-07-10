const stateObjectConfig = { writable: false, configurable: false, enumerable: false }; 
const isPureObject = (o: any): boolean => {
   return null !== o &&
      typeof o === 'object' &&
      Object?.getPrototypeOf(o)?.isPrototypeOf(Object) &&
      !Object.isFrozen(o);
}

interface DependencyTrackerConfiguration {
   callbacks: Map<symbol, Set<(value: any) => void>>,
   tempAccessedProperties: {
      target: symbol,
      property: symbol,
   }[],
   watcherOn: boolean
}

type Primitive = bigint | boolean | null | number | string | symbol | undefined;
type JSONValue = Primitive | $PureObject | JSONArray;
export interface $PureObject {
   [key: string | symbol]: JSONValue | Function;
}
interface JSONArray extends Array<JSONValue> { }
type $ReactiveObject<T> = {
   readonly [P in keyof T]: T[P] extends $PureObject ? $ReactiveObject<T[P]> : ($ReactiveProperty<T[P] extends (() => any) ? ReturnType<T[P]> : T[P]>);
}
export interface $ReactiveProperty<T> {
   $: T,
   readonly __symbol: symbol;
   readonly __tracker: DependencyTracker;
}
export type $ReactiveState<T> = $ReactiveObject<T> & { __tracker: DependencyTracker };

class DependencyTracker {
   #config: DependencyTrackerConfiguration;
   constructor(config: DependencyTrackerConfiguration) {
      this.#config = config;
   }
   addEventListener(propSymbol: symbol, callback: (value: any) => void): void {
      if (this.#config.callbacks.has(propSymbol)) {
         this.#config.callbacks.get(propSymbol).add(callback);
      } else {
         this.#config.callbacks.set(propSymbol, new Set([callback]));
      }
   }
   recordGetters<T>(func: () => T): { result: T, getters: symbol[] } {
      this.#config.watcherOn = true;
      this.#config.tempAccessedProperties.length = 0;
      const res = func();
      this.#config.watcherOn = false;
      let accessedProps: symbol[] = [];
      let curr_index: number = -1;
      for (let i = 0; i < this.#config.tempAccessedProperties.length; i++) {
         if (this.#config.tempAccessedProperties[i].target.description === '%root') {
            curr_index++;
            accessedProps.push(this.#config.tempAccessedProperties[i].property);
         } else {
            accessedProps[curr_index] = this.#config.tempAccessedProperties[i].property;
         }
      }
      return {
         result: res,
         getters: accessedProps,
      };
   }
}

export const $makeState = <T extends $PureObject>(stateObj: T): $ReactiveState<T> => {
   const config = {
      callbacks: new Map<symbol, Set<(value: any) => void>>(),
      tempAccessedProperties: [],
      watcherOn: false,
   };
   const depTracker = {
      tracker: new DependencyTracker(config),
      accessed: (symbols: { target: symbol, property: symbol }) => {
         config.tempAccessedProperties.push(symbols);
      },
      onChanged: (symbol: symbol, value: any) => {
         config.callbacks.get(symbol)?.forEach(cb => { if (cb) cb(value) });
      },
   };
   const _makeStateInner = (stateObject: any, keyName: string): $ReactiveState<T> => {
      if (isPureObject(stateObject)) {
         for (const key in stateObject) {
            stateObject[key] = _makeStateInner(stateObject[key], key);
         }
      } else {
         stateObject = { $: typeof stateObject === 'function' ? stateObject() : stateObject };
      }

      Object.defineProperty(stateObject, '__symbol', { ...stateObjectConfig, value: Symbol(keyName) });
      Object.defineProperty(stateObject, '__tracker', { ...stateObjectConfig, value: depTracker.tracker });

      const inherentProps: any[] = ['__symbol', '__tracker', '$'];
      return new Proxy(stateObject, {
         get(target, property) {
            if (!inherentProps.includes(property) && config.watcherOn) {
               depTracker.accessed({ target: target?.__symbol, property: target[property]?.__symbol });
            }
            return Reflect.get(target, property);
         },
         set(target, property, value) {
            if (Object.prototype.hasOwnProperty.call(target, property)) {
               if (property === '$') {
                  Reflect.set(target, property, value);
                  depTracker.onChanged(target.__symbol, value);
                  return true;
               } else {
                  throw Error(`Can't directly assign value to ${property as string}, did you mean ${property as string}.$ ?`);
               }
            } else {
               throw Error(`State objects don't allow addition or deletion of state object keys!`)
            }
         }
      });
   }
   return _makeStateInner(stateObj, '%root');
}

export type $ComputedStateObject = Record<string | symbol, () => any>;

interface ComputedDependencyTrackerConfiguration {
   callbacks: Map<symbol, Set<(value: any) => void>>,
}

class ComputedDependencyTracker {
   #config: ComputedDependencyTrackerConfiguration;
   constructor(config: ComputedDependencyTrackerConfiguration) {
      this.#config = config;
   }
   addEventListener(propSymbol: symbol, callback: (value: any) => void): void {
      if (this.#config.callbacks.has(propSymbol)) {
         this.#config.callbacks.get(propSymbol).add(callback);
      } else {
         this.#config.callbacks.set(propSymbol, new Set([callback]));
      }
   }
}

interface $ReactiveComputedProperty<T> {
   readonly $: T,
   readonly __tracker: ComputedDependencyTracker,
   readonly __symbol: symbol,
}

export type $ComputedState<T extends $ComputedStateObject> = {
   readonly [P in keyof T]: $ReactiveComputedProperty<ReturnType<T[P]>>;
} & { __tracker: ComputedDependencyTracker }

export const $makeComputed = <T extends $ComputedStateObject>(computedObject: T, dependencyTracker: DependencyTracker): $ComputedState<T> => {
   const config = { callbacks: new Map<symbol, Set<(value: any) => void>>() };
   const computedState: any = {};
   const computedDepTracker = new ComputedDependencyTracker(config);
   const onChanged = (symbol: symbol, value: any) => {
      config.callbacks.get(symbol)?.forEach(cb => { if (cb) cb(value) });
   };
   for (const key in computedObject) {
      const { result, getters } = dependencyTracker.recordGetters(computedObject[key]);
      const keySymbol = Symbol(key);
      Object.defineProperty(computedState, key, { value: {} });
      Object.defineProperties(computedState[key], {
         $: { ...stateObjectConfig, value: result },
         __symbol: { ...stateObjectConfig, value: keySymbol },
         __tracker: { ...stateObjectConfig, value: computedDepTracker },
      });
      getters?.forEach(symbol => dependencyTracker.addEventListener(symbol, () => onChanged(keySymbol, computedObject[key]())))
   }
   Object.defineProperty(computedState, '__tracker', { value: computedDepTracker });
   return computedState as $ComputedState<T>;
}