declare module "@texel/color" {
    /**
     * A 3x3 matrix represented as an array of arrays.
     * @example
     * const matrix = [
     *   [a, b, c],
     *   [d, e, f],
     *   [g, h, i]
     * ];
     */
    type Matrix3x3 = number[][];
    /**
     * A n-dimensional vector represented as an array of numbers, typically in 3D (X, Y, Z).
     * @example
     * const vec = [ x, y, z ];
     */
    type Vector = number[];
    type ColorGamutCoefficients = number[][][];
    /**
     * @property from - the matrix to convert from the source whitepoint to the destination whitepoint
     * @property to - the matrix to convert from the destination whitepoint to the source whitepoint
     */
    type ChromaticAdaptation = {
        from: Matrix3x3;
        to: Matrix3x3;
    };
    /**
     * @property id - the unique identifier for this color space in lowercase
     * @property [toXYZ_M] - optional matrix to convert this color directly to XYZ D65
     * @property [fromXYZ_M] - optional matrix to convert XYZ D65 to this color space
     * @property [toLMS_M] - optional matrix to convert this color space to OKLab's LMS intermediary form
     * @property [fromLMS_M] - optional matrix to convert OKLab's LMS intermediary form to this color space
     * @property [adapt] - optional chromatic adaptation matrices
     * @property [base] - an optional base color space that this space is derived from
     * @property [toBase] - if a base color space exists, this maps the color to the base space form (e.g. gamma to the linear base space)
     * @property [fromBase] - if a base color space exists, this maps the color from the base space form (e.g. the linear base space to the gamma space)
     */
    type ColorSpace = {
        id: string;
        toXYZ_M?: Matrix3x3;
        fromXYZ_M?: Matrix3x3;
        toLMS_M?: Matrix3x3;
        fromLMS_M?: Matrix3x3;
        adapt?: ChromaticAdaptation;
        base?: ColorSpace;
        toBase?: (...params: any[]) => any;
        fromBase?: (...params: any[]) => any;
    };
    /**
     * @property space - the color space associated with this color gamut
     * @property [coefficients] - the coefficients used during gamut mapping from OKLab
     */
    type ColorGamut = {
        space: ColorSpace;
        coefficients?: ColorGamutCoefficients;
    };
    /**
     * Converts OKLab color to another color space.
     * @param OKLab - The OKLab color.
     * @param LMS_to_output - The transformation matrix from LMS to the output color space.
     * @param [out = vec3()] - The output vector.
     * @returns The transformed color.
     */
    function OKLab_to(OKLab: Vector, LMS_to_output: Matrix3x3, out?: Vector): Vector;
    /**
     * Converts a color from another color space to OKLab.
     * @param input - The input color.
     * @param input_to_LMS - The transformation matrix from the input color space to LMS.
     * @param [out = vec3()] - The output vector.
     * @returns The transformed color.
     */
    function OKLab_from(input: Vector, input_to_LMS: Matrix3x3, out?: Vector): Vector;
    /**
     * Transforms a color vector by the specified 3x3 transformation matrix.
     * @param input - The input color.
     * @param matrix - The transformation matrix.
     * @param [out = vec3()] - The output vector.
     * @returns The transformed color.
     */
    function transform(input: Vector, matrix: Matrix3x3, out?: Vector): Vector;
    /**
     * Serializes a color to a CSS color string.
     * @param input - The input color.
     * @param inputSpace - The input color space.
     * @param [outputSpace = inputSpace] - The output color space.
     * @param [precision] - Optional number of significant digits to round each (non-sRGB) coordinate to; defaults to full precision.
     * @returns The serialized color string.
     */
    function serialize(input: Vector, inputSpace: ColorSpace, outputSpace?: ColorSpace, precision?: number): string;
    /**
     * Deserializes a color string to an object with <code>id</code> (color space string) and <code>coords</code> (the vector, in 3 or 4 dimensions).
     * Note this does not return a <code>ColorSpace</code> object; you may want to use the example code below to map the string ID to a <code>ColorSpace</code>, but this will increase the size of your final bundle as it references all spaces.
     * @example
     * import { listColorSpaces, deserialize } from "@texel/color";
     *
     * const { id, coords } = deserialize(str);
     * // now find the actual color space object
     * const space = listColorSpaces().find((f) => id === f.id);
     * console.log(space, coords);
     * @param input - The color string to deserialize.
     * @returns The deserialized color object.
     */
    function deserialize(input: string): any;
    /**
     * Parses a color string and converts it to the target color space.
     * @param input - The color string to parse.
     * @param targetSpace - The target color space.
     * @param [out = vec3()] - The output vector.
     * @returns The parsed and converted color.
     */
    function parse(input: string, targetSpace: ColorSpace, out?: Vector): Vector;
    /**
     * Converts a color from one color space to another.
     * @param input - The input color.
     * @param fromSpace - The source color space.
     * @param toSpace - The target color space.
     * @param [out = vec3()] - The output vector.
     * @returns The converted color.
     */
    function convert(input: Vector, fromSpace: ColorSpace, toSpace: ColorSpace, out?: Vector): Vector;
    /**
     * Calculates the DeltaEOK (color difference) between two OKLab colors.
     * @param oklab1 - The first OKLab color.
     * @param oklab2 - The second OKLab color.
     * @returns The delta E value.
     */
    function deltaEOK(oklab1: Vector, oklab2: Vector): number;
    /**
     * A function that maps an OKLCH color to a lightness value.
     * @param oklch - The input OKLCH color
     * @param cusp - A 2D cusp point in the form [L, C]
     */
    type GamutMapMethod = (oklch: Vector, cusp: number[]) => void;
    /**
     * A {@link GamutMapMethod} that maintains the color's lightness.
     */
    const MapToL: GamutMapMethod;
    /**
     * A {@link GamutMapMethod} that maps towards middle gray (L = 0.5).
     */
    const MapToGray: GamutMapMethod;
    /**
     * A {@link GamutMapMethod} that maps towards the lightness of the current hue's cusp.
     */
    const MapToCuspL: GamutMapMethod;
    /**
     * A {@link GamutMapMethod} that adaptively maps towards gray.
     */
    const MapToAdaptiveGray: GamutMapMethod;
    /**
     * A {@link GamutMapMethod} that adaptively maps towards the cusp's lightness.
     */
    const MapToAdaptiveCuspL: GamutMapMethod;
    /**
     * Computes the maximum saturation (S = C/L) possible for a given hue that fits within
     * the RGB gamut, using the given coefficients.
     * @param a - The normalized a component of the hue.
     * @param b - The normalized b component of the hue.
     * @param lmsToRgb - The LMS to RGB conversion matrix.
     * @param okCoeff - The OKLab coefficients.
     * @returns The maximum saturation.
     */
    function computeMaxSaturationOKLC(a: number, b: number, lmsToRgb: Matrix3x3, okCoeff: ColorGamutCoefficients): number;
    /**
     * Retrieves the LMS to RGB conversion matrix from the given gamut.
     * @param gamut - The gamut object.
     * @returns The LMS to RGB conversion matrix.
     */
    function getGamutLMStoRGB(gamut: ColorGamut): Matrix3x3;
    /**
     * Finds the cusp of the OKLCH color space for a given hue.
     * @param a - The normalized a component of the hue.
     * @param b - The normalized b component of the hue.
     * @param gamut - The gamut object.
     * @param [out = [0, 0]] - The output array to store the cusp values.
     * @returns The cusp values [L, C].
     */
    function findCuspOKLCH(a: number, b: number, gamut: ColorGamut, out?: number[]): number[];
    /**
     * Applies fast approximate gamut mapping in OKLab space on the given OKLCH input color,
     * using the specified gamut and converting to the target color space.
     * @param oklch - The input OKLCH color that you wish to gamut map.
     * @param [gamut = sRGBGamut] - The gamut object.
     * @param [targetSpace = gamut.space] - The target color space.
     * @param [out = vec3()] - The output array to store the mapped color.
     * @param [mapping = MapToCuspL] - The gamut mapping function.
     * @param [cusp] - Optional, you can provide the cusp values [L, C] to avoid re-computing them.
     * @returns The mapped color in the target color space.
     */
    function gamutMapOKLCH(oklch: Vector, gamut?: ColorGamut, targetSpace?: ColorSpace, out?: Vector, mapping?: GamutMapMethod, cusp?: Vector): Vector;
    /**
     * Converts OKHSL color to OKLab color.
     * @param hsl - The OKHSL color as an array [h, s, l].
     * @param [gamut = sRGBGamut] - The color gamut.
     * @param [out = vec3()] - The output array to store the OKLab color.
     * @returns The OKLab color as an array [L, a, b].
     */
    function OKHSLToOKLab(hsl: Vector, gamut?: ColorGamut, out?: Vector): Vector;
    /**
     * Converts OKLab color to OKHSL color.
     * @param lab - The OKLab color as an array [L, a, b].
     * @param [gamut = sRGBGamut] - The color gamut.
     * @param [out = vec3()] - The output array to store the OKHSL color.
     * @returns The OKHSL color as an array [h, s, l].
     */
    function OKLabToOKHSL(lab: Vector, gamut?: ColorGamut, out?: Vector): Vector;
    /**
     * Converts OKHSV color to OKLab color.
     * @param hsv - The OKHSV color as an array [h, s, v].
     * @param [gamut = sRGBGamut] - The color gamut.
     * @param [out = vec3()] - The output array to store the OKLab color.
     * @returns The OKLab color as an array [L, a, b].
     */
    function OKHSVToOKLab(hsv: Vector, gamut?: ColorGamut, out?: Vector): Vector;
    /**
     * Converts OKLab color to OKHSV color.
     * @param lab - The OKLab color as an array [L, a, b].
     * @param [gamut = sRGBGamut] - The color gamut.
     * @param [out = vec3()] - The output array to store the OKHSV color.
     * @returns The OKHSV color as an array [h, s, v].
     */
    function OKLabToOKHSV(lab: Vector, gamut?: ColorGamut, out?: Vector): Vector;
    /**
     * The Adobe RGB (1998) color space in linear form, without a transfer function, aliased as <code>"a98-rgb-linear"</code>.
     */
    const A98RGBLinear: ColorSpace;
    /**
     * The Adobe RGB (1998) color space, with a transfer function, aliased as <code>"a98-rgb"</code>. Inherits from the {@link A98RGBLinear} color space.
     */
    const A98RGB: ColorSpace;
    /**
     * A color gamut for the {@link A98RGB}, or Adobe RGB (1998), color space.
     */
    const A98RGBGamut: ColorGamut;
    /**
     * The Display-P3 color space in linear form, without a transfer function, aliased as <code>"display-p3-linear"</code>.
     */
    const DisplayP3Linear: ColorSpace;
    /**
     * The Display-P3 color space, with a transfer function, aliased as <code>"display-p3"</code>. Inherits from the {@link DisplayP3Linear} color space.
     */
    const DisplayP3: ColorSpace;
    /**
     * A color gamut for the {@link DisplayP3} color space.
     */
    const DisplayP3Gamut: ColorGamut;
    /**
     * The OKLab color space.
     */
    const OKLab: ColorSpace;
    /**
     * The OKLCH color space, with Lightness, Chroma, and Hue components. This is the cylindrical form of the {@link OKLab} color space.
     */
    const OKLCH: ColorSpace;
    /**
     * An implementation of the OKHSL color space, fixed to the {@link sRGBGamut}. This is useful for color pickers and other applications where
     * you wish to work with components in a well-defined and enclosed cylindrical form. If you wish to use OKHSL with a different gamut, you'll
     * need to use the {@link OKHSLToOKLab} and {@link OKLabToOKHSL} methods directly, passing your desired gamut.
     */
    const OKHSL: ColorSpace;
    /**
     * An implementation of the OKHSV color space, fixed to the {@link sRGBGamut}. This is useful for color pickers and other applications where
     * you wish to work with components in a well-defined and enclosed cylindrical form. If you wish to use OKHSL with a different gamut, you'll
     * need to use the {@link OKHSLToOKLab} and {@link OKLabToOKHSL} methods directly, passing your desired gamut.
     */
    const OKHSV: ColorSpace;
    /**
     * The ProPhotoRGB color space in linear form, without a transfer function, aliased as <code>"prophoto-rgb-linear"</code>.
     */
    const ProPhotoRGBLinear: ColorSpace;
    /**
     * The ProPhotoRGB color space, with a transfer function, aliased as <code>"prophoto-rgb"</code>. Inherits from the {@link ProPhotoRGBLinear} color space.
     */
    const ProPhotoRGB: ColorSpace;
    /**
     * The Rec2020 color space in linear form, without a transfer function, aliased as <code>"rec2020-linear"</code>.
     */
    const Rec2020Linear: ColorSpace;
    /**
     * The Rec2020 color space, with a transfer function, aliased as <code>"rec2020"</code>. Inherits from the {@link Rec2020Linear} color space.
     */
    const Rec2020: ColorSpace;
    /**
     * A color gamut for the {@link Rec2020} color space.
     */
    const Rec2020Gamut: ColorGamut;
    /**
     * The sRGB color space in linear form, without a transfer function, aliased as <code>"srgb-linear"</code>.
     */
    const sRGBLinear: ColorSpace;
    /**
     * The sRGB color space, with a transfer function, aliased as <code>"srgb"</code>. Inherits from the {@link sRGBLinear} color space.
     */
    const sRGB: ColorSpace;
    /**
     * A color gamut for the {@link sRGB} color space.
     */
    const sRGBGamut: ColorGamut;
    /**
     * Converts a single sRGB gamma-corrected channel value to linear light (un-companded) form.
     * @param val - The sRGB gamma-corrected channel value in the range [0, 1].
     * @returns The linear light channel value.
     */
    function sRGBGammaToLinear(val: number): number;
    /**
     * Converts a single linear-light channel value to sRGB gamma-corrected form.
     * @param val - The linear-light channel value in the range [0, 1].
     * @returns The sRGB gamma-corrected channel value.
     */
    function sRGBLinearToGamma(val: number): number;
    /**
     * Converts a color from XYZ with D65 whitepoint to XYZ with D50 whitepoint.
     * @param XYZ - The input color in XYZ with D65 whitepoint.
     * @param [out = vec3()] - The output color in XYZ with D50 whitepoint.
     * @returns The converted color in XYZ with D50 whitepoint.
     */
    function XYZD65ToD50(XYZ: Vector, out?: Vector): Vector;
    /**
     * Converts a color from XYZ with D50 whitepoint to XYZ with D65 whitepoint.
     * @param XYZ - The input color in XYZ with D50 whitepoint.
     * @param [out = vec3()] - The output color in XYZ with D65 whitepoint.
     * @returns The converted color in XYZ with D65 whitepoint.
     */
    function XYZD50ToD65(XYZ: Vector, out?: Vector): Vector;
    /**
     * XYZ color space with D65 whitepoint, aliased as <code>"xyz"</code>.
     */
    const XYZ: ColorSpace;
    /**
     * XYZ color space with D50 whitepoint, aliased as <code>"xyz-d50"</code>.
     */
    const XYZD50: ColorSpace;
    /**
     * Returns a list of color spaces.
     * @returns An array of color space objects.
     */
    function listColorSpaces(): ColorSpace[];
    /**
     * Returns a list of color gamuts.
     * @returns An array of color gamut objects.
     */
    function listColorGamuts(): ColorGamut[];
    /**
     * Clamps a value between a minimum and maximum value.
     * @param value - The value to clamp.
     * @param min - The minimum value.
     * @param max - The maximum value.
     * @returns The clamped value.
     */
    function clamp(value: number, min: number, max: number): number;
    /**
     * Linearly interpolates between two values.
     * @param min - The start value.
     * @param max - The end value.
     * @param t - The interpolation factor between 0 and 1.
     * @returns The interpolated value.
     */
    function lerp(min: number, max: number, t: number): number;
    /**
     * Converts degrees to radians.
     * @param n - The angle in degrees.
     * @returns The angle in radians.
     */
    function degToRad(n: number): number;
    /**
     * Converts radians to degrees.
     * @param n - The angle in radians.
     * @returns The angle in degrees.
     */
    function radToDeg(n: number): number;
    /**
     * Constrains an angle to the range [0, 360).
     * @param angle - The angle in degrees.
     * @returns The constrained angle.
     */
    function constrainAngle(angle: number): number;
    /**
     * Converts a hex color string to an RGB array.
     * @param str - The hex color string.
     * @param [out = vec3()] - The output array.
     * @returns The RGB array.
     */
    function hexToRGB(str: string, out?: Vector): Vector;
    /**
     * Converts an RGB array to a hex color string.
     * @param rgb - The RGB array.
     * @returns The hex color string.
     */
    function RGBToHex(rgb: Vector): string;
    /**
     * @param rgb - The RGB array.
     * @returns The hex color string.
     */
    function RGBtoHex(rgb: Vector): string;
    /**
     * Checks if an RGB color is within the gamut.
     * @param lrgb - The linear RGB array.
     * @param [ep = 0] - The epsilon value for comparison.
     * @returns True if the color is within the gamut, false otherwise.
     */
    function isRGBInGamut(lrgb: Vector, ep?: number): boolean;
    /**
     * Clamps an RGB array to the range [0, 1].
     * @param rgb - The RGB array.
     * @param [out = vec3()] - The output array.
     * @returns The clamped RGB array.
     */
    function clampedRGB(rgb: Vector, out?: Vector): Vector;
    /**
     * Converts xyY color space to XYZ color space.
     * @param arg - The xyY array.
     * @param [out = vec3()] - The output array.
     * @returns The XYZ array.
     */
    function xyY_to_XYZ(arg: Vector, out?: Vector): Vector;
    /**
     * Converts XYZ color space to xyY color space.
     * @param arg - The XYZ array.
     * @param [out = vec3()] - The output array.
     * @returns The xyY array.
     */
    function XYZ_to_xyY(arg: Vector, out?: Vector): Vector;
    /**
     * Converts a float value to a byte value.
     * @param n - The float value.
     * @returns The byte value.
     */
    function floatToByte(n: number): number;
    /**
     * Creates a new vec3 array.
     * @returns The vec3 array.
     */
    function vec3(): Vector;
    /**
     * Calculates the delta angle between two angles.
     * @param a0 - The first angle in degrees.
     * @param a1 - The second angle in degrees.
     * @returns The delta angle in degrees.
     */
    function deltaAngle(a0: number, a1: number): number;
    /**
     * Linearly interpolates between two angles.
     * @param a0 - The start angle in degrees.
     * @param a1 - The end angle in degrees.
     * @param t - The interpolation factor between 0 and 1.
     * @returns The interpolated angle in degrees.
     */
    function lerpAngle(a0: number, a1: number, t: number): number;
}

