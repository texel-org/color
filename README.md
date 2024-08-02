# color-tools

A minimal and modern color library for JavaScript. Mainly useful for real-time applications, generative art, and graphics on the web.

- Features: fast color conversion, color difference, gamut mapping, and serialization
- Optimised for speed: approx 20-125 times faster than [Colorjs.io](https://colorjs.io/) (see [benchmarks](#benchmarks))
- Optimised for low memory and minimal allocations: no arrays or objects are created within conversion and gamut mapping functions
- Optimised for compact bundles: zero dependencies, and unused color spaces can be automatically tree-shaked away for small sizes (e.g. ~4.5kb minified if you only require OKLCH to sRGB conversion)
- Optimised for accuracy: [high precision](#accuracy) color space matrices
- Focused on a minimal and modern set of color spaces:
  - xyz (D65), xyz-d50, oklab, oklch, okhsv, okhsl, srgb, srgb-linear, display-p3, display-p3-linear, rec2020, rec2020-linear, a98-rgb, a98-rgb-linear, prophoto-rgb, prophoto-rgb-linear

## Install

Use [npm](https://npmjs.com/) to install and import the module.

```sh
npm install color-tools --save
```

## Examples

Converting OKLCH (cylindrical form of OKLab) to sRGB:

```js
import { convert, OKLCH, sRGB } from "color-tools";

// L = 0 .. 1
// C = 0 .. 0.4
// H = 0 .. 360 (degrees)
const rgb = convert([0.5, 0.15, 30], OKLCH, sRGB);

// Note sRGB output is in range 0 .. 1
// -> [ 0.658, 0.217, 0.165 ]
```

You can also use wildcard imports:

```js
import * as colors from "color-tools";

const rgb = colors.convert([0.5, 0.15, 30], colors.OKLCH, colors.sRGB);
```

> :bulb: Modern bundlers (esbuild, vite) will apply tree-shaking and remove any features that aren't needed, such as color spaces and gamut mapping functions that you didn't reference in your code. The above script results in a ~4.5kb minified bundle with esbuild.

Another example with gamut mapping and serialization for wide-gamut Canvas2D:

```js
import { gamutMapOKLCH, DisplayP3Gamut, sRGBGamut, serialize } from "color-tools";

// Some value that may or may not be in sRGB gamut
const oklch = [ 0.15, 0.425, 30 ];

// decide what gamut you want to map to
const isDisplayP3Supported = /* check env */;
const gamut = isDisplayP3Supported ? DisplayP3Gamut : sRGBGamut;

// map the input OKLCH to the R,G,B space (sRGB or DisplayP3)
const rgb = gamutMapOKLCH(oklch, gamut);

// get a CSS color string for your output space
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

#### `output = gamutMapOKLCH(oklch, gamut = sRGBGamut, targetSpace = gamut.space, out = [0, 0, 0], mapping = MapToCuspL, [cusp])`

Performs fast gamut mapping in OKLCH as [described by Björn Ottoson](https://bottosson.github.io/posts/gamutclipping/) (2021). This takes an input `[l,c,h]` coords in OKLCH space, and ensures the final result will lie within the specified color `gamut` (default `sRGBGamut`). You can further specify a different target space (which default's the the gamut's space), for example to get a linear-light sRGB and avoid the transfer function, or to keep the result in OKLCH:

```js
import { gamutMapOKLCH, sRGBGamut, sRGBLinear, OKLCH } from "color-tools";

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
} from "color-tools";

// preserve lightness when performing sRGB gamut mapping
const rgb = [0, 0, 0];
gamutMapOKLCH(oklch, sRGBGamut, sRGB, rgb, MapToL);
```

The `cusp` can also be passed as the last parameter, allowing for faster evaluation for known hues. See below for calculating the cusp.

#### `LC = findCuspOKLCH(a, b, gamut, out = [0, 0])`

Finds the 'cusp' of a given OKLab hue plane (denoted with normalized `a` and `b` values in OKLab space), returning the `[L, C]` (lightness and chroma). This is useful for pre-computing aspects of gamut mapping when you are working across a known hue:

```js
import {
  sRGBGamut,
  findCuspOKLCH,
  gamutMapOKLCH,
  degToRad,
  MapToCuspL,
} from "color-tools";

const gamut = sRGBGamut;

// compute cusp once for this hue
const H = 30; // e.g. 30º hue
const hueAngle = degToRad(H);
const a = Math.cos(hueAngle);
const b = Math.sin(hueAngle);
const cuspLC = findCuspOKLCH(a, b, gamut);

// ... somewhere else in your program ...
// pass 'cusp' parameter for faster evaluation
gamutMapOKLCH(oklch, gamut, gamut.space, out, MapToCuspL, cuspLC);
```

The `a` and `b` can also be from OKLab coordinates, but must be normalized so `a^2 + b^2 == 1`.

#### `str = serialize(coords, inputSpace = sRGB, outputSpace = inputSpace)`

Turns the specified `coords` (assumed to be in `inputSpace`) into a string, first converting if needed to the specified `outputSpace`. If the space is sRGB, a plain `rgb(r,g,b)` string (in bytes) will be used for browser compatibility and performance, otherwise a CSS color string will be returned. Note that not all spaces, such as certain linear spaces, are currently supported by CSS.

```js
import { serialize, sRGB, DisplayP3, OKLCH } from "color-tools";

serialize([0, 0.5, 1], sRGB); // "rgb(0, 128, 255)"
serialize([0, 0.5, 1], DisplayP3); // "color(display-p3 0 0.5 1)"
serialize([1, 0, 0], OKLCH, sRGB); // "rgb(255, 255, 255)"
serialize([1, 0, 0], OKLCH); // "oklch(1 0 0)"
```

#### `delta = deltaEOK(oklabA, oklabB)`

Performs a color difference in OKLab space between two coordinates. As this is a perceptually uniform color space that improves upon CIELAB and its flaws, it should be suitable as a replacement for the CIEDE2000 color difference equation in many situations.

#### `[utils]`

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
} from "color-tools";

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
} from "color-tools";

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

## Transformation Matrices

You can also import the lower level functions and matrices; this may be useful for granular conversions, or for example uploading the buffers to WebGPU for compute shaders.

```js
import {
  OKLab_to,
  OKLab_from,
  transform,
  XYZ_to_linear_sRGB_M,
  LMS_to_XYZ_M,
  XYZ_to_LMS_M,
  sRGB,
} from "color-tools";

console.log(XYZ_to_linear_sRGB_M); // [ [a,b,c], ... ]
OKLab_to(oklab, LMS_to_XYZ_M); // OKLab -> XYZ D65
OKLab_from(xyzD65, XYZ_to_LMS_M); // XYZ D65 -> OKLab
transform(xyzD65, XYZ_to_linear_sRGB_M); // XYZ D65 -> sRGBLinear
sRGB.fromBase(in_linear_sRGB, out_sRGB); // linear to gamma transfer function
sRGB.toBase(in_sRGB, out_linear_sRGB); // linear to gamma transfer function
```

## Notes

### Why another library?

[Colorjs](https://colorjs.io/) is fantastic and perhaps the current leading standard in JavaScript, but it's not very practical for creative coding and real-time web applications, where the requirements are often (1) leaner codebases, (2) highly optimized, and (3) minimal GC thrashing. Colorjs is more focused on matching CSS spec, which means it will very likely continue to grow in complexity, and performance will often be marred (for example, `color-tools` cusp intersection gamut mapping is ~125 times faster than Colorjs and its defaultt CSS based gamut mapping).

There are many other options such as [color-space](https://www.npmjs.com/package/color-space) or [color-convert](https://www.npmjs.com/package/color-convert), however, these do not support modern spacse such as OKLab and OKHSL, and/or have dubious levels of accuracy (many libraries, for example, do not distinguish between D50 and D65 whitepoints in XYZ).

### Supported Spaces

This library does not aim to target every color space; it only focuses on a limited "modern" set, i.e. OKLab, OKHSL and DeltaEOK have replaced CIELab, HSL, and CIEDE2000 for many practical purposes, allowing this library to be simpler and slimmer.

### Improvements & Techniques

The module uses a few of the following practices for the significant optimization and bundle size improvements:

- Loops, closures, destructuring, and other syntax sugars are replaced with more optimized code paths and plain array access.
- Allocations in hot code paths have been removed, temporary arrays are re-used if needed.
- Certain conversions, such as OKLab to sRGB, do not need to pass through XYZ first, and can be directly converted using a known matrix.
- The API design is structured such that color spaces are generally not referenced internally, allowing them to be automatically tree-shaked.

### Accuracy

All conversions have been tested to approximately equal Colorjs conversions, within a tolerance of 2<sup>-33</sup> (10 decimal places), in some cases it is more accurate than that.

This library uses [coloraide](https://github.com/facelessuser/coloraide) and its Python tools for computing conversion matrices and OKLab gamut approximations. Some matrices have been hard-coded into the script, and rational numbers are used where possible (as [suggested](https://github.com/w3c/csswg-drafts/pull/7320) by [CSS Color Module working draft spec](https://drafts.csswg.org/css-color-4/#color-conversion-code)).

If you think the matrices or accuracy could be improved, please open a PR.

### Benchmarks

There are a few benchmarks inside [test](./test):

- [bench-colorjs.js](./test/bench-colorjs.js) - run with `npm run bench` to compare against colorjs
- [bench-node.js](./test/bench-node.js) - run with `npm run bench:node` to get a node profile
- [bench-size.js](./test/bench-size.js) - run with `npm run bench:size` to get a small bundle size with esbuild

Colorjs comparison benchmark on MacBook Air M2:

```
OKLCH to sRGB with gamut mapping --
Colorjs: 6146.67 ms
Ours: 46.77 ms
Speedup: 131.4x faster

All Conversions --
Colorjs: 10219.40 ms
Ours: 431.13 ms
Speedup: 23.7x faster

Conversion + Gamut Mapping --
Colorjs: 1936.29 ms
Ours: 82.04 ms
Speedup: 23.6x faster
```

### Running Locally

Clone, `npm install`, then `npm run` to list the available scripts, or `npm t` to run the tests.

## Attributions

This library was made possible due to the excellent prior work by many developers and engineers:

- [Colorjs.io](https://colorjs.io)
- [Coloraide](https://github.com/facelessuser/coloraide/)
- [CSS Color Module Level 4 Spec](https://www.w3.org/TR/css-color-4/)

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/color-tools/blob/master/LICENSE.md) for details.
