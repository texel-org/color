# -*- coding: utf-8 -*-

"""
Copyright (c) 2021 Björn Ottosson

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

**Overview**

This script is pulled from Coloraide, and modified slightly by @mattdesl for JS output.
  https://github.com/facelessuser/coloraide

The gamut approximation code was originally developed by Björn Ottosson.

Original file is located at
    https://colab.research.google.com/drive/1JdXHhEyjjEE--19ZPH1bZV_LiGQBndzs

This notebook was used to compute coefficients for the compute_max_saturation function in this blog post:
  http://bottosson.github.io/posts/gamutclipping/

The code is available for reference, since it could be useful to derive coefficients for other color spaces. It was
written quickly to derive the values and both structure and documentation is poor.
"""

# Commented out `IPython` magic to ensure Python compatibility.
import numpy as np
import scipy.optimize
import matplotlib.pyplot as plt
import sys
import os
import json
from coloraide import algebra as alg
sys.path.insert(0, os.getcwd())

# Use higher precision Oklab conversion matrix along with LMS matrix with our exact white point
from tools.calc_oklab_matrices import xyzt_white_d65, xyzt_white_d50, xyzt_get_matrix, SRGBL_TO_LMS, LMS_TO_SRGBL, LMS3_TO_OKLAB, OKLAB_TO_LMS3, LMS_TO_XYZD50, XYZD50_TO_LMS # noqa: E402

PRINT_DIAGS = False

# Recalculated for consistent reference white
# see https://github.com/w3c/csswg-drafts/issues/6642#issuecomment-943521484
XYZ_TO_LMS = [
	[ 0.8190224379967030, 0.3619062600528904, -0.1288737815209879 ],
	[ 0.0329836539323885, 0.9292868615863434,  0.0361446663506424 ],
	[ 0.0481771893596242, 0.2642395317527308,  0.6335478284694309 ],
]
# inverse of XYZtoLMS_M
LMS_TO_XYZ = [
	[  1.2268798758459243, -0.5578149944602171,  0.2813910456659647 ],
	[ -0.0405757452148008,  1.1122868032803170, -0.0717110580655164 ],
	[ -0.0763729366746601, -0.4214933324022432,  1.5869240198367816 ],
]
LMS3_TO_OKLAB = [
	[ 0.2104542683093140,  0.7936177747023054, -0.0040720430116193 ],
	[ 1.9779985324311684, -2.4285922420485799,  0.4505937096174110 ],
	[ 0.0259040424655478,  0.7827717124575296, -0.8086757549230774 ],
]
# LMStoIab_M inverted
OKLAB_TO_LMS3 = [
	[ 1.0000000000000000,  0.3963377773761749,  0.2158037573099136 ],
	[ 1.0000000000000000, -0.1055613458156586, -0.0638541728258133 ],
	[ 1.0000000000000000, -0.0894841775298119, -1.2914855480194092 ],
]


def print_matrix (a, b, arr):
  data = json.dumps(arr.tolist(), indent=2, separators=(',', ': '))
  suffix = '_M'
  print(f'export const {a}_to_{b}{suffix} = {data};\n')

def print_rational (a, b, rstr):
  suffix = '_M'
  print(f'export const {a}_to_{b}{suffix} = {rstr};\n')


def print_json (label, data):
  str = json.dumps(data, indent=2, separators=(',', ': '))
  print(f'export const {label} = {str};\n')

