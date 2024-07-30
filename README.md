# saido

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

A minimal and modern color science library for JavaScript. Mainly useful for real-time applications, generative art, and graphics on the web.

- Features: color conversion, color difference, gamut mapping
- Optimised for speed: approx 25-35 times faster than [Colorjs.io](https://colorjs.io/)
- Optimised for low memory and minimal allocations: no arrays or objects are created within conversion or gamut mapping functions
- Optimised for compact bundles: zero dependencies, and can be automatically tree-shaked to small sizes (e.g. 3kb if you only require OKLCH to sRGB conversion)
- Optimised for accuracy: high precision color space matrices
- Focused on a minimal and modern set of color spaces:
  - oklab, oklch, okhsv, okhsl, srgb, srgb-linear, display-p3, display-p3-linear, rec2020, rec2020-linear, xyz (d65)

## Install

Use [npm](https://npmjs.com/) to install and import the module.

```sh
npm install saido --save
```

## Examples

Import individual spaces and functions:

```js
import { convert, OKLCH, sRGB } from "saido";

const rgb = convert([0.5, 0.15, 30], OKLCH, sRGB);

// Note sRGB output is in range 0..1
// -> [ 0.658, 0.217, 0.165 ]
```

Or import the library:

```js
import * as saido from "saido";

const rgb = saido.convert([0.5, 0.15, 30], saido.OKLCH, saido.sRGB);
```

Modern bundlers (esbuild, vite) will apply tree-shaking and remove any features that aren't needed, such as color spaces and gamut mapping functions that you didn't reference in your code.

> :bulb: With esbuild, this results in a ~3.8kb bundle.

## API

#### `output = convert(coords, fromSpace, toSpace, output = [0, 0, 0])`

Converts the `coords` (typically `[r,g,b]` or `[l,c,h]` or similar), expected to be in `fromSpace`, to the specified `toSpace`. The from and to spaces are one of the [spaces](#color-spaces) interfaces.

You can pass `output`, which is a 3 dimensional vector, and the result will be stored into it. This can be used to avoid allocations.

The return value is the new coordinates in the destination space; such as `[r,g,b]` if `sRGB` space is the target. Note that most spaces use normalized and unbounded coordinates; so RGB spaces are in the range 0..1 and might be out of bounds (i.e. out of gamut). It's likely you will want to combine this with `gamutMapOKLCH`, see below.

#### `output = gamutMapOKLCH(oklch, gamut = sRGBGamut, targetSpace = gamut.space, out = [0, 0, 0], mapping = MapToCuspL)`

## Color Spaces

The module exports a set of color spaces:

```js
import {
  XYZ, // using D65 whitepoint
  sRGB,
  sRGBLinear,
  DisplayP3,
  DisplayP3Linear,
  Rec2020,
  Rec2020Linear,
  OKLab,
  OKLCH,
  OKHSL,
  OKHSV,

  // a function to list all spaces
  supportedColorSpaces,
} from "saido";

console.log(supportedColorSpaces()); // [XYZ, sRGB, sRGBLinear, ...]

console.log(sRGBLinear.id); // "srgb-linear"
console.log(sRGB.base); // -> sRGBLinear
console.log(sRGB.fromBase(someLinearRGB)); // -> [gamma-encoded sRGB...]
console.log(sRGB.toBase(someGammaRGB)); // -> [linear sRGB...]
```

Note that not all spaces have a `base` field; if not specified, it's assumed the color space can pass through OKLab or XYZ as a root.

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/saido/blob/master/LICENSE.md) for details.
