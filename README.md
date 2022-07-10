# Reactive State Library

I created this library that exports two functions ```$makeState(stateObject)``` and ```$makeComputed(computedObject, stateDepTracker)```.
The purpose of these functions are making javascript objects listenable while not having to install bigger libraries or use streams.

## Usage example
This is how you use $makeState
```javascript
import { $makeState } from 'path/to/index.js';

const ordinaryObject = {
  a_number: 1,
  a_string: 'just a string',
  a_shallow_reactive_object: () => ({ x: 1, y: 2 }),
  a_deeply_reactive_object: { x: 1, y: 2, a: { b: 1 } },
  // ... other keys
};

const state = $makeState(ordinaryObject);
/*
  state.a_number.$ <= pure raw value...
  state.a_number.__tracker <= tracker where you can add listeners
*/

const computedBasedStateObjectChange = { 
  concatenated: () => state.a_number.$ + state.a_string.$,
};

const computedState = $makeComputed(computedBasedStateObjectChange, state.__tracker);
/*
  computedState.concatenated.$ <= pure raw value which updates when state changes...
  computedState.concatenated.__tracker <= tracker where you can add listeners
*/
```

## LICENSE
MIT