def do_calc(GAMUT = 'srgb'):
  global SRGBL_TO_LMS, LMS_TO_SRGBL, LMS3_TO_OKLAB, OKLAB_TO_LMS3, XYZD50_TO_LMS, LMS_TO_XYZD50, XYZD50_TO_LMS
  np.set_printoptions(precision=8)

  var_name = 'linear_sRGB'
  if GAMUT == 'display-p3':
    var_name = 'linear_DisplayP3'
  elif GAMUT == 'rec2020':
    var_name = 'linear_Rec2020'
  elif GAMUT == 'a98-rgb':
    var_name = 'linear_A98RGB'
  elif GAMUT == 'prophoto-rgb':
    var_name = 'linear_ProPhotoRGB'

  white = xyzt_white_d50 if GAMUT == 'prophoto-rgb' else xyzt_white_d65
  whitepoint = 'D50' if GAMUT == 'prophoto-rgb' else 'D65'
  RGBL_TO_XYZ, XYZ_TO_RGBL = xyzt_get_matrix(white, GAMUT)

  """
  https://github.com/w3c/csswg-drafts/pull/7320
  https://drafts.csswg.org/css-color-4/#color-conversion-code
  """
  RGBL_TO_XYZ_RATIONAL = ""
  XYZ_TO_RGBL_RATIONAL = ""
  
  if GAMUT == 'srgb':
    RGBL_TO_XYZ_RATIONAL = """[
  [ 506752 / 1228815,  87881 / 245763,   12673 /   70218 ],
  [  87098 /  409605, 175762 / 245763,   12673 /  175545 ],
  [   7918 /  409605,  87881 / 737289, 1001167 / 1053270 ],
]"""
    XYZ_TO_RGBL_RATIONAL = """[
  [   12831 /   3959,    -329 /    214, -1974 /   3959 ],
  [ -851781 / 878810, 1648619 / 878810, 36519 / 878810 ],
  [     705 /  12673,   -2585 /  12673,   705 /    667 ],
]"""
  elif GAMUT == 'rec2020':
    RGBL_TO_XYZ_RATIONAL = """[
  [ 63426534 / 99577255,  20160776 / 139408157,  47086771 / 278816314 ],
  [ 26158966 / 99577255, 472592308 / 697040785,   8267143 / 139408157 ],
  [        0 /        1,  19567812 / 697040785, 295819943 / 278816314 ],
]"""
    XYZ_TO_RGBL_RATIONAL = """[
  [  30757411 / 17917100, -6372589 / 17917100, -4539589 / 17917100 ],
  [ -19765991 / 29648200, 47925759 / 29648200,   467509 / 29648200 ],
  [    792561 / 44930125, -1921689 / 44930125, 42328811 / 44930125 ],
]"""
  elif GAMUT == 'a98-rgb':
    # convert an array of linear-light a98-rgb values to CIE XYZ
    # http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
    # has greater numerical precision than section 4.3.5.3 of
    # https://www.adobe.com/digitalimag/pdfs/AdobeRGB1998.pdf
    # but the values below were calculated from first principles
    # from the chromaticity coordinates of R G B W
    RGBL_TO_XYZ_RATIONAL = """[
  [ 573536 /  994567,  263643 / 1420810,  187206 /  994567 ],
  [ 591459 / 1989134, 6239551 / 9945670,  374412 / 4972835 ],
  [  53769 / 1989134,  351524 / 4972835, 4929758 / 4972835 ],
]"""
    XYZ_TO_RGBL_RATIONAL = """[
  [ 1829569 /  896150, -506331 /  896150, -308931 /  896150 ],
  [ -851781 /  878810, 1648619 /  878810,   36519 /  878810 ],
  [   16779 / 1248040, -147721 / 1248040, 1266979 / 1248040 ],
]"""
  elif GAMUT == 'display-p3':
    # TODO: Evaluate whether this is really superior to what coloraide suggests
    # Right now it is needed to ensure accuracy with Colorjs.io
    # However, it is not clear how they have computed the results
    RGBL_TO_XYZ_RATIONAL = """[
  [ 608311 / 1250200, 189793 / 714400,  198249 / 1000160 ],
  [  35783 /  156275, 247089 / 357200,  198249 / 2500400 ],
  [      0 /       1,  32229 / 714400, 5220557 / 5000800 ],
]"""
    XYZ_TO_RGBL_RATIONAL = """[
  [ 446124 / 178915, -333277 / 357830, -72051 / 178915 ],
  [ -14852 /  17905,   63121 /  35810,    423 /  17905 ],
  [  11844 / 330415,  -50337 / 660830, 316169 / 330415 ],
]"""
  elif GAMUT == 'prophoto-rgb':
    #  override from https://github.com/w3c/csswg-drafts/issues/7675
    # rational form exceeds JavaScript precision:
    # https://github.com/w3c/csswg-drafts/pull/7320
    RGBL_TO_XYZ = [
      [ 0.79776664490064230,  0.13518129740053308,  0.03134773412839220 ],
      [ 0.28807482881940130,  0.71183523424187300,  0.00008993693872564 ],
      [ 0.00000000000000000,  0.00000000000000000,  0.82510460251046020 ]
    ]
    XYZ_TO_RGBL = [
      [  1.34578688164715830, -0.25557208737979464, -0.05110186497554526 ],
      [ -0.54463070512490190,  1.50824774284514680,  0.02052744743642139 ],
      [  0.00000000000000000,  0.00000000000000000,  1.21196754563894520 ]
    ]

  if len(XYZ_TO_RGBL_RATIONAL) > 0:
    XYZ_TO_RGBL = eval(XYZ_TO_RGBL_RATIONAL)
  if len(RGBL_TO_XYZ_RATIONAL) > 0:
    RGBL_TO_XYZ = eval(RGBL_TO_XYZ_RATIONAL)
    
  # Calculate the gamut <-> LMS matrices to adjust the working gamut
  if GAMUT == 'srgb':
      RGBL_TO_LMS = SRGBL_TO_LMS
      LMS_TO_RGBL = LMS_TO_SRGBL
  elif GAMUT == 'prophoto-rgb':
      # Note: this is not currently used in the final results as ProPhoto gamut is not yet supported
      RGBL_TO_LMS = alg.matmul(XYZD50_TO_LMS, RGBL_TO_XYZ)
      LMS_TO_RGBL = alg.inv(RGBL_TO_LMS)
  else:
      RGBL_TO_LMS = alg.matmul(XYZ_TO_LMS, RGBL_TO_XYZ)
      LMS_TO_RGBL = alg.inv(RGBL_TO_LMS)

  def printarray (label, arr):
    print(label, '[ ' + ', '.join([str(n) for n in arr]) + ' ]')

  # print('RGBL_TO_LMS',RGBL_TO_LMS)
  # print('LMS_TO_RGBL', LMS_TO_RGBL)

  RGBL_TO_LMS = np.asfarray(RGBL_TO_LMS)
  LMS_TO_RGBL = np.asfarray(LMS_TO_RGBL)
  LMS3_TO_OKLAB = np.asfarray(LMS3_TO_OKLAB)
  OKLAB_TO_LMS3 = np.asfarray(OKLAB_TO_LMS3)

  def linear_srgb_to_oklab(c):
      l = RGBL_TO_LMS[0][0] * c[0, ...] + RGBL_TO_LMS[0][1] * c[1, ...] + RGBL_TO_LMS[0][2] * c[2, ...]
      m = RGBL_TO_LMS[1][0] * c[0, ...] + RGBL_TO_LMS[1][1] * c[1, ...] + RGBL_TO_LMS[1][2] * c[2, ...]
      s = RGBL_TO_LMS[2][0] * c[0, ...] + RGBL_TO_LMS[2][1] * c[1, ...] + RGBL_TO_LMS[2][2] * c[2, ...]

      l_ = np.cbrt(l)
      m_ = np.cbrt(m)
      s_ = np.cbrt(s)

      return np.array([
          LMS3_TO_OKLAB[0][0] * l_ + LMS3_TO_OKLAB[0][1] * m_ + LMS3_TO_OKLAB[0][2] * s_,
          LMS3_TO_OKLAB[1][0] * l_ + LMS3_TO_OKLAB[1][1] * m_ + LMS3_TO_OKLAB[1][2] * s_,
          LMS3_TO_OKLAB[2][0] * l_ + LMS3_TO_OKLAB[2][1] * m_ + LMS3_TO_OKLAB[2][2] * s_,
      ])

  # define functions for R, G and B as functions of S, h (with L = 1 and S = C/L)

  def to_lms(S, h):
    a = S * np.cos(h)
    b = S * np.sin(h)

    l_ = OKLAB_TO_LMS3[0][0] + OKLAB_TO_LMS3[0][1] * a + OKLAB_TO_LMS3[0][2] * b
    m_ = OKLAB_TO_LMS3[1][0] + OKLAB_TO_LMS3[1][1] * a + OKLAB_TO_LMS3[1][2] * b
    s_ = OKLAB_TO_LMS3[2][0] + OKLAB_TO_LMS3[2][1] * a + OKLAB_TO_LMS3[2][2] * b

    l = l_ * l_ * l_
    m = m_ * m_ * m_
    s = s_ * s_ * s_

    return (l, m, s)

  def to_lms_dS(S, h):
    a = S * np.cos(h)
    b = S * np.sin(h)

    l_ = OKLAB_TO_LMS3[0][0] + OKLAB_TO_LMS3[0][1] * a + OKLAB_TO_LMS3[0][2] * b
    m_ = OKLAB_TO_LMS3[1][0] + OKLAB_TO_LMS3[1][1] * a + OKLAB_TO_LMS3[1][2] * b
    s_ = OKLAB_TO_LMS3[2][0] + OKLAB_TO_LMS3[2][1] * a + OKLAB_TO_LMS3[2][2] * b

    l = (LMS3_TO_OKLAB[0][1] * np.cos(h) + LMS3_TO_OKLAB[0][1] * np.sin(h)) * 3 * l_* l_
    m = (LMS3_TO_OKLAB[1][1] * np.cos(h) + LMS3_TO_OKLAB[1][1] * np.sin(h)) * 3 * m_* m_
    s = (LMS3_TO_OKLAB[2][1] * np.cos(h) + LMS3_TO_OKLAB[2][1] * np.sin(h)) * 3 * s_* s_

    return (l, m, s)

  def to_lms_dS2(S, h):
    a = S * np.cos(h)
    b = S * np.sin(h)

    l_ = OKLAB_TO_LMS3[0][0] + OKLAB_TO_LMS3[0][1] * a + OKLAB_TO_LMS3[0][2] * b
    m_ = OKLAB_TO_LMS3[1][0] + OKLAB_TO_LMS3[1][1] * a + OKLAB_TO_LMS3[1][2] * b
    s_ = OKLAB_TO_LMS3[2][0] + OKLAB_TO_LMS3[2][1] * a + OKLAB_TO_LMS3[2][2] * b

    l = (LMS3_TO_OKLAB[0][1] * np.cos(h) + LMS3_TO_OKLAB[0][2] * np.sin(h)) ** 2 * 6 * l_
    m = (LMS3_TO_OKLAB[1][1] * np.cos(h) + LMS3_TO_OKLAB[0][2] * np.sin(h)) ** 2 * 6 * m_
    s = (LMS3_TO_OKLAB[2][1] * np.cos(h) + LMS3_TO_OKLAB[0][2] * np.sin(h)) ** 2 * 6 * s_

    return (l, m, s)


  def to_R(S, h):
    (l, m, s) = to_lms(S, h)
    return LMS_TO_RGBL[0][0] * l + LMS_TO_RGBL[0][1] * m + LMS_TO_RGBL[0][2] * s

  def to_R_dS(S, h):
    (l, m, s) = to_lms_dS(S, h)
    return LMS_TO_RGBL[0][0] * l + LMS_TO_RGBL[0][1] * m + LMS_TO_RGBL[0][2] * s

  def to_R_dS2(S, h):
    (l, m, s) = to_lms_dS2(S, h)
    return LMS_TO_RGBL[0][0] * l + LMS_TO_RGBL[0][1] * m + LMS_TO_RGBL[0][2] * s

  def to_G(S, h):
    (l, m, s) = to_lms(S, h)
    return LMS_TO_RGBL[1][0] * l + LMS_TO_RGBL[1][1] * m + LMS_TO_RGBL[1][2] * s

  def to_G_dS(S, h):
    (l, m, s) = to_lms_dS(S, h)
    return LMS_TO_RGBL[1][0] * l + LMS_TO_RGBL[1][1] * m + LMS_TO_RGBL[1][2] * s

  def to_G_dS2(S, h):
    (l, m, s) = to_lms_dS2(S, h)
    return LMS_TO_RGBL[1][0] * l + LMS_TO_RGBL[1][1] * m + LMS_TO_RGBL[1][2] * s

  def to_B(S, h):
    (l, m, s) = to_lms(S, h)
    return LMS_TO_RGBL[2][0] * l + LMS_TO_RGBL[2][1] * m + LMS_TO_RGBL[2][2] * s

  def to_B_dS(S, h):
    (l, m, s) = to_lms_dS(S, h)
    return LMS_TO_RGBL[2][0] * l + LMS_TO_RGBL[2][1] * m + LMS_TO_RGBL[2][2] * s

  def to_B_dS2(S, h):
    (l, m, s) = to_lms_dS2(S, h)
    return LMS_TO_RGBL[2][0] * l + LMS_TO_RGBL[2][1] * m + LMS_TO_RGBL[2][2] * s

  if GAMUT != 'prophoto-rgb':
    hs, Ss = np.meshgrid(np.linspace(-np.pi, np.pi, 720), np.linspace(0, 1, 200))

    Rs = to_R(Ss, hs)
    Gs = to_G(Ss, hs)
    Bs = to_B(Ss, hs)

    gamut = np.minimum(Rs, np.minimum(Gs, Bs))

    r_lab = linear_srgb_to_oklab(np.array([1, 0, 0]))
    g_lab = linear_srgb_to_oklab(np.array([0, 1, 0]))
    b_lab = linear_srgb_to_oklab(np.array([0, 0, 1]))

    r_h = np.arctan2(r_lab[2], r_lab[1])
    g_h = np.arctan2(g_lab[2], g_lab[1])
    b_h = np.arctan2(b_lab[2], b_lab[1])

    r_dir = 0.5 * np.array([np.cos(b_h) + np.cos(g_h), np.sin(b_h) + np.sin(g_h)])
    g_dir = 0.5 * np.array([np.cos(b_h) + np.cos(r_h), np.sin(b_h) + np.sin(r_h)])
    b_dir = 0.5 * np.array([np.cos(r_h) + np.cos(g_h), np.sin(r_h) + np.sin(g_h)])

    r_dir /= r_dir[0]** 2 + r_dir[1]** 2
    g_dir /= g_dir[0]** 2 + g_dir[1]** 2
    b_dir /= b_dir[0]** 2 + b_dir[1]** 2

    # These are coefficients to quickly test which component goes below zero first.
    # Used like this in compute_max_saturation:
    # if (-1.88170328f * a - 0.80936493f * b > 1) // Red component goes below zero first

    r_hs, r_Ss = np.meshgrid(np.linspace(g_h, 2 * np.pi + b_h, 200), np.linspace(0, 1, 200))

    r_Rs = to_R(r_Ss, r_hs)

    g_hs, g_Ss = np.meshgrid(np.linspace(b_h, r_h, 200), np.linspace(0, 1, 200))

    g_Gs = to_G(g_Ss, g_hs)

    b_hs, b_Ss = np.meshgrid(np.linspace(r_h, g_h, 200), np.linspace(0, 1, 200))

    b_Bs = to_B(b_Ss, b_hs)

    # These are numerical fits to the edge of the chroma
    # The resulting coefficient, x_R, x_G and x_B are used in compute_max_saturation, as values for k0
    its = 1

    resolution = 100000

    h = np.linspace(g_h, 2 * np.pi + b_h, resolution)
    a = np.cos(h)
    b = np.sin(h)

    def e_R(x):
      S = x[0] + x[1] * a + x[2] * b + x[3] * a ** 2 + x[4] * a * b
      S = np.maximum(0, S)

      # optimize for solution that is easiest to solve with one step Haley's method
      f = to_R(S, h)
      f1 = to_R_dS(S, h)
      f2 = to_R_dS2(S, h)
      S_1 = S - f * f1 / (f1 ** 2 - f * f2 / 2)

      f_ = to_R(S_1, h)
      return np.average(f_ ** 10) # + f_[0] ** 2 + f_[-1] ** 2

    x_R = scipy.optimize.minimize(e_R, np.array([1.19086277, 1.76576728, 0.59662641, 0.75515197, 0.56771245])).x

    # printarray('R COEFF', x_R)

    S_R = x_R[0] + x_R[1] * a + x_R[2] * b + x_R[3] * a ** 2 + x_R[4] * a * b

    S_R1 = S_R
    for i in range(0, its):
      f = to_R(S_R1, h)
      f1 = to_R_dS(S_R1, h)
      f2 = to_R_dS2(S_R1, h)
      S_R1 = S_R1 - f * f1 / (f1 ** 2 - f * f2 / (2))

      plt.plot(S_R1, 'r')

    #####

    h = np.linspace(b_h, r_h, resolution)
    a = np.cos(h)
    b = np.sin(h)

    def e_G(x):
      S = x[0] + x[1] * a + x[2] * b + x[3] * a ** 2 + x[4] * a * b
      S = np.maximum(0, S)

      # optimize for solution that is easiest to solve with one step Haley's method
      f = to_G(S, h)
      f1 = to_G_dS(S, h)
      f2 = to_G_dS2(S, h)
      S_1 = S - f * f1 / (f1 ** 2 - f * f2 / 2)

      f_ = to_G(S_1, h)
      return np.average(f_ ** 10) # + f_[0] ** 2 + f_[-1] ** 2

    x_G = scipy.optimize.minimize(e_G, np.array([0.73956515, -0.45954404,  0.08285427,  0.12541073, -0.14503204])).x

    # printarray('G COEFF', x_G)

    S_G = x_G[0] + x_G[1] * a + x_G[2] * b + x_G[3] * a ** 2 + x_G[4] * a * b

    S_G1 = S_G
    for i in range(0, its):
      f = to_G(S_G1, h)
      f1 = to_G_dS(S_G1, h)
      f2 = to_G_dS2(S_G1, h)
      S_G1 = S_G1 - f * f1 / (f1 ** 2 - f * f2 / (2))
      

    #####

    h = np.linspace(r_h, g_h, resolution)
    a = np.cos(h)
    b = np.sin(h)

    def e_B(x):
      S = x[0] + x[1] * a + x[2] * b + x[3] * a ** 2 + x[4] * a * b
      S = np.maximum(0, S)

      # optimize for solution that is easiest to solve with one step Haley's method
      f = to_B(S, h)
      f1 = to_B_dS(S, h)
      f2 = to_B_dS2(S, h)
      S_1 = S - f * f1 / (f1 ** 2 - f * f2 / 2)

      f_ = to_B(S_1, h)
      return np.average(f_ ** 10) # + f_[0] ** 2 + f_[-1] ** 2

    x_B = scipy.optimize.minimize(e_B, np.array([1.35733652, -0.00915799, -1.1513021,  -0.50559606,  0.00692167])).x

    # printarray('B COEFF', x_B)

    S_B = x_B[0] + x_B[1] * a + x_B[2] * b + x_B[3] * a ** 2 + x_B[4] * a * b

    S_B1 = S_B
    for i in range(0, its):
      f = to_B(S_B1, h)
      f1 = to_B_dS(S_B1, h)
      f2 = to_B_dS2(S_B1, h)
      S_B1 = S_B1 - f * f1 / (f1 ** 2 - f * f2 / (2))

  print(f'// {var_name} space\n')
    
  print(f'// {var_name} to XYZ ({whitepoint}) matrices\n')
  if len(RGBL_TO_XYZ_RATIONAL) > 0:
    print_rational(var_name, 'XYZ', RGBL_TO_XYZ_RATIONAL)
  else:
    print_matrix(var_name, 'XYZ', np.asfarray(RGBL_TO_XYZ))

  if len(XYZ_TO_RGBL_RATIONAL) > 0:
    print_rational('XYZ', var_name, XYZ_TO_RGBL_RATIONAL)
  else:
    print_matrix('XYZ', var_name, np.asfarray(XYZ_TO_RGBL))
  
  print(f'// {var_name} to LMS matrices\n')
  print_matrix(var_name, 'LMS', RGBL_TO_LMS)
  print_matrix('LMS', var_name, LMS_TO_RGBL)
  
  if GAMUT != 'prophoto-rgb':
    coeff = [
      [
        r_dir.tolist(),
        x_R.tolist(),
      ],
      [
        g_dir.tolist(),
        x_G.tolist()
      ],
      [
        b_dir.tolist(),
        x_B.tolist()
      ]
    ]
    print(f'// {var_name} coefficients for OKLab gamut approximation\n')
    print_json(f'OKLab_to_{var_name}_coefficients', coeff)
  else:
    print(f'// {var_name} does not yet support OKLab gamut approximation\n')

# print things...

print(f'/** This file is auto-generated by tools/print_matrices.py */\n')
print(f'// OKLab to LMS matrices\n')
print_matrix('OKLab', 'LMS', np.asfarray(OKLAB_TO_LMS3))
print_matrix('LMS', 'OKLab', np.asfarray(LMS3_TO_OKLAB))
print_matrix('XYZ', 'LMS', np.asfarray(XYZ_TO_LMS))
print_matrix('LMS', 'XYZ', np.asfarray(LMS_TO_XYZ))

# don't need these...
# print_matrix('XYZD50', 'LMS', np.asfarray(XYZD50_TO_LMS))
# print_matrix('LMS', 'XYZD50', np.asfarray(LMS_TO_XYZD50))

for gamut in ['srgb', 'display-p3', 'rec2020', 'a98-rgb', 'prophoto-rgb']:
  d = do_calc(gamut)
