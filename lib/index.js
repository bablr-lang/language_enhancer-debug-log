/* global console */

import { buildEmbeddedObject } from '@bablr/agast-vm-helpers/builders';

import { printIdentifier } from '@bablr/agast-helpers/print';
import { printCall } from '@bablr/agast-vm-helpers/print';

const { getOwnPropertyNames, getOwnPropertySymbols, hasOwn } = Object;

const printType = (type) => {
  return type == Symbol.for('@bablr/fragment') ? '_' : printIdentifier(type);
};

// TODO this lives in bablr-helpers but I can't use it there
//   it would create a circular dep at the module level
const mapProductions = (fn, Grammar) => {
  let { prototype } = Grammar;

  class MappedGrammar extends Grammar {}

  const mapped = MappedGrammar.prototype;

  while (prototype && prototype !== Object.prototype) {
    for (const key of [...getOwnPropertyNames(prototype), ...getOwnPropertySymbols(prototype)]) {
      if (!hasOwn(mapped, key)) {
        mapped[key] = fn(prototype[key], key);
      }
    }
    ({ prototype } = prototype);
  }

  return MappedGrammar;
};

const writeError = (text) => {
  return { verb: 'write', arguments: [text, buildEmbeddedObject({ stream: 2 })] };
};

const mapProduction = (production, type, indentation) => {
  return {
    *[type](args) {
      const indent = (strings, ...args) => {
        return `${indentation}${String.raw(strings, ...args)}`;
      };

      yield writeError(`--> ${printType(type)}`);

      let earlyReturn = true;
      try {
        const generator = production(args);
        let current = generator.next();

        let anyResult = false;

        while (!current.done) {
          const instr = current.value;

          yield writeError(`>>> ${printCall(instr)}`);

          const eats = ['eat', 'eatMatch'].includes(instr.verb);

          const result = yield instr;

          anyResult = anyResult || (eats && result);

          current = generator.next(result);
        }

        const { allowEmpty, s } = args;

        if ((anyResult || allowEmpty) && s().status === 'active') {
          yield writeError(`<-- ${printType(type)}`);
        } else {
          yield writeError(`x-- ${printType(type)}`);
        }
        earlyReturn = false;

        if (current.value?.shift) {
          yield writeError(indent`${printCall(current.value.shift)}`);
        }

        return current.value;
      } finally {
        if (earlyReturn) {
          yield writeError(`x-- ${printType(type)}`);
        }
      }
    },
  }[type];
};

export const enhanceGrammarWithDebugLogging = (grammar, indentation = '') => {
  return mapProductions((type, prod) => mapProduction(type, prod, indentation), grammar);
};

export const enhanceLanguageWithDebugLogging = (language, indentation = '') => {
  return {
    ...language,
    grammar: enhanceGrammarWithDebugLogging(language.grammar, indentation),
  };
};

export const enhanceWithDebugLogging = enhanceLanguageWithDebugLogging;

export const enhanceProductionWithDebugLogging = (indentation = '') => {
  return (production, type) => {
    return mapProduction(production, type, indentation);
  };
};

export default enhanceWithDebugLogging;
