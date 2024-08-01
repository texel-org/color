# saido

A minimal and modern color library for JavaScript. Mainly useful for real-time applications, generative art, and graphics on the web.

- Features: fast color conversion, color difference, gamut mapping, and serialization
- Optimised for speed: approx 20-100 times faster than [Colorjs.io](https://colorjs.io/) (see [benchmarks](#benchmarks))
- Optimised for low memory and minimal allocations: no arrays or objects are created within conversion and gamut mapping functions
- Optimised for compact bundles: zero dependencies, and unused spaces can be automatically tree-shaked away for small sizes (e.g. ~3kb minified if you only require OKLCH to sRGB conversion)
- Optimised for accuracy: [high precision](#accuracy) color space matrices
- Focused on a minimal and modern set of color spaces:
  - oklab, oklch, okhsv, okhsl, srgb, srgb-linear, display-p3, display-p3-linear, rec2020, rec2020-linear, a98-rgb, a98-rgb-linear, xyz (D65)

## Install

Use [npm](https://npmjs.com/) to install and import the module.

```sh
npm install saido --save
```

## Examples

Converting OKLCH (cylindrical form of OKLab) to sRGB:

```js
import { convert, OKLCH, sRGB } from "saido";

// L = 0 .. 1
// C = 0 .. 0.4
// H = 0 .. 360 (degrees)
const rgb = convert([0.5, 0.15, 30], OKLCH, sRGB);

// Note sRGB output is in range 0 .. 1
// -> [ 0.658, 0.217, 0.165 ]
```

You can also use wildcard imports:

```js
import * as saido from "saido";

const rgb = saido.convert([0.5, 0.15, 30], saido.OKLCH, saido.sRGB);
```

Modern bundlers (esbuild, vite) will apply tree-shaking and remove any features that aren't needed, such as color spaces and gamut mapping functions that you didn't reference in your code.

> :bulb: With esbuild, the above code results in a ~3.8kb minified bundle.

Another example with gamut mapping and serialization:

```js
import { gamutMapOKLCH, DisplayP3Gamut, sRGBGamut, serialize } from "saido";

// Some value that may or may not be in sRGB gamut
const oklch = [ 0.15, 0.425, 30 ];

// decide what gamut you want to map to
const isDisplayP3Supported = /* check env */;
const gamut = isDisplayP3Supported ? DisplayP3Gamut : sRGBGamut;

// map the input OKLCH to the R,G,B space (sRGB or DisplayP3)
const rgb = gamutMapOKLCH(oklch, gamut);

// get a CSS color string
const color = serialize(rgb, gamut.space);

// draw color to a Canvas2D context
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d', {
  colorSpace: gamut.id
});
context.fillStyle = color;
context.fillRect(0,0, canvas.width, canvas.height);
```

## API

#### `output = convert(coords, fromSpace, toSpace, output = [0, 0, 0])`

Converts the `coords` (typically `[r,g,b]` or `[l,c,h]` or similar), expected to be in `fromSpace`, to the specified `toSpace`. The from and to spaces are one of the [spaces](#color-spaces) interfaces.

You can pass `output`, which is a 3 dimensional vector, and the result will be stored into it. This can be used to avoid allocating any new memory in hot code paths.

The return value is the new coordinates in the destination space; such as `[r,g,b]` if `sRGB` space is the target. Note that most spaces use normalized and unbounded coordinates; so RGB spaces are in the range 0..1 and might be out of bounds (i.e. out of gamut). It's likely you will want to combine this with `gamutMapOKLCH`, see below.

#### `output = gamutMapOKLCH(oklch, gamut = sRGBGamut, targetSpace = gamut.space, out = [0, 0, 0], mapping = MapToCuspL)`

Performs fast gamut mapping in OKLCH as [described by Björn Ottoson](https://bottosson.github.io/posts/gamutclipping/) (2021). This takes an input `[l,c,h]` coords in OKLCH space, and ensures the final result will lie within the specified color `gamut` (default `sRGBGamut`). You can further specify a different target space (which default's the the gamut's space), for example to get a linear-light sRGB and avoid the transfer function, or to keep the result in OKLCH:

```js
import { gamutMapOKLCH, sRGBGamut, sRGBLinear, OKLCH } from "saido";

// gamut map to sRGB but return linear sRGB
const lrgb = gamutMapOKLCH(oklch, sRGBGamut, sRGBLinear);

// or gamut map to sRGB but return OKLCH
// note, when finally converting this back to sRGB you will likely
// want to clip the result to 0..1 bounds due to floating point loss
const lch = gamutMapOKLCH(oklch, sRGBGamut, OKLCH);
```

You can specify an `out` array to avoid allocations, and the result will be stored into that array. You can also specify a `mapping` function which determines the strategy to use when gamut mapping, and can be one of the following:

```js
import {
  // possible mappings
  MapToL,
  MapToGray,
  MapToCuspL,
  MapToAdaptiveGray,
  MapToAdaptiveCuspL,
} from "saido";

// preserve lightness when performing sRGB gamut mapping
const rgb = [0, 0, 0];
gamutMapOKLCH(oklch, sRGBGamut, sRGB, rgb, MapToL);
```

#### `str = serialize(coords, inputSpace = sRGB, outputSpace = inputSpace)`

Turns the specified `coords` (assumed to be in `inputSpace`) into a string, first converting if needed to the specified `outputSpace`. If the space is sRGB, a plain `rgb(r,g,b)` string (in bytes) will be used for browser compatibility and performance, otherwise a CSS color string will be returned. Note that not all spaces, such as certain linear spaces, are currently supported by CSS.

```js
import { serialize, sRGB, DisplayP3, OKLCH } from "saido";

serialize([0, 0.5, 1], sRGB); // "rgb(0, 128, 255)"
serialize([0, 0.5, 1], DisplayP3); // "color(display-p3 0 0.5 1)"
serialize([1, 0, 0], OKLCH, sRGB); // "rgb(255, 255, 255)"
serialize([1, 0, 0], OKLCH); // "oklch(1 0 0)"
```

#### `delta = deltaEOK(oklchA, oklchB)`

```js
import { serialize, sRGB, DisplayP3, OKLCH } from "saido";
```

There are also a host of other [utilities](#utilities) exported by the module.

## Color Spaces

The module exports a set of color spaces:

```js
import {
  XYZ, // using D65 whitepoint
  XYZD50, // using D50 whitepoint
  sRGB,
  sRGBLinear,
  DisplayP3,
  DisplayP3Linear,
  Rec2020,
  Rec2020Linear,
  A98RGB, // Adobe® 1998 RGB
  A98RGBLinear,
  ProPhotoRGB,
  ProPhotoRGBLinear,
  OKLab,
  OKLCH,
  OKHSL, // in sRGB gamut
  OKHSV, // in sRGB gamut

  // a function to list all spaces
  listColorSpaces,
} from "saido";

console.log(listColorSpaces()); // [XYZ, sRGB, sRGBLinear, ...]

console.log(sRGBLinear.id); // "srgb-linear"
console.log(sRGB.base); // -> sRGBLinear
console.log(sRGB.fromBase(someLinearRGB)); // -> [gamma-encoded sRGB...]
console.log(sRGB.toBase(someGammaRGB)); // -> [linear sRGB...]
```

Note that not all spaces have a `base` field; if not specified, it's assumed the color space can pass through OKLab or XYZ as a root.

## Color Gamuts

The module exports a set of "gamuts" which are boundaries defined by an approximation in OKLab space, allowing for fast gamut mapping. These interfaces are mainly used by the `gamutMapOKLCH` function.

```js
import {
  sRGBGamut,
  DisplayP3Gamut,
  Rec2020Gamut,
  A98RGBGamut,

  // a function to list all gamuts
  listColorGamuts,
} from "saido";

console.log(listColorGamuts()); // [sRGBGamut, ...]

console.log(sRGBGamut.space); // sRGB space
console.log(sRGBGamut.space.id); // 'srgb'
```

Note: ProPhoto gamut is not yet supported, I would be open to a PR fixing it within the Python script.

## Utilities

In addition to the core API, the module exports a number of utilities:

#### `b = floatToByte(f)`

Converts the float in range 0..1 to a byte in range 0..255, rounded and clamped.

#### `out = XYZ_to_xyY(xyz, out=[0,0,0])`

Converts the XYZ coordinates to xyY form, storing the result in `out` if specified before returning.

#### `out = xyY_to_XYZ(xyY, out=[0,0,0])`

Converts the xyY coordinates to XYZ form, storing the results in `out` if specified before returning.

#### `v = lerp(min, max, t)`

Performs linear interpolation between min and max with the factor `t`.

#### `c = clamp(value, min, max)`

Clamps the `value` between min and max and returns the result.

#### `out = clampedRGB(inRGB, out=[0,0,0])`

Clamps (i.e. clips) the RGB into the range 0..1, storing the result in `out` if specified before returning.

#### `inside = isRGBInGamut(rgb, epsilon = 0.000075)`

Returns `true` if the given `rgb` is inside its 0..1 gamut boundary, with a threshold of `epsilon`.

#### `rgb = hexToRGB(hex, out=[0,0,0])`

Converts the specified hex string (with or without a leading `#`) into a floating point RGB triplet in the range 0..1, storing the result in `out` if specified before returning the result.

#### `hex = RGBToHex(rgb)`

Converts the specified RGB triplet (floating point in the range 0..1) into a 6-character hex color string with a leading `#`.

#### `angle = constrainAngle(angle)`

Constrains the `angle` (in degrees) to 0..360, wrapping around if needed.

#### `degAngle = radToDeg(radAngle)`

Converts the angle (given in radians) to degrees.

#### `radAngle = degToRad(degAngle)`

Converts the angle (given in degrees) to radians.

## Notes

### Why another library?

Colorjs is fantastic and perhaps the current leading standard in JavaScript, but it's not very practical for creative coding and real-time web applications, where the requirements are often (1) leaner codebases, (2) highly optimized, and (3) minimal GC thrashing.

There are many other options such as [color-space](https://www.npmjs.com/package/color-space) or [color-convert](https://www.npmjs.com/package/color-convert), however, these do not support modern spacse such as OKLab and OKHSL, and/or have dubious levels of accuracy (many other libraries, for example, do not distinguish between D50 and D65 in XYZ).

### Supported Spaces

This library does not aim to target every color space; it only focuses on a limited "modern" set, i.e. OKLab and its DeltaEOK has replaced HSL, CIELab, CIEDE2000, etc for many practical purposes, allowing the library to be simpler and slimmer.

### Improvements & Techniques

The module uses a few of the following practices for the significant optimization and bundle size improvements:

- Loops, closures, destructuring, and other syntax sugars are replaced with more optimized code paths and plain array access.
- Allocations in hot code paths have been removed, temporary arrays are re-used if needed.
- Certain conversions, such as OKLab to sRGB, do not need to pass through XYZ first, and can be directly converted using a known matrix.
- The API design is structured such that color spaces are generally not referenced internally, allowing them to be automatically tree-shaked.

### Accuracy

All conversions have been tested to approximately equal Colorjs conversions, within a tolerance of 2<sup>-40</sup>. If you are aiming for results with higher precision accuracy than this, you should use Colorjs directly.

This library uses [coloraide](https://github.com/facelessuser/coloraide) and its Python tools for computing conversion matrices and OKLab gamut approximations. Some matrices have been hard-coded into the script to produce more consistent outputs with Colorjs and the CSS Module 4 Spec, which this library tests against.

### Benchmarks

There are a few benchmarks inside [test](./test):

- [bench-colorjs.js](./test/bench-colorjs.js) - run with `npm run bench` to compare against colorjs
- [bench-node.js](./test/bench-node.js) - run with `npm run bench:node` to get a node profile
- [bench-size.js](./test/bench-size.js) - run with `npm run bench:size` to get a small bundle size with esbuild

Colorjs comparison benchmark on MacBook Air M2:

```
OKLCH to sRGB with gamut mapping --
Colorjs: 6276.03 ms
Ours: 61.53 ms
Speedup: 102.0x faster

All Conversions --
Colorjs: 11030.15 ms
Ours: 429.11 ms
Speedup: 25.7x faster

Conversion + Gamut Mapping --
Colorjs: 2188.11 ms
Ours: 153.79 ms
Speedup: 14.2x faster
```

### Running Locally

Clone, `npm install`, then `npm run` to list the available scripts, or `npm t` to run the tests.

### Name

The name _saido_ is from the Japanese term 彩度, meaning colourfulness, chroma, or saturation.

## Attributions

This library was made possible due to the excellent prior work by many developers and engineers:

- [Colorjs.io](https://colorjs.io)
- [Coloraide](https://github.com/facelessuser/coloraide/)
- [CSS Color Module Level 4 Spec](https://www.w3.org/TR/css-color-4/)

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/saido/blob/master/LICENSE.md) for details.
