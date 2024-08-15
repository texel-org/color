import {
  convert,
  XYZD50,
  sRGB,
  XYZ,
  ProPhotoRGB,
  OKLCH,
  sRGBLinear,
} from "../src/index.js";
import { Lab } from "./spaces/lab.js";
import { HSL } from "./spaces/hsl.js";
import test from "tape";
import Color from "colorjs.io";
import arrayAlmostEqual from "./almost-equal.js";

test("should approximately match colorjs.io CIELAB", async (t) => {
  let input = [0.5, 0.1243, -0.123];
  let inputSpace = OKLCH;
  let outputSpace = Lab;
  let expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  let result = convert(input, inputSpace, outputSpace);
  t.deepEqual(expected, result);

  inputSpace = XYZD50;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  inputSpace = XYZ;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  inputSpace = sRGB;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  inputSpace = ProPhotoRGB;
  expected = new Color("prophoto", input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  inputSpace = Lab;
  outputSpace = XYZ;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  outputSpace = XYZD50;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  outputSpace = Lab;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  outputSpace = sRGBLinear;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  outputSpace = sRGB;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);
});

test("should approximately match colorjs.io HSL", async (t) => {
  let input = [30, 50, 50];
  let inputSpace = HSL;
  let outputSpace = OKLCH;
  let expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  let result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  outputSpace = XYZD50;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  outputSpace = sRGB;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  outputSpace = sRGBLinear;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  input = [0.5, 0.2, 30];
  inputSpace = OKLCH;
  outputSpace = HSL;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  inputSpace = XYZ;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  inputSpace = sRGB;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);

  inputSpace = sRGBLinear;
  expected = new Color(inputSpace.id, input).to(outputSpace.id).coords;
  result = convert(input, inputSpace, outputSpace);
  t.deepEqual(arrayAlmostEqual(expected, result), true);
});
