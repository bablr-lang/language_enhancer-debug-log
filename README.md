# @bablr/language_enhancer-debug-log

This langauge enhancer `console.log`s productions as they are evaluated. It is highly useful when debugging.

## Usage

```js
import { parse } from '@bablr/vm';
import langauge from 'some-langauge';
import { logEnhancer } from '@bablr/hol-debug-log';

parse(
  logEnhancer(language),
  'sourceText',
  spam`<Expression>`,
);
```
